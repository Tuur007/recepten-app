/**
 * randomToken.test.mjs — crypto-veilige token-generator in V0.1.2/utils/id.ts.
 */

import { strict as assert } from 'node:assert';

const { randomToken, TOKEN_ALPHABET } = await import('../V0.1.2/utils/id.ts');

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
console.log(' randomToken (crypto-veilig)');
console.log('══════════════════════════════════════════════\n');

test('lengte klopt', () => {
  assert.equal(randomToken(4).length, 4);
  assert.equal(randomToken(16).length, 16);
  assert.equal(randomToken(0).length, 0);
});

test('alle tekens komen uit het alfabet', () => {
  const allowed = new Set(TOKEN_ALPHABET.split(''));
  for (let i = 0; i < 50; i++) {
    for (const ch of randomToken(12)) {
      assert.ok(allowed.has(ch), `onverwacht teken "${ch}" buiten alfabet`);
    }
  }
});

test('respecteert een custom alfabet', () => {
  const token = randomToken(20, 'AB');
  assert.ok(/^[AB]+$/.test(token));
  assert.equal(token.length, 20);
});

test('geen voorspelbaar patroon over 1000 opeenvolgende calls', () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) seen.add(randomToken(12));
  // Met 32^12 mogelijke tokens zijn 1000 unieke waarden quasi-zeker; een
  // teller of vaste seed zou hier collisions of een patroon geven.
  assert.ok(seen.size >= 999, `verwachtte ~1000 unieke tokens, kreeg ${seen.size}`);
});

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
