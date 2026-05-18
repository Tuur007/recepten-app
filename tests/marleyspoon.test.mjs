/**
 * marleyspoon.test.mjs — unit tests for the Marley Spoon GraphQL converter.
 *
 * Marley Spoon's /menu/<id>-<slug> pages are an empty SPA shell. The real
 * recipe data only arrives via a POST to https://api.marleyspoon.com/graphql
 * using the JWT in `window.gon.api_token`. The HTTP plumbing lives in
 * `fetchMarleySpoonRecipe` (tested by manual app import); this file pins the
 * pure JSON-to-ParsedRecipe conversion against a fixture captured from a real
 * production response.
 *
 * Run via the V0.1.2 npm script: cd V0.1.2 && npm test
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const { parseMarleySpoonRecipeJson } = await import(
  '../V0.1.2/services/recipeParser.ts'
);

const __dirname = dirname(fileURLToPath(import.meta.url));

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
console.log(' marleyspoon — GraphQL response → ParsedRecipe');
console.log('══════════════════════════════════════════════\n');

const recipeJson = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures/marleyspoon-graphql.json'), 'utf-8'),
);
const URL =
  'https://marleyspoon.be/menu/618930-pittige-noedelsoep-met-kokosmelk-met-paprika-en-gebakken-champignons';

const parsed = parseMarleySpoonRecipeJson(recipeJson, URL);

test('combines title + subtitle', () => {
  assert.equal(
    parsed.title,
    'Pittige noedelsoep met kokosmelk met paprika en gebakken champignons',
  );
});

test('extracts shippedIngredients via nameWithQuantity', () => {
  const names = parsed.ingredients.map((i) => i.name);
  assert.ok(names.includes('glasnoedels'), `missing 'glasnoedels' in ${JSON.stringify(names)}`);
  assert.ok(names.includes('kokosmelk'), `missing 'kokosmelk'`);
  assert.ok(names.includes('champignons'), `missing 'champignons'`);
});

test('parses quantity + unit from nameWithQuantity', () => {
  const noedels = parsed.ingredients.find((i) => i.name === 'glasnoedels');
  assert.ok(noedels, 'glasnoedels not found');
  assert.equal(noedels.quantity, 100);
  assert.equal(noedels.unit.toLowerCase(), 'g');

  const kokos = parsed.ingredients.find((i) => i.name === 'kokosmelk');
  assert.ok(kokos);
  assert.equal(kokos.quantity, 200);
  assert.equal(kokos.unit.toLowerCase(), 'ml');
});

test('appends assumedIngredients (pantry items)', () => {
  const names = parsed.ingredients.map((i) => i.name);
  assert.ok(names.includes('zout'), `'zout' missing; got ${JSON.stringify(names)}`);
  assert.ok(names.includes('suiker'));
  assert.ok(names.includes('plantaardige olie'));
});

test('extracts all 6 steps in order', () => {
  assert.equal(parsed.steps.length, 6, `expected 6 steps, got ${parsed.steps.length}`);
  assert.ok(parsed.steps[0].toLowerCase().includes('noedels'));
  assert.ok(parsed.steps[3].toLowerCase().includes('kokosmelk'));
  assert.ok(parsed.steps[5].toLowerCase().includes('garneer'));
});

test('strips Markdown-style __bold__ markers from step text', () => {
  for (const s of parsed.steps) {
    assert.ok(
      !s.includes('__'),
      `step still contains __ markers: ${s.slice(0, 60)}…`,
    );
  }
  // ...but the words inside the markers are preserved
  assert.ok(parsed.steps[0].toLowerCase().includes('noedels'));
  assert.ok(parsed.steps[1].toLowerCase().includes('paprika'));
});

test('prefers duration.to as the cooking time', () => {
  assert.equal(parsed.duration, 40);
});

test('extracts image.url', () => {
  assert.equal(
    parsed.imageUrl,
    'https://marleyspoon.com/media/recipes/618930/main_photos/large/scharfe-dcc4889299b136192037fade30ff38fc.jpeg',
  );
});

test('sourceUrl is the original menu URL', () => {
  assert.equal(parsed.sourceUrl, URL);
});

test('handles missing optional fields gracefully', () => {
  const minimal = {
    title: 'Test recept',
    shippedIngredients: [{ name: 'water', nameWithQuantity: '1 l water' }],
    steps: [{ title: 'Stap 1', description: 'Kook water.' }],
  };
  const out = parseMarleySpoonRecipeJson(minimal, URL);
  assert.equal(out.title, 'Test recept');
  assert.equal(out.duration, undefined);
  assert.equal(out.imageUrl, undefined);
  assert.equal(out.ingredients.length, 1);
  assert.equal(out.steps.length, 1);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
