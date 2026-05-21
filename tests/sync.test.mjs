/**
 * sync.test.mjs — verifieert dat pullAll() schrijft naar SQLite én dat
 * week_plans gemerged worden in plaats van vervangen.
 *
 * We injecteren een mock Supabase-client (via de optionele tweede parameter
 * van pullAll) en een mock SQLiteDatabase — geen netwerk, geen file-system.
 *
 * Stub voor expo-sqlite/AsyncStorage moet vóór de eerste app-import
 * geregistreerd zijn (supabase.ts laadt AsyncStorage bij module-init).
 */

import { strict as assert } from 'node:assert';

// AsyncStorage probeert window.localStorage te lezen — stub die voordat
// supabase.ts geladen wordt.
globalThis.window = {
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};

const { useAuthStore } = await import('../V0.1.2/store/authStore.ts');
const { useWeekPlannerStore } = await import('../V0.1.2/store/weekPlannerStore.ts');
const { useRecipeStore } = await import('../V0.1.2/store/recipeStore.ts');
const { useGroceryStore } = await import('../V0.1.2/store/groceryStore.ts');
const sync = await import('../V0.1.2/services/sync/supabaseSync.ts');

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

function makeMockDb() {
  const calls = [];
  return {
    calls,
    async runAsync(sql, params) {
      const head = String(sql).trim().replace(/\s+/g, ' ').slice(0, 60);
      calls.push({ head, params });
      return { changes: 1, lastInsertRowId: 1 };
    },
    async getAllAsync() { return []; },
    async getFirstAsync() { return null; },
    async execAsync() {},
    async withTransactionAsync(fn) { return fn(); },
  };
}

function makeMockClient(responses) {
  // responses: { recipes: {data,error}, grocery_items: {...}, week_plans: {...} }
  function chain(table) {
    const c = {
      _t: table,
      select() { return c; },
      eq() { return c; },
      is() { return c; },
      gt() { return c; },
      order() { return c; },
      then(res, rej) { return Promise.resolve(responses[table]).then(res, rej); },
      catch(rej) { return Promise.resolve(responses[table]).catch(rej); },
    };
    return c;
  }
  return {
    from(table) { return chain(table); },
    channel() { return { on() { return this; }, subscribe() { return this; } }; },
    removeChannel() {},
  };
}

console.log('\n══════════════════════════════════════════════');
console.log(' pullAll → SQLite (#1)');
console.log('══════════════════════════════════════════════\n');

await test('schrijft recepten via RecipeRepository.upsertMany', async () => {
  useAuthStore.setState({ familyId: 'fam-1', user: { id: 'u' } });
  useRecipeStore.setState({ recipes: [] });

  const client = makeMockClient({
    recipes: {
      data: [{
        id: 'r1', title: 'Tomatensoep', ingredients: [], steps: [],
        source_url: null, duration: null, category: 'Soep',
        is_favorite: false, image_uri: null, allergens: [],
        difficulty: null, preparation_time: null, cooking_time: null,
        servings: null, rating: null, times_cooked: 0, last_cooked: null,
        notes: null, equipment: null,
        created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z',
      }],
      error: null,
    },
    grocery_items: { data: [], error: null },
    week_plans: { data: [], error: null },
  });

  const db = makeMockDb();
  await sync.pullAll(db, client);

  const recipeInserts = db.calls.filter((c) => /INSERT INTO recipes/i.test(c.head));
  assert.equal(recipeInserts.length, 1, `verwachtte 1 recept-insert, kreeg ${recipeInserts.length}`);
  assert.equal(recipeInserts[0].params[0], 'r1');
  assert.equal(recipeInserts[0].params[1], 'Tomatensoep');

  // Store is ook bijgewerkt
  assert.equal(useRecipeStore.getState().recipes.length, 1);
});

