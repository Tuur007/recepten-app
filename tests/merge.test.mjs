/**
 * merge.test.mjs — grocery-merge zonder unit-conversie.
 *
 * areUnitsCompatible is versmald naar STRIKT gelijke genormaliseerde units,
 * zodat computeTotalQuantity (die enkel getallen somt) nooit "201 g" maakt
 * van 200 g + 1 kg.
 */

import { strict as assert } from 'node:assert';

const { mergeIngredientsIntoGrocery, removeSourceFromGrocery } = await import(
  '../V0.1.2/utils/merge.ts'
);

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

const ing = (name, unit, quantity) => ({ name, unit, quantity });

console.log('\n══════════════════════════════════════════════');
console.log(' mergeIngredientsIntoGrocery — strikte units');
console.log('══════════════════════════════════════════════\n');

test('200g meel + 1kg meel → 2 rijen (geen conversie)', () => {
  let items = [];
  items = mergeIngredientsIntoGrocery(items, [ing('meel', 'g', 200)], 'r1', 'Recept 1');
  items = mergeIngredientsIntoGrocery(items, [ing('meel', 'kg', 1)], 'r2', 'Recept 2');
  assert.equal(items.length, 2, 'g en kg mogen niet samengevoegd worden');
});

test('200g + 200g + 200g (g, G, gr) → 1 rij, 600g', () => {
  let items = [];
  items = mergeIngredientsIntoGrocery(items, [ing('meel', 'g', 200)], 'r1', 'R1');
  items = mergeIngredientsIntoGrocery(items, [ing('meel', 'G', 200)], 'r2', 'R2');
  items = mergeIngredientsIntoGrocery(items, [ing('meel', 'gr', 200)], 'r3', 'R3');
  assert.equal(items.length, 1, 'alle gram-varianten horen één rij te zijn');
  assert.equal(items[0].totalQuantity, 600);
  assert.equal(items[0].sources.length, 3);
});

test('3 uien + 2 uien (beide zonder unit) → 1 rij, 5', () => {
  let items = [];
  items = mergeIngredientsIntoGrocery(items, [ing('uien', '', 3)], 'r1', 'R1');
  items = mergeIngredientsIntoGrocery(items, [ing('uien', '', 2)], 'r2', 'R2');
  assert.equal(items.length, 1);
  assert.equal(items[0].totalQuantity, 5);
  assert.equal(items[0].sources.length, 2);
});

test('removeSourceFromGrocery vermindert totalQuantity correct', () => {
  let items = [];
  items = mergeIngredientsIntoGrocery(items, [ing('meel', 'g', 200)], 'r1', 'R1');
  items = mergeIngredientsIntoGrocery(items, [ing('meel', 'g', 300)], 'r2', 'R2');
  assert.equal(items[0].totalQuantity, 500);

  const after = removeSourceFromGrocery(items, 'r1');
  assert.equal(after.length, 1);
  assert.equal(after[0].sources.length, 1);
  assert.equal(after[0].totalQuantity, 300, 'na verwijderen van r1 blijft 300 over');
});

test('drie recepten die elk 100g toevoegen → 1 rij, 3 sources, 300g', () => {
  let items = [];
  for (const r of ['r1', 'r2', 'r3']) {
    items = mergeIngredientsIntoGrocery(items, [ing('suiker', 'g', 100)], r, `Recept ${r}`);
  }
  assert.equal(items.length, 1);
  assert.equal(items[0].sources.length, 3);
  assert.equal(items[0].totalQuantity, 300);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
