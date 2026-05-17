/**
 * recipeParser.test.mjs — unit tests for recipe parser safety + extraction.
 * Run: cd V0.1.2 && npx tsx ../tests/recipeParser.test.mjs
 */

import { strict as assert } from 'node:assert';

const mod = await import('../V0.1.2/services/recipeParser.ts');

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
    failed++;
  }
}

console.log('\n══════════════════════════════════════════════');
console.log(' recipeParser — SSRF / URL safety');
console.log('══════════════════════════════════════════════\n');

await test('rejects private IP 127.0.0.1', async () => {
  await assert.rejects(
    () => mod.parseRecipeFromUrl('http://127.0.0.1/recipe'),
    /Interne netwerk/,
  );
});

await test('rejects private IP 192.168.1.1', async () => {
  await assert.rejects(
    () => mod.parseRecipeFromUrl('http://192.168.1.1/foo'),
    /Interne netwerk/,
  );
});

await test('rejects localhost', async () => {
  await assert.rejects(
    () => mod.parseRecipeFromUrl('http://localhost:8080/x'),
    /Interne netwerk/,
  );
});

await test('rejects file:// scheme', async () => {
  await assert.rejects(
    () => mod.parseRecipeFromUrl('file:///etc/passwd'),
    /Alleen http/,
  );
});

await test('rejects invalid URL', async () => {
  await assert.rejects(() => mod.parseRecipeFromUrl('not a url'), /Ongeldige URL/);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
