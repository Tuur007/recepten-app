/**
 * parseTimeFromStep.test.mjs — unit tests for the recipe-step time detector.
 * Same pattern as extractor.test.mjs: pure function, no FS, runs under tsx.
 */

import { strict as assert } from 'node:assert';

const { findTimesInStep, formatDuration } = await import(
  '../V0.1.2/utils/parseTimeFromStep.ts'
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

console.log('\n══════════════════════════════════════════════');
console.log(' parseTimeFromStep');
console.log('══════════════════════════════════════════════\n');

test('detects "10 minuten"', () => {
  const m = findTimesInStep('Laat 10 minuten sudderen.');
  assert.equal(m.length, 1);
  assert.equal(m[0].seconds, 600);
  assert.equal(m[0].text, '10 minuten');
});

test('detects "10 min" and "10m" forms', () => {
  assert.equal(findTimesInStep('bak 10 min').pop().seconds, 600);
  assert.equal(findTimesInStep('bak 10min').pop().seconds, 600);
  assert.equal(findTimesInStep('bak 10m').pop().seconds, 600);
});

test('detects "1 uur" / "1u" / "1h"', () => {
  assert.equal(findTimesInStep('laat 1 uur rusten').pop().seconds, 3600);
  assert.equal(findTimesInStep('rust 1u').pop().seconds, 3600);
  assert.equal(findTimesInStep('rust 1h').pop().seconds, 3600);
});

test('detects "30 seconden" / "30 sec" / "30s"', () => {
  assert.equal(findTimesInStep('roer 30 seconden').pop().seconds, 30);
  assert.equal(findTimesInStep('roer 30 sec').pop().seconds, 30);
  assert.equal(findTimesInStep('roer 30s').pop().seconds, 30);
});

test('handles fractional values (1,5 uur)', () => {
  assert.equal(findTimesInStep('kook 1,5 uur').pop().seconds, 5400);
  assert.equal(findTimesInStep('kook 1.5 uur').pop().seconds, 5400);
});

test('range "10-15 minuten" picks upper bound', () => {
  const m = findTimesInStep('bak 10-15 minuten');
  assert.equal(m.length, 1);
  assert.equal(m[0].seconds, 15 * 60);
});

test('multiple times in one step', () => {
  const m = findTimesInStep('Bak 5 min, daarna 20 minuten in de oven.');
  assert.equal(m.length, 2);
  assert.equal(m[0].seconds, 300);
  assert.equal(m[1].seconds, 1200);
});

test('ignores random "m" in words like "men" or "milliliter"', () => {
  const m = findTimesInStep('men neemt 200 milliliter water');
  assert.equal(m.length, 0, `unexpected matches: ${JSON.stringify(m)}`);
});

test('ignores random "s" in words like "snijden"', () => {
  const m = findTimesInStep('snijden in dunne plakjes');
  assert.equal(m.length, 0);
});

test('returns empty array on empty input', () => {
  assert.deepEqual(findTimesInStep(''), []);
  assert.deepEqual(findTimesInStep('geen tijden hier'), []);
});

test('start/end indices point at the original text', () => {
  const text = 'Laat 10 minuten sudderen.';
  const [m] = findTimesInStep(text);
  assert.equal(text.slice(m.start, m.end), '10 minuten');
});

test('English aliases work too', () => {
  assert.equal(findTimesInStep('simmer for 20 minutes').pop().seconds, 1200);
  assert.equal(findTimesInStep('rest 1 hour').pop().seconds, 3600);
});

console.log('\n══════════════════════════════════════════════');
console.log(' formatDuration');
console.log('══════════════════════════════════════════════\n');

test('formats < 1h as MM:SS', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(5), '00:05');
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(599), '09:59');
});

test('formats >= 1h as H:MM:SS', () => {
  assert.equal(formatDuration(3600), '1:00:00');
  assert.equal(formatDuration(3725), '1:02:05');
});

test('clamps negatives to 00:00', () => {
  assert.equal(formatDuration(-1), '00:00');
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
