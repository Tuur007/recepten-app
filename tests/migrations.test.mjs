/**
 * migrations.test.mjs — de SQLite migratie-runner in V0.1.2/database/index.ts.
 *
 * Gebruikt node:sqlite (DatabaseSync) als echte :memory: db, verpakt in een
 * async adapter die de expo-sqlite API nabootst (execAsync/getFirstAsync/...).
 *
 *  • verse install → alle tabellen + user_version = MIGRATIONS.length
 *  • tweede init is idempotent (geen dubbele ALTER, user_version onveranderd)
 *  • fout in een tussenmigratie → user_version blijft op de laatste geslaagde
 */

import { strict as assert } from 'node:assert';
import { DatabaseSync } from 'node:sqlite';

// supabase.ts (transitief geïmporteerd) leest AsyncStorage; window stubben.
globalThis.window = {
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
};

const { initializeDatabase, applyPendingMigrations } = await import(
  '../V0.1.2/database/index.ts'
);
const { MIGRATIONS } = await import('../V0.1.2/database/schema.ts');

const PASS = (s) => console.log(`\x1b[32m✅ ${s}\x1b[0m`);
const FAIL = (s) => console.log(`\x1b[31m❌ ${s}\x1b[0m`);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    PASS(name);
    passed++;
  } catch (e) {
    FAIL(`${name} — ${e?.message ?? e}`);
    if (e?.stack) console.log('   ' + e.stack.split('\n').slice(1, 4).join('\n   '));
    failed++;
  }
}

// Async adapter rond node:sqlite die de subset van de expo-sqlite API levert
// die database/index.ts gebruikt.
function makeAdapter() {
  const db = new DatabaseSync(':memory:');
  return {
    _raw: db,
    async execAsync(sql) {
      db.exec(sql);
    },
    async getFirstAsync(sql, params = []) {
      return db.prepare(sql).get(...params) ?? null;
    },
    async getAllAsync(sql, params = []) {
      return db.prepare(sql).all(...params);
    },
    async runAsync(sql, params = []) {
      const r = db.prepare(sql).run(...params);
      return { changes: r.changes, lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async withTransactionAsync(fn) {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

const userVersion = async (db) =>
  (await db.getFirstAsync('PRAGMA user_version')).user_version;

const tableNames = async (db) =>
  (await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table'")).map((r) => r.name);

const columnNames = async (db, table) =>
  (await db.getAllAsync(`PRAGMA table_info(${table})`)).map((c) => c.name);

console.log('\n══════════════════════════════════════════════');
console.log(' migratie-runner');
console.log('══════════════════════════════════════════════\n');

await test('verse install → alle tabellen + user_version = MIGRATIONS.length', async () => {
  const db = makeAdapter();
  await initializeDatabase(db);

  assert.equal(await userVersion(db), MIGRATIONS.length, 'user_version moet op laatste migratie staan');

  const tables = await tableNames(db);
  for (const t of [
    'recipes', 'grocery_items', 'categories',
    'collections', 'collection_recipes', 'app_prefs', 'sync_queue',
  ]) {
    assert.ok(tables.includes(t), `tabel "${t}" ontbreekt na verse install`);
  }

  // Volledige recipes-kolommen moeten bestaan (FULL pad).
  const cols = await columnNames(db, 'recipes');
  for (const c of ['nutrition', 'rating', 'times_cooked', 'difficulty']) {
    assert.ok(cols.includes(c), `recipes mist kolom "${c}"`);
  }
});

await test('tweede init is idempotent — geen fouten, user_version onveranderd', async () => {
  const db = makeAdapter();
  await initializeDatabase(db);
  const v1 = await userVersion(db);
  const catCount1 = (await db.getFirstAsync('SELECT COUNT(*) as count FROM categories')).count;

  // Tweede run mag niet gooien (CREATE IF NOT EXISTS, geen her-ALTER).
  await initializeDatabase(db);

  assert.equal(await userVersion(db), v1, 'user_version mag niet veranderen');
  const catCount2 = (await db.getFirstAsync('SELECT COUNT(*) as count FROM categories')).count;
  assert.equal(catCount2, catCount1, 'categorieën mogen niet opnieuw geseed worden');
});

await test('applyPendingMigrations bumpt user_version per geslaagde stap', async () => {
  const db = makeAdapter();
  await db.execAsync('CREATE TABLE t (id INTEGER)');
  const migrations = [
    'ALTER TABLE t ADD COLUMN a TEXT',
    'ALTER TABLE t ADD COLUMN b TEXT',
    'ALTER TABLE t ADD COLUMN c TEXT',
  ];
  await applyPendingMigrations(db, 0, migrations);
  assert.equal(await userVersion(db), 3);
  const cols = await columnNames(db, 't');
  assert.ok(['a', 'b', 'c'].every((c) => cols.includes(c)));
});

await test('fout in tussenmigratie → user_version blijft op laatste geslaagde', async () => {
  const db = makeAdapter();
  await db.execAsync('CREATE TABLE t (id INTEGER)');
  const migrations = [
    'ALTER TABLE t ADD COLUMN a TEXT', // v1 ok
    'ALTER TABLE t ADD COLUMN b TEXT', // v2 ok
    'THIS IS NOT VALID SQL',           // v3 faalt
    'ALTER TABLE t ADD COLUMN d TEXT', // v4 wordt nooit bereikt
  ];

  await assert.rejects(() => applyPendingMigrations(db, 0, migrations));

  assert.equal(await userVersion(db), 2, 'user_version blijft op 2, niet hoger');
  const cols = await columnNames(db, 't');
  assert.ok(cols.includes('a') && cols.includes('b'), 'geslaagde kolommen blijven');
  assert.ok(!cols.includes('d'), 'kolom na de fout mag niet bestaan');
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
