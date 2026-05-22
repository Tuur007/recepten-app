export const CREATE_RECIPES_TABLE = `
  CREATE TABLE IF NOT EXISTS recipes (
    id          TEXT PRIMARY KEY NOT NULL,
    title       TEXT NOT NULL,
    ingredients TEXT NOT NULL DEFAULT '[]',
    steps       TEXT NOT NULL DEFAULT '[]',
    source_url  TEXT,
    duration    INTEGER,
    category    TEXT NOT NULL DEFAULT '',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    image_uri   TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
`;

// Bron van waarheid voor verse installaties: alle kolommen die anders via de
// migraties-lijst worden toegevoegd, staan hier in één CREATE statement.
// Voeg nieuwe kolommen altijd HIER toe én als nieuwe migratie-entry hieronder.
export const CREATE_RECIPES_TABLE_FULL = `
  CREATE TABLE IF NOT EXISTS recipes (
    id               TEXT PRIMARY KEY NOT NULL,
    title            TEXT NOT NULL,
    ingredients      TEXT NOT NULL DEFAULT '[]',
    steps            TEXT NOT NULL DEFAULT '[]',
    source_url       TEXT,
    duration         INTEGER,
    category         TEXT NOT NULL DEFAULT '',
    is_favorite      INTEGER NOT NULL DEFAULT 0,
    image_uri        TEXT,
    allergens        TEXT NOT NULL DEFAULT '[]',
    difficulty       TEXT,
    preparation_time INTEGER,
    cooking_time     INTEGER,
    servings         INTEGER,
    rating           REAL,
    times_cooked     INTEGER NOT NULL DEFAULT 0,
    last_cooked      TEXT,
    notes            TEXT,
    equipment        TEXT,
    nutrition        TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );
`;

export const CREATE_COLLECTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS collections (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
`;

export const CREATE_COLLECTION_RECIPES_TABLE = `
  CREATE TABLE IF NOT EXISTS collection_recipes (
    collection_id TEXT NOT NULL,
    recipe_id     TEXT NOT NULL,
    added_at      TEXT NOT NULL,
    PRIMARY KEY (collection_id, recipe_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id)     REFERENCES recipes(id)     ON DELETE CASCADE
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

export const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;

export const CREATE_PREFS_TABLE = `
  CREATE TABLE IF NOT EXISTS app_prefs (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

// Outbox voor remote sync — writes worden hier eerst neergezet en pas verwijderd
// als de upload naar Supabase slaagt. Zo verdwijnt geen enkele offline mutatie.
export const CREATE_SYNC_QUEUE_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_queue (
    id         TEXT PRIMARY KEY NOT NULL,
    op         TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT NOT NULL,
    payload    TEXT,
    created_at TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );
`;

export const DEFAULT_RECIPE_CATEGORIES = [
  'Pasta', 'Soep', 'Vis', 'Vlees', 'Snel',
  'Vegetarisch', 'Dessert', 'Ontbijt', 'Lunch',
  'Diner', 'Snack', 'Salade', 'Bakken', 'Dranken',
];

export const DEFAULT_GROCERY_CATEGORIES = [
  'Groente', 'Fruit', 'Vlees', 'Zuivel', 'Bakkerij',
  'Diepvries', 'Dranken', 'Snacks', 'Overig',
];

// Nooit bestaande entries aanpassen — alleen nieuwe toevoegen.
// Nieuwe kolommen: voeg hier én in CREATE_RECIPES_TABLE_FULL toe.
// Each entry runs once, guarded by PRAGMA user_version.
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
  // v6: recipe duration
  `ALTER TABLE recipes ADD COLUMN duration INTEGER`,
  // v7: categories table (no ALTER needed — table created fresh via CREATE IF NOT EXISTS)
  `SELECT 1`,
  // v8: grocery_items category column
  `ALTER TABLE grocery_items ADD COLUMN category TEXT NOT NULL DEFAULT ''`,
  // v9: recipe allergens column
  `ALTER TABLE recipes ADD COLUMN allergens TEXT NOT NULL DEFAULT '[]'`,
  // v10: recipe difficulty
  `ALTER TABLE recipes ADD COLUMN difficulty TEXT`,
  // v11: recipe preparation time (minutes)
  `ALTER TABLE recipes ADD COLUMN preparation_time INTEGER`,
  // v12: recipe cooking time (minutes)
  `ALTER TABLE recipes ADD COLUMN cooking_time INTEGER`,
  // v13: servings count
  `ALTER TABLE recipes ADD COLUMN servings INTEGER`,
  // v14: recipe rating
  `ALTER TABLE recipes ADD COLUMN rating REAL`,
  // v15: times cooked counter
  `ALTER TABLE recipes ADD COLUMN times_cooked INTEGER NOT NULL DEFAULT 0`,
  // v16: last cooked timestamp
  `ALTER TABLE recipes ADD COLUMN last_cooked TEXT`,
  // v17: recipe notes
  `ALTER TABLE recipes ADD COLUMN notes TEXT`,
  // v18: equipment list
  `ALTER TABLE recipes ADD COLUMN equipment TEXT`,
  // v19: grocery aisle grouping
  `ALTER TABLE grocery_items ADD COLUMN aisle TEXT`,
  // v20: grocery item price (per eenheid — zie types/grocery.ts)
  `ALTER TABLE grocery_items ADD COLUMN price REAL`,
  // v21: backfill duration from prep + cooking times
  `UPDATE recipes SET duration=COALESCE(preparation_time,0)+COALESCE(cooking_time,0) WHERE preparation_time IS NOT NULL OR cooking_time IS NOT NULL`,
  // v22: app preferences (theme mode, etc.)
  `CREATE TABLE IF NOT EXISTS app_prefs (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`,
  // v23: grocery item shop reference
  `ALTER TABLE grocery_items ADD COLUMN store_id TEXT`,
  // v24: nutritie-data per recept (JSON-blob met NutritionInfo)
  `ALTER TABLE recipes ADD COLUMN nutrition TEXT`,
  // v25: recipe collections — gebruikersgemaakte mappen
  `CREATE TABLE IF NOT EXISTS collections (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`,
  // v26: koppeltabel recipe ↔ collection (many-to-many)
  `CREATE TABLE IF NOT EXISTS collection_recipes (
    collection_id TEXT NOT NULL,
    recipe_id     TEXT NOT NULL,
    added_at      TEXT NOT NULL,
    PRIMARY KEY (collection_id, recipe_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id)     REFERENCES recipes(id)     ON DELETE CASCADE
  )`,
  // v27: outbox voor remote sync (Supabase) — survived offline writes
  `CREATE TABLE IF NOT EXISTS sync_queue (
    id         TEXT PRIMARY KEY NOT NULL,
    op         TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT NOT NULL,
    payload    TEXT,
    created_at TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  )`,
];
