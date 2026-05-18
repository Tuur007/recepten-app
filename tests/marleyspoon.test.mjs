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

// ─── Edge cases — different recipe shapes ────────────────────────────────────

test('recipe without subtitle: title stands alone', () => {
  const r = {
    title: 'Bolognese',
    shippedIngredients: [{ nameWithQuantity: '500 g gehakt' }],
    steps: [{ title: 'Bakken', description: 'Bak het gehakt.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.title, 'Bolognese');
});

test('recipe with only duration.from (no .to) falls back to .from', () => {
  const r = {
    title: 'Quickie',
    duration: { from: 15, to: null, unit: 'minuten' },
    shippedIngredients: [{ nameWithQuantity: '1 ei' }],
    steps: [{ title: 'Doen', description: 'Doe iets.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.duration, 15);
});

test('recipe with null duration object has no duration', () => {
  const r = {
    title: 'Geen tijd',
    duration: null,
    shippedIngredients: [{ nameWithQuantity: '1 ei' }],
    steps: [{ title: 'X', description: 'Y.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.duration, undefined);
});

test('recipe with null image has no imageUrl', () => {
  const r = {
    title: 'Geen foto',
    image: null,
    shippedIngredients: [{ nameWithQuantity: '1 ei' }],
    steps: [{ title: 'X', description: 'Y.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.imageUrl, undefined);
});

test('recipe with empty shippedIngredients: only assumed are kept', () => {
  const r = {
    title: 'Boterham',
    shippedIngredients: [],
    assumedIngredients: [{ name: 'boter' }, { name: 'brood' }],
    steps: [{ title: 'X', description: 'Y.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.ingredients.length, 2);
  assert.ok(out.ingredients.some((i) => i.name === 'boter'));
  assert.ok(out.ingredients.some((i) => i.name === 'brood'));
});

test('non-standard ingredient formats round-trip without losing words', () => {
  const r = {
    title: 'Test',
    shippedIngredients: [
      { nameWithQuantity: '1 teen knoflook' },
      { nameWithQuantity: '1 stukje verse gember' },
      { nameWithQuantity: '1 pakje gele currypasta' },
      { nameWithQuantity: '1 zakje groentebouillonpoeder' },
      { nameWithQuantity: '1 bosui' },
    ],
    steps: [{ title: 'X', description: 'Y.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  // Each input must round-trip to *some* ingredient row that contains all the
  // meaningful words, even if quantity/unit detection differs.
  const flat = out.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(' | ');
  for (const word of ['knoflook', 'gember', 'currypasta', 'bouillonpoeder', 'bosui']) {
    assert.ok(flat.includes(word), `'${word}' missing in: ${flat}`);
  }
});

test('step description starting with the title is not double-prefixed', () => {
  const r = {
    title: 'Test',
    shippedIngredients: [{ nameWithQuantity: '1 ei' }],
    steps: [
      {
        title: 'Voorbereiden',
        description: 'Voorbereiden: snijd de ui in stukjes.',
      },
    ],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  // Should NOT start with "Voorbereiden. Voorbereiden:"
  assert.ok(!out.steps[0].toLowerCase().startsWith('voorbereiden. voorbereiden'));
  assert.ok(out.steps[0].toLowerCase().includes('snijd de ui'));
});

test('step with only title (no description) is kept', () => {
  const r = {
    title: 'Test',
    shippedIngredients: [{ nameWithQuantity: '1 ei' }],
    steps: [
      { title: 'Serveren', description: '' },
      { title: '', description: 'Alleen body.' },
    ],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.steps.length, 2);
  assert.ok(out.steps[0].toLowerCase().includes('serveren'));
  assert.ok(out.steps[1].toLowerCase().includes('alleen body'));
});

test('multiple __bold__ markers in one description are all stripped', () => {
  const r = {
    title: 'Test',
    shippedIngredients: [{ nameWithQuantity: '1 ei' }],
    steps: [
      {
        title: 'X',
        description: 'Snijd de __ui__, __knoflook__ en __gember__ klein.',
      },
    ],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.ok(!out.steps[0].includes('__'));
  assert.ok(out.steps[0].includes('ui'));
  assert.ok(out.steps[0].includes('knoflook'));
  assert.ok(out.steps[0].includes('gember'));
});

test('null entries in arrays are skipped without crashing', () => {
  const r = {
    title: 'Defensief',
    shippedIngredients: [null, { nameWithQuantity: '1 ei' }, undefined],
    assumedIngredients: [null, { name: 'zout' }],
    steps: [null, { title: 'Doen', description: 'Iets.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.ingredients.length, 2);
  assert.equal(out.steps.length, 1);
});

test('recipe object with no title still produces a fallback title', () => {
  const r = {
    shippedIngredients: [{ nameWithQuantity: '1 ei' }],
    steps: [{ title: 'X', description: 'Y.' }],
  };
  const out = parseMarleySpoonRecipeJson(r, URL);
  assert.equal(out.title, 'Recept');
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
