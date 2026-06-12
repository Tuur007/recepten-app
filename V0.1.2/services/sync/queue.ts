import { type SQLiteDatabase } from 'expo-sqlite';
import { error as logError } from '../../utils/logger';
import { toast } from '../../utils/feedback';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../supabase';
import { useAuthStore } from '../../store/authStore';
import { generateId } from '../../utils/id';
import type { Recipe } from '../../types/recipe';
import type { GroceryItem } from '../../types/grocery';
import type { MealPlan } from '../../store/weekPlannerStore';

export type QueueOp = 'upsert' | 'delete';
export type QueueEntity = 'recipe' | 'grocery' | 'weekplan';

export interface QueueRow {
  id: string;
  op: QueueOp;
  entity: QueueEntity;
  entity_id: string;
  payload: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
  dead: number;
  next_retry_at: string | null;
  // Gezin waarvoor deze rij bedoeld is. NULL = geschreven zonder login; zo'n
  // rij hoort bij de user die zich daarna op dit toestel aanmeldt.
  family_id: string | null;
}

// Na zoveel mislukte pogingen markeren we een rij als dead-letter zodat één
// corrupte payload de queue niet eeuwig blokkeert.
const MAX_ATTEMPTS = 5;

export interface WeekPlanPayload {
  weekKey: string;
  plan: MealPlan;
}

// Re-entrancy guard: een tweede flushQueue() terwijl er nog één loopt is
// dubbel werk en kan rij-orde verstoren. Wordt er tijdens een flush opnieuw
// geflusht (nieuwe write), dan draaien we na de drain nog één ronde — anders
// blijft die write hangen tot het volgende NetInfo-event.
let flushing = false;
let reflushRequested = false;

