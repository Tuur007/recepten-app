import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_GROCERY_ITEMS_TABLE, CREATE_RECIPES_TABLE, MIGRATIONS } from './schema';
import { initImageDirectory } from '../utils/imageStorage';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await initImageDirectory();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    ${CREATE_RECIPES_TABLE}
    ${CREATE_GROCERY_ITEMS_TABLE}
  `);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    try {
      await db.execAsync(MIGRATIONS[i]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('duplicate column') && !msg.includes('already exists')) throw err;
    }
  }

  await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
}