await test('schrijft grocery items via GroceryRepository.upsertMany', async () => {
  useGroceryStore.setState({ items: [] });

  const client = makeMockClient({
    recipes: { data: [], error: null },
    grocery_items: {
      data: [{
        id: 'g1', name: 'Melk', unit: 'l', sources: [],
        total_quantity: 1, checked: false, category: 'Zuivel',
        aisle: null, price: null, store_id: null,
        created_at: '2026-05-01T00:00:00Z',
      }],
      error: null,
    },
    week_plans: { data: [], error: null },
  });

  const db = makeMockDb();
  await sync.pullAll(db, client);

  const groceryInserts = db.calls.filter((c) => /INSERT INTO grocery_items/i.test(c.head));
  assert.equal(groceryInserts.length, 1);
  assert.equal(groceryInserts[0].params[0], 'g1');
  assert.equal(useGroceryStore.getState().items.length, 1);
});

await test('pullAll returns early bij null client', async () => {
  const db = makeMockDb();
  await sync.pullAll(db, null);
  assert.equal(db.calls.length, 0);
});

console.log('\n══════════════════════════════════════════════');
console.log(' pullAll → weekplanner (#2)');
console.log('══════════════════════════════════════════════\n');

await test('haalt week_plans op en zet ze in de store', async () => {
  useWeekPlannerStore.setState({ weeks: {} });
  const emptyWeek = {
    MON: { breakfast: null, lunch: null, dinner: null },
    TUE: { breakfast: null, lunch: null, dinner: null },
    WED: { breakfast: null, lunch: null, dinner: null },
    THU: { breakfast: null, lunch: null, dinner: null },
    FRI: { breakfast: null, lunch: null, dinner: null },
    SAT: { breakfast: null, lunch: null, dinner: null },
    SUN: { breakfast: null, lunch: null, dinner: null },
  };

  const client = makeMockClient({
    recipes: { data: [], error: null },
    grocery_items: { data: [], error: null },
    week_plans: {
      data: [{
        family_id: 'fam-1',
        week_key: '2026-W20',
        plan_data: { ...emptyWeek, MON: { breakfast: null, lunch: 'r1', dinner: null } },
      }],
      error: null,
    },
  });

  await sync.pullAll(makeMockDb(), client);

  const weeks = useWeekPlannerStore.getState().weeks;
  assert.ok(weeks['2026-W20'], 'verwachtte W20 in de store');
  assert.equal(weeks['2026-W20'].MON.lunch, 'r1');
});

await test('twee clients verliezen geen weken bij merge', async () => {
  const emptyWeek = () => ({
    MON: { breakfast: null, lunch: null, dinner: null },
    TUE: { breakfast: null, lunch: null, dinner: null },
    WED: { breakfast: null, lunch: null, dinner: null },
    THU: { breakfast: null, lunch: null, dinner: null },
    FRI: { breakfast: null, lunch: null, dinner: null },
    SAT: { breakfast: null, lunch: null, dinner: null },
    SUN: { breakfast: null, lunch: null, dinner: null },
  });

  // Client A heeft al een plan voor W19 in zijn lokale store
  useWeekPlannerStore.setState({
    weeks: {
      '2026-W19': { ...emptyWeek(), MON: { breakfast: null, lunch: 'a-local', dinner: null } },
    },
  });

  // Client B heeft W20 in de cloud staan
  const client = makeMockClient({
    recipes: { data: [], error: null },
    grocery_items: { data: [], error: null },
    week_plans: {
      data: [{
        family_id: 'fam-1',
        week_key: '2026-W20',
        plan_data: { ...emptyWeek(), MON: { breakfast: null, lunch: 'b-cloud', dinner: null } },
      }],
      error: null,
    },
  });

  await sync.pullAll(makeMockDb(), client);

  const weeks = useWeekPlannerStore.getState().weeks;
  assert.equal(weeks['2026-W19'].MON.lunch, 'a-local', 'lokale week W19 mag niet verdwijnen');
  assert.equal(weeks['2026-W20'].MON.lunch, 'b-cloud', 'cloud-week W20 moet erbij komen');
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
