export const CREATE_RECIPES_TABLE = `
  CREATE TABLE IF NOT EXISTS recipes (
    id          TEXT PRIMARY KEY NOT NULL,
    title       TEXT NOT NULL,
    ingredients TEXT NOT NULL DEFAULT '[]',
    steps       TEXT NOT NULL DEFAULT '[]',
    source_url  TEXT,
    category    TEXT NOT NULL DEFAULT '',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
`;

export const CREATE_GROCERY_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS grocery_items (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    quantity   REAL NOT NULL DEFAULT 1,
    unit       TEXT NOT NULL DEFAULT '',
    recipes    TEXT NOT NULL DEFAULT '[]',
    checked    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`;

export const MIGRATIONS = [
  `ALTER TABLE recipes ADD COLUMN category TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE recipes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`,
];
