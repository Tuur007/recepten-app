/**
 * marleyspoon.test.mjs — unit tests for the Marley Spoon recipe extractor.
 *
 * Marley Spoon recipe pages (marleyspoon.nl/menu/<id>-<slug>) embed the full
 * recipe object as JSON in an inline <script>. The keys are unique to their
 * API (`name_with_subtitle`, `name_with_quantity`, `assumed_ingredients`,
 * `steps[].title/description`), so we fingerprint them in the HTML and walk
 * back to the enclosing JSON object.
 *
 * Run via the V0.1.2 npm script: cd V0.1.2 && npm test
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const { parseRecipeFromHtml } = await import('../V0.1.2/services/recipeParser.ts');

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
console.log(' marleyspoon — embedded JSON blob');
console.log('══════════════════════════════════════════════\n');

const html = readFileSync(
  resolve(__dirname, 'fixtures/marleyspoon-page.html'),
  'utf-8',
);
const URL = 'https://marleyspoon.nl/menu/449816-venkelrisotto-met-gebakken-feta-met-rucola-en-courgette';
const parsed = parseRecipeFromHtml(html, URL);

test('finds title from name_with_subtitle', () => {
  assert.equal(
    parsed.title,
    'Venkelrisotto met gebakken feta met rucola en courgette',
  );
});

test('extracts main ingredients with quantity', () => {
  const names = parsed.ingredients.map((i) => i.name);
  // Names without leading quantity/unit
  assert.ok(names.includes('venkel'), `missing 'venkel' in ${JSON.stringify(names)}`);
  assert.ok(names.includes('risottorijst'), `missing 'risottorijst'`);
  assert.ok(names.includes('feta'), `missing 'feta'`);
  assert.ok(names.includes('rucola'), `missing 'rucola'`);
  assert.ok(names.includes('groentebouillon'), `missing 'groentebouillon'`);
});

test('parses quantity + unit from name_with_quantity', () => {
  const rijst = parsed.ingredients.find((i) => i.name === 'risottorijst');
  assert.ok(rijst, 'risottorijst not found');
  assert.equal(rijst.quantity, 150);
  assert.equal(rijst.unit.toLowerCase(), 'g');

  const bouillon = parsed.ingredients.find((i) => i.name === 'groentebouillon');
  assert.ok(bouillon);
  assert.equal(bouillon.quantity, 500);
  assert.equal(bouillon.unit.toLowerCase(), 'ml');
});

test('appends assumed_ingredients (pantry items)', () => {
  const names = parsed.ingredients.map((i) => i.name);
  assert.ok(
    names.includes('olijfolie'),
    `'olijfolie' from assumed_ingredients missing; got ${JSON.stringify(names)}`,
  );
  assert.ok(names.includes('peper en zout'));
});

test('extracts all 4 steps in order', () => {
  assert.equal(parsed.steps.length, 4, `expected 4 steps, got ${parsed.steps.length}`);
  assert.ok(
    parsed.steps[0].toLowerCase().includes('venkel'),
    `step 1 should mention venkel, got: ${parsed.steps[0]}`,
  );
  assert.ok(
    parsed.steps[1].toLowerCase().includes('risotto'),
    `step 2 should mention risotto, got: ${parsed.steps[1]}`,
  );
  assert.ok(
    parsed.steps[3].toLowerCase().includes('serveren') ||
      parsed.steps[3].toLowerCase().includes('borden'),
    `step 4 should describe serving, got: ${parsed.steps[3]}`,
  );
});

test('extracts cooking_time as duration', () => {
  assert.equal(parsed.duration, 35);
});

test('extracts image.large as imageUrl', () => {
  assert.equal(
    parsed.imageUrl,
    'https://img.marleyspoon.com/recipes/449816/large.jpg',
  );
});

test('sourceUrl matches the input URL', () => {
  assert.equal(parsed.sourceUrl, URL);
});

test('does not falsely claim Marley Spoon data on unrelated pages', () => {
  // The page has no `name_with_subtitle` signature; the Marley Spoon path
  // must return null so the heuristic fallback takes over (or we throw).
  const noMS =
    '<html><body><h1>Cookies</h1><ul><li>flour</li><li>sugar</li></ul></body></html>';
  const out = (() => {
    try {
      return parseRecipeFromHtml(noMS, URL);
    } catch {
      return null;
    }
  })();
  // Either no recipe found, or a heuristic result that didn't pick up Marley
  // Spoon-shaped data (no cooking_time-derived duration, no .marleyspoon image).
  if (out) {
    assert.equal(out.duration, undefined, 'should not have a duration from this fixture');
  }
});

test('falls back gracefully when name_with_subtitle is present but blob is invalid', () => {
  // Signature appears inside a comment / non-JSON context — extractor should
  // not crash; the heuristic fallback throws since there's no recipe.
  const noisy =
    '<html><body><!-- "name_with_subtitle": fragment, not JSON --></body></html>';
  assert.throws(() => parseRecipeFromHtml(noisy, URL));
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