export async function enqueue(
  db: SQLiteDatabase,
  op: QueueOp,
  entity: QueueEntity,
  entityId: string,
  payload: unknown | null,
): Promise<void> {
  // Zonder cloud-config kan deze rij nooit flushen — niet queuen voorkomt dat
  // de outbox onbeperkt groeit bij users die puur lokaal draaien. Zonder
  // familyId queuen we WEL (family_id = NULL): die writes horen bij de user
  // die zich daarna aanmeldt en flushen dan alsnog.
  if (!defaultSupabase) return;

  await db.runAsync(
    `INSERT INTO sync_queue (id, op, entity, entity_id, payload, created_at, attempts, family_id)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      generateId(),
      op,
      entity,
      entityId,
      payload == null ? null : JSON.stringify(payload),
      new Date().toISOString(),
      useAuthStore.getState().familyId,
    ],
  );
}

export async function getQueueDepth(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue',
  );
  return row?.count ?? 0;
}

/**
 * Geeft de dead-letter rijen terug (attempts >= MAX_ATTEMPTS). Bedoeld voor de
 * dev-overlay zodat een ontwikkelaar kan zien wat er vastloopt.
 */
export async function getDeadRows(db: SQLiteDatabase): Promise<QueueRow[]> {
  return db.getAllAsync<QueueRow>(
    'SELECT * FROM sync_queue WHERE dead = 1 ORDER BY created_at ASC',
  );
}

/**
 * Reset alle dead-letter rijen zodat ze bij de volgende flush opnieuw
 * geprobeerd worden. Bedoeld voor de dead-letter recovery in Settings.
 */
export async function retryDeadRows(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    'UPDATE sync_queue SET dead = 0, attempts = 0, next_retry_at = NULL WHERE dead = 1',
  );
}

/** Verwijdert één rij uit de outbox (dead-letter recovery in Settings). */
export async function deleteQueueRow(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

function recipeToRow(recipe: Recipe, familyId: string) {
  return {
    id: recipe.id,
    family_id: familyId,
    title: recipe.title,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    source_url: recipe.sourceUrl ?? null,
    duration: recipe.duration ?? null,
    category: recipe.category,
    is_favorite: recipe.isFavorite,
    // Nooit een lokaal file:// pad naar de cloud pushen — andere toestellen
    // kunnen dat niet openen. Lukte de upload nog niet, dan sturen we null en
    // probeert een volgende edit/backfill opnieuw te uploaden.
    image_uri:
      recipe.imageUri && !recipe.imageUri.startsWith('file://') ? recipe.imageUri : null,
    allergens: recipe.allergens,
    difficulty: recipe.difficulty ?? null,
    preparation_time: recipe.preparationTime ?? null,
    cooking_time: recipe.cookingTime ?? null,
    servings: recipe.servings ?? null,
    rating: recipe.rating ?? null,
    times_cooked: recipe.timesCooked ?? 0,
    last_cooked: recipe.lastCooked ?? null,
    notes: recipe.notes ?? null,
    equipment: recipe.equipment ?? null,
    nutrition: recipe.nutrition ?? null,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
  };
}

function groceryToRow(item: GroceryItem, familyId: string) {
  return {
    id: item.id,
    family_id: familyId,
    name: item.name,
    unit: item.unit,
    sources: item.sources,
    total_quantity: item.totalQuantity,
    checked: item.checked,
    category: item.category ?? '',
    aisle: item.aisle ?? null,
    price: item.price ?? null,
    store_id: item.storeId ?? null,
    created_at: item.createdAt,
  };
}

async function executeRow(
  row: QueueRow,
  client: SupabaseClient,
  familyId: string,
): Promise<void> {
  const payload = row.payload ? JSON.parse(row.payload) : null;

  if (row.entity === 'recipe') {
    if (row.op === 'upsert') {
      const { error } = await client
        .from('recipes')
        .upsert(recipeToRow(payload as Recipe, familyId));
      if (error) throw error;
    } else {
      // `.is('deleted_at', null)` maakt de delete idempotent: een rij die al
      // verwijderd is krijgt geen nieuwe timestamp en dus geen nieuw
      // realtime-event (anders pingpongen toestellen elkaars deletes rond).
      const { error } = await client
        .from('recipes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', row.entity_id)
        .is('deleted_at', null);
      if (error) throw error;
    }
    return;
  }

  if (row.entity === 'grocery') {
    if (row.op === 'upsert') {
      const { error } = await client
        .from('grocery_items')
        .upsert(groceryToRow(payload as GroceryItem, familyId));
      if (error) throw error;
    } else {
      const { error } = await client
        .from('grocery_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', row.entity_id)
        .is('deleted_at', null);
      if (error) throw error;
    }
    return;
  }

  if (row.entity === 'weekplan') {
    if (row.op !== 'upsert') return;
    const wp = payload as WeekPlanPayload;
    const { error } = await client
      .from('week_plans')
      .upsert(
        {
          family_id: familyId,
          week_key: wp.weekKey,
          plan_data: wp.plan,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'family_id,week_key' },
      );
    if (error) throw error;
  }
}

export interface FlushResult {
  processed: number;
  remaining: number;
  failedAt?: { id: string; error: string };
}

/**
 * Drain de queue van oud → nieuw. Een falende rij blokkeert de rest niet meer:
 * ze krijgt `attempts++`, een exponential-backoff `next_retry_at` en wordt voor
 * de rest van deze flush overgeslagen (de WHERE-filter sluit toekomstige
 * retries uit). Na MAX_ATTEMPTS gaat de rij naar de dead-letter (`dead = 1`)
 * zodat één corrupte payload de queue niet voor altijd vasthoudt.
 *
 * Reentrant-safe: een tweede call terwijl er nog één loopt no-ops.
 */
export async function flushQueue(
  db: SQLiteDatabase,
  client: SupabaseClient | null = defaultSupabase,
): Promise<FlushResult> {
  if (flushing) {
    reflushRequested = true;
    return { processed: 0, remaining: await getQueueDepth(db) };
  }
  if (!client) return { processed: 0, remaining: await getQueueDepth(db) };

  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return { processed: 0, remaining: await getQueueDepth(db) };

  flushing = true;
  let processed = 0;
  let failedAt: FlushResult['failedAt'] | undefined;

  try {
    do {
      reflushRequested = false;
      while (true) {
        // Alleen rijen van het actieve gezin (of pre-login rijen zonder
        // family_id) — rijen van een vorig gezin mogen NOOIT met het huidige
        // familyId gestempeld worden (cross-family leak).
        const row = await db.getFirstAsync<QueueRow>(
          `SELECT * FROM sync_queue
           WHERE dead = 0 AND (family_id IS NULL OR family_id = ?)
             AND (next_retry_at IS NULL OR next_retry_at < datetime('now'))
           ORDER BY created_at ASC LIMIT 1`,
          [familyId],
        );
        if (!row) break;

        try {
          await executeRow(row, client, familyId);
          await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [row.id]);
          processed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const attempts = row.attempts + 1;
          const dead = attempts >= MAX_ATTEMPTS ? 1 : 0;
          const backoffSeconds = Math.min(2 ** attempts, 300);
          await db.runAsync(
            `UPDATE sync_queue
             SET attempts = ?, last_error = ?, dead = ?, next_retry_at = datetime('now', ?)
             WHERE id = ?`,
            [attempts, msg, dead, `+${backoffSeconds} seconds`, row.id],
          );
          if (dead) {
            // `error` is ook in productie actief, dus Sentry ziet dit.
            logError('[sync] dead row', {
              id: row.id,
              entity: row.entity,
              op: row.op,
              entity_id: row.entity_id,
              attempts,
              last_error: msg,
            });
            // De gebruiker moet weten dat een wijziging niet synct — anders
            // is dit stille dataverlies richting de rest van het gezin.
            toast.error(
              'Synchronisatie vastgelopen',
              'Bekijk Instellingen → synchronisatie om opnieuw te proberen.',
            );
          }
          failedAt = { id: row.id, error: msg };
          // Niet breaken: de gefaalde rij is nu uitgesloten via next_retry_at,
          // de volgende eligible rij krijgt nog een kans in deze flush.
        }
      }
    } while (reflushRequested);
  } finally {
    flushing = false;
  }

  return {
    processed,
    remaining: await getQueueDepth(db),
    ...(failedAt ? { failedAt } : {}),
  };
}

export function __resetFlushingForTests(): void {
  flushing = false;
}
