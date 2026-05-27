import { type SQLiteDatabase } from 'expo-sqlite';
import { warn } from '../../utils/logger';
import { uploadRecipeImage } from '../imageUpload';
import { enqueue, flushQueue } from './queue';

const PREF_BACKFILL_DONE = 'image_backfill_v1_done';
const THROTTLE_MS = 2000;

interface BackfillRow {
  id: string;
  image_uri: string;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Eenmalige migratie van bestaande lokale file:// foto's naar Supabase Storage.
 * Voor elk recept met een file:// pad: upload, vervang het pad door de cloud-URL
 * en enqueue een upsert. Throttled op 1 per 2s om de free tier te ontzien.
 * Markeert zichzelf als gedaan in app_prefs zodat dit maar één keer draait.
 */
export async function runBackfill(db: SQLiteDatabase): Promise<void> {
  const done = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_prefs WHERE key = ?',
    [PREF_BACKFILL_DONE],
  );
  if (done?.value === '1') return;

  const rows = await db.getAllAsync<BackfillRow>(
    "SELECT id, image_uri FROM recipes WHERE image_uri LIKE 'file://%'",
  );

  for (const row of rows) {
    try {
      const cloudUrl = await uploadRecipeImage(row.image_uri, row.id);
      if (cloudUrl) {
        await db.runAsync('UPDATE recipes SET image_uri = ? WHERE id = ?', [cloudUrl, row.id]);
        const recipe = await db.getFirstAsync<Record<string, unknown>>(
          'SELECT * FROM recipes WHERE id = ?',
          [row.id],
        );
        if (recipe) {
          await enqueue(db, 'upsert', 'recipe', row.id, rowToRecipePayload(recipe));
        }
      }
    } catch (err) {
      warn('[imageBackfill] row failed:', row.id, err);
    }
    await sleep(THROTTLE_MS);
  }

  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [PREF_BACKFILL_DONE, '1'],
  );
  void flushQueue(db);
}

// De queue verwacht een Recipe-achtige payload; map de DB-rij naar de velden
// die recipeToRow() in queue.ts gebruikt.
function rowToRecipePayload(row: Record<string, unknown>): Record<string, unknown> {
  const parse = (v: unknown, fallback: unknown) => {
    if (typeof v !== 'string') return fallback;
    try {
      return JSON.parse(v);
    } catch {
      return fallback;
    }
  };
  return {
    id: row.id,
    title: row.title,
    ingredients: parse(row.ingredients, []),
    steps: parse(row.steps, []),
    sourceUrl: row.source_url ?? undefined,
    duration: row.duration ?? undefined,
    category: row.category ?? '',
    isFavorite: row.is_favorite === 1,
    imageUri: row.image_uri ?? undefined,
    allergens: parse(row.allergens, []),
    difficulty: row.difficulty ?? undefined,
    preparationTime: row.preparation_time ?? undefined,
    cookingTime: row.cooking_time ?? undefined,
    servings: row.servings ?? undefined,
    rating: row.rating ?? undefined,
    timesCooked: row.times_cooked ?? 0,
    lastCooked: row.last_cooked ?? undefined,
    notes: row.notes ?? undefined,
    equipment: parse(row.equipment, undefined),
    nutrition: parse(row.nutrition, undefined),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
