import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_GROCERY_ITEMS_TABLE, CREATE_RECIPES_TABLE } from './schema';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    ${CREATE_RECIPES_TABLE}
    ${CREATE_GROCERY_ITEMS_TABLE}
  `);
}
