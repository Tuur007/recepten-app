export const CREATE_RECIPES_TABLE = `
  CREATE TABLE IF NOT EXISTS recipes (
    id          TEXT PRIMARY KEY NOT NULL,
    title       TEXT NOT NULL,
    ingredients TEXT NOT NULL DEFAULT '[]',
    steps       TEXT NOT NULL DEFAULT '[]',
    source_url  TEXT,
    category    TEXT NOT NULL DEFAULT '',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    image_uri   TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
`;

export const CREATE_GROCERY_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS grocery_items (
    id            TEXT PRIMARY KEY NOT NULL,
    name          TEXT NOT NULL,
    unit          TEXT NOT NULL DEFAULT '',
    sources       TEXT NOT NULL DEFAULT '[]',
    total_quantity REAL NOT NULL DEFAULT 0,
    checked       INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );
`;

// Each entry runs once, guarded by PRAGMA user_version.
// Never edit an existing entry — always append a new one.
export const MIGRATIONS: string[] = [
  // v1: recipe categories
  `ALTER TABLE recipes ADD COLUMN category TEXT NOT NULL DEFAULT ''`,
  // v2: recipe favourites
  `ALTER TABLE recipes ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`,
  // v3: SourceLineage — add sources column
  `ALTER TABLE grocery_items ADD COLUMN sources TEXT NOT NULL DEFAULT '[]'`,
  // v4: SourceLineage — add total_quantity column
  `ALTER TABLE grocery_items ADD COLUMN total_quantity REAL NOT NULL DEFAULT 0`,
  // v5: recipe image support
  `ALTER TABLE recipes ADD COLUMN image_uri TEXT`,
];
