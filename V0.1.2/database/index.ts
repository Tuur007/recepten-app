import { type SQLiteDatabase } from 'expo-sqlite';
import { log, warn } from '../utils/logger';
import {
  CREATE_GROCERY_ITEMS_TABLE,
  CREATE_RECIPES_TABLE,
  CREATE_RECIPES_TABLE_FULL,
  CREATE_CATEGORIES_TABLE,
  CREATE_COLLECTIONS_TABLE,
  CREATE_COLLECTION_RECIPES_TABLE,
  CREATE_PREFS_TABLE,
  CREATE_SYNC_QUEUE_TABLE,
  DEFAULT_RECIPE_CATEGORIES,
  DEFAULT_GROCERY_CATEGORIES,
  MIGRATIONS,
} from './schema';
import { initImageDirectory } from '../utils/imageStorage';
import { generateId } from '../utils/id';
import { RecipeRepository } from '../features/recipes/repository';
import { STARTER_RECIPES } from './seeds';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await initImageDirectory();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    ${CREATE_GROCERY_ITEMS_TABLE}
    ${CREATE_CATEGORIES_TABLE}
    ${CREATE_COLLECTIONS_TABLE}
    ${CREATE_COLLECTION_RECIPES_TABLE}
    ${CREATE_PREFS_TABLE}
    ${CREATE_SYNC_QUEUE_TABLE}
  `);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion > MIGRATIONS.length) {
    warn(
      `[DB] user_version=${currentVersion} is hoger dan het aantal migraties (${MIGRATIONS.length}). ` +
        'Mogelijk een downgrade — de app gebruikt een ouder schema dan de database.',
    );
  }

  if (currentVersion === 0) {
    // Verse installatie: gebruik het volledige schema direct, sla de losse
    // ALTER-migraties over zodat we niet 27 onnodige stappen doen op een lege db.
    await db.execAsync(CREATE_RECIPES_TABLE_FULL);
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
    log('[DB] Fresh install — applied CREATE_RECIPES_TABLE_FULL');
  } else {
    // Bestaande installatie: zorg eerst dat de basis-tabel bestaat, dan rollen
    // we door alle nog-niet-toegepaste migraties heen.
    await db.execAsync(CREATE_RECIPES_TABLE);
    await applyPendingMigrations(db, currentVersion);
  }

  // Seed default categories if table is empty
  const catCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if ((catCount?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    for (const name of DEFAULT_RECIPE_CATEGORIES) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, type, created_at) VALUES (?, ?, ?, ?)',
        [generateId(), name, 'recipe', now],
      );
    }
    for (const name of DEFAULT_GROCERY_CATEGORIES) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (id, name, type, created_at) VALUES (?, ?, ?, ?)',
        [generateId(), name, 'grocery', now],
      );
    }
  }
}

/**
 * Past elke nog-niet-toegepaste migratie atomair toe: per stap een eigen
 * transactie die zowel de SQL als de bijbehorende `user_version`-bump bevat.
 * Faalt een stap, dan rollt SQLite de transactie (inclusief de versie-bump)
 * terug en gooien we de error door — `user_version` blijft op de laatste
 * geslaagde migratie staan zodat een volgende run vanaf daar hervat.
 *
 * Bewust géén "duplicate column"-catch meer: die maskeerde echte fouten.
 */
export async function applyPendingMigrations(
  db: SQLiteDatabase,
  fromVersion: number,
  migrations: string[] = MIGRATIONS,
): Promise<void> {
  for (let i = fromVersion; i < migrations.length; i++) {
    try {
      await db.execAsync(
        `BEGIN; ${migrations[i]}; PRAGMA user_version = ${i + 1}; COMMIT;`,
      );
      log(`[DB] Migration v${i + 1} applied`);
    } catch (err) {
      await db.execAsync('ROLLBACK;').catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[DB] Migration v${i + 1} FAILED:`, msg);
      throw err;
    }
  }
}

/**
 * Voert de starter-recepten in bij een verse installatie. Idempotent: doet
 * niets als de recepten-tabel al rijen bevat, dus bestaande gebruikers zien
 * deze seeds nooit terug.
 */
export async function seedStarterRecipes(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM recipes',
  );
  if ((result?.count ?? 0) > 0) return;

  let inserted = 0;
  for (const recipe of STARTER_RECIPES) {
    try {
      await RecipeRepository.create(db, recipe);
      inserted++;
    } catch (err) {
      console.error(`[db] seed "${recipe.title}" failed:`, err);
    }
  }
  log(`[db] seeded ${inserted} starter recipes`);
}
