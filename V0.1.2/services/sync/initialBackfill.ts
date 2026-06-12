import { type SQLiteDatabase } from 'expo-sqlite';
import { RecipeRepository } from '../../features/recipes/repository';
import { GroceryRepository } from '../../features/grocery/repository';
import { useAuthStore } from '../../store/authStore';
import type { MealPlan, WeeksMap } from '../../store/weekPlannerStore';
import { enqueue, flushQueue } from './queue';

// Per gezin (suffix): wie van gezin wisselt op hetzelfde toestel krijgt voor
// het nieuwe gezin opnieuw een one-shot backfill.
const PREF_INITIAL_BACKFILL = 'initial_backfill_done';
// Spiegelt PREF_KEY in store/weekPlannerStore.ts. We lezen rechtstreeks uit
// app_prefs zodat de backfill niet afhangt van store-hydratie-timing.
const PREF_WEEK_PLAN = 'week_plan_v2';

async function readWeeks(db: SQLiteDatabase): Promise<WeeksMap> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_prefs WHERE key = ?',
    [PREF_WEEK_PLAN],
  );
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as WeeksMap;
    }
  } catch {
    /* corrupte JSON — niets te backfillen */
  }
  return {};
}

/**
 * Eenmalige push van bestaande lokale data naar de cloud bij de eerste keer dat
 * dit toestel een gezin krijgt. Dekt users die maandenlang puur lokaal draaiden
 * voordat ze inlogden: zonder dit zou hun bestaande SQLite-inhoud nooit
 * ge-upsert worden (alleen nieuwe writes lopen via de outbox).
 *
 * Idempotent via de `initial_backfill_done` pref — draait exact één keer.
 */
export async function runInitialBackfill(db: SQLiteDatabase): Promise<void> {
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;

  const prefKey = `${PREF_INITIAL_BACKFILL}:${familyId}`;
  const done = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_prefs WHERE key IN (?, ?)',
    // Legacy: vóór de per-gezin sleutel was de pref globaal. Een toestel dat
    // toen al backfillde hoeft het voor datzelfde gezin niet opnieuw te doen.
    [prefKey, PREF_INITIAL_BACKFILL],
  );
  if (done?.value === '1') return;

  const recipes = await RecipeRepository.getAll(db);
  for (const recipe of recipes) {
    await enqueue(db, 'upsert', 'recipe', recipe.id, recipe);
  }

  const groceries = await GroceryRepository.getAll(db);
  for (const item of groceries) {
    await enqueue(db, 'upsert', 'grocery', item.id, item);
  }

  const weeks = await readWeeks(db);
  for (const [weekKey, plan] of Object.entries(weeks)) {
    await enqueue(db, 'upsert', 'weekplan', weekKey, { weekKey, plan: plan as MealPlan });
  }

  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [prefKey, '1'],
  );
  void flushQueue(db);
}
