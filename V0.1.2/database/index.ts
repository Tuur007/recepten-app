import { type SQLiteDatabase } from 'expo-sqlite';
import {
  CREATE_GROCERY_ITEMS_TABLE,
  CREATE_RECIPES_TABLE,
  CREATE_RECIPES_TABLE_FULL,
  CREATE_CATEGORIES_TABLE,
  CREATE_PREFS_TABLE,
  DEFAULT_RECIPE_CATEGORIES,
  DEFAULT_GROCERY_CATEGORIES,
  MIGRATIONS,
} from './schema';
import { initImageDirectory } from '../utils/imageStorage';
import { generateId } from '../utils/id';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await initImageDirectory();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    ${CREATE_GROCERY_ITEMS_TABLE}
    ${CREATE_CATEGORIES_TABLE}
    ${CREATE_PREFS_TABLE}
  `);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion > MIGRATIONS.length) {
    console.warn(
      `[DB] user_version=${currentVersion} is hoger dan het aantal migraties (${MIGRATIONS.length}). ` +
        'Mogelijk een downgrade — de app gebruikt een ouder schema dan de database.',
    );
  }

  if (currentVersion === 0) {
    // Verse installatie: gebruik het volledige schema direct, sla de losse
    // ALTER-migraties over zodat we niet 22 onnodige stappen doen op een lege db.
    await db.execAsync(CREATE_RECIPES_TABLE_FULL);
    console.log('[DB] Fresh install — applied CREATE_RECIPES_TABLE_FULL');
  } else {
    // Bestaande installatie: zorg eerst dat de basis-tabel bestaat, dan rollen
    // we door alle migraties heen (idempotent dankzij IF NOT EXISTS + dup-skip).
    await db.execAsync(CREATE_RECIPES_TABLE);

    for (let i = currentVersion; i < MIGRATIONS.length; i++) {
      try {
        await db.execAsync(MIGRATIONS[i]);
        console.log(`[DB] Migration v${i + 1} applied`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // SQLite throws when a column/table already exists — safe to skip.
        if (msg.includes('duplicate column') || msg.includes('already exists')) {
          console.log(`[DB] Migration v${i + 1} already applied, skipping`);
        } else {
          console.error(`[DB] Migration v${i + 1} FAILED:`, msg);
          throw err;
        }
      }
    }
  }

  await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);

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
