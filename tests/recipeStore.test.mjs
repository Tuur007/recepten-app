/**
 * recipeStore.test.mjs — LWW-semantiek van de twee update-acties.
 *
 *  • applyLocalEdit() → wij zijn de bron, dus updatedAt = now()
 *  • replaceFromRemote() → behoudt de binnenkomende updatedAt exact
 */

import { strict as assert } from 'node:assert';

const { useRecipeStore } = await import('../V0.1.2/store/recipeStore.ts');

const PASS = (s) => console.log(`\x1b[32m✅ ${s}\x1b[0m`);
const FAIL = (s) => console.log(`\x1b[31m❌ ${s}\x1b[0m`);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    PASS(name);
    passed++;
  } catch (e) {
    FAIL(`${name} — ${e?.message ?? e}`);
    if (e?.stack) console.log('   ' + e.stack.split('\n').slice(1, 4).join('\n   '));
    failed++;
  }
}

function makeRecipe(overrides = {}) {
  return {
    id: 'r1',
    title: 'Tomatensoep',
    ingredients: [],
    steps: [],
    category: 'Soep',
    isFavorite: false,
    allergens: [],
    timesCooked: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

console.log('\n══════════════════════════════════════════════');
console.log(' recipeStore — applyLocalEdit / replaceFromRemote');
console.log('══════════════════════════════════════════════\n');

test('applyLocalEdit zet updatedAt op now()', () => {
  useRecipeStore.getState().setRecipes([makeRecipe({ updatedAt: '2020-01-01T00:00:00.000Z' })]);

  const t0 = Date.now();
  useRecipeStore.getState().applyLocalEdit('r1', { title: 'Nieuwe titel' });
  const t1 = Date.now();

  const r = useRecipeStore.getState().recipes[0];
  assert.equal(r.title, 'Nieuwe titel');
  assert.notEqual(r.updatedAt, '2020-01-01T00:00:00.000Z', 'oude updatedAt moet overschreven zijn');
  const ts = Date.parse(r.updatedAt);
  assert.ok(ts >= t0 && ts <= t1, `updatedAt ${r.updatedAt} ligt niet tussen t0 en t1`);
});

test('replaceFromRemote behoudt de meegestuurde updatedAt exact', () => {
  useRecipeStore.getState().setRecipes([makeRecipe({ updatedAt: '2026-01-01T00:00:00.000Z' })]);

  const remoteUpdatedAt = '2030-06-15T12:34:56.789Z';
  useRecipeStore.getState().replaceFromRemote(
    'r1',
    makeRecipe({ title: 'Remote titel', updatedAt: remoteUpdatedAt }),
  );

  const r = useRecipeStore.getState().recipes[0];
  assert.equal(r.title, 'Remote titel');
  assert.equal(r.updatedAt, remoteUpdatedAt, 'remote updatedAt mag NIET overschreven worden');
});

test('replaceFromRemote no-opt voor onbekende id', () => {
  useRecipeStore.getState().setRecipes([makeRecipe()]);
  useRecipeStore.getState().replaceFromRemote('does-not-exist', makeRecipe({ id: 'x' }));
  assert.equal(useRecipeStore.getState().recipes.length, 1);
  assert.equal(useRecipeStore.getState().recipes[0].id, 'r1');
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
