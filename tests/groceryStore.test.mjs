/**
 * groceryStore.test.mjs — unit tests voor de getTotal()-berekening
 * in store/groceryStore.ts (Optie A: prijs per eenheid).
 */

import { strict as assert } from 'node:assert';

const { useGroceryStore } = await import('../V0.1.2/store/groceryStore.ts');

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

console.log('\n══════════════════════════════════════════════');
console.log(' groceryStore.getTotal — prijs per eenheid');
console.log('══════════════════════════════════════════════\n');

function makeItem(overrides) {
  return {
    id: overrides.id ?? 'i',
    name: overrides.name ?? 'item',
    unit: overrides.unit ?? '',
    category: overrides.category ?? '',
    sources: overrides.sources ?? [],
    totalQuantity: overrides.totalQuantity ?? 0,
    checked: overrides.checked ?? false,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    price: overrides.price,
    aisle: overrides.aisle,
    storeId: overrides.storeId,
  };
}

test('lege lijst → 0', () => {
  useGroceryStore.getState().setItems([]);
  assert.equal(useGroceryStore.getState().getTotal(), 0);
});

test('items zonder prijs worden genegeerd', () => {
  useGroceryStore.getState().setItems([
    makeItem({ totalQuantity: 5 }),
    makeItem({ totalQuantity: 10 }),
  ]);
  assert.equal(useGroceryStore.getState().getTotal(), 0);
});

test('prijs × hoeveelheid (1 item)', () => {
  useGroceryStore.getState().setItems([makeItem({ price: 2.5, totalQuantity: 4 })]);
  assert.equal(useGroceryStore.getState().getTotal(), 10);
});

test('som over meerdere items', () => {
  useGroceryStore.getState().setItems([
    makeItem({ id: 'a', price: 1.5, totalQuantity: 2 }), // 3.0
    makeItem({ id: 'b', price: 0.8, totalQuantity: 5 }), // 4.0
    makeItem({ id: 'c', price: 4, totalQuantity: 1 }),   // 4.0
  ]);
  assert.equal(useGroceryStore.getState().getTotal(), 11);
});

test('hoeveelheid 0 → telt als 0 (geen verborgen fallback)', () => {
  useGroceryStore.getState().setItems([
    makeItem({ price: 5, totalQuantity: 0 }),
  ]);
  assert.equal(useGroceryStore.getState().getTotal(), 0);
});

test('fractionele hoeveelheden werken', () => {
  useGroceryStore.getState().setItems([
    makeItem({ price: 2, totalQuantity: 1.5 }),
  ]);
  assert.equal(useGroceryStore.getState().getTotal(), 3);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
