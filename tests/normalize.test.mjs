/**
 * normalize.test.mjs — unit tests voor normalizeUrl en inferCategoryFromName
 * in V0.1.2/utils/normalize.ts, plus randomToken in V0.1.2/utils/id.ts.
 */

import { strict as assert } from 'node:assert';

const { normalizeUrl, inferCategoryFromName } = await import(
  '../V0.1.2/utils/normalize.ts'
);
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
console.log(' normalizeUrl');
console.log('══════════════════════════════════════════════\n');

test('lege string blijft leeg', () => {
  assert.equal(normalizeUrl(''), '');
});

test('lowercaset protocol + host', () => {
  assert.equal(
    normalizeUrl('HTTPS://Example.COM/path'),
    'https://example.com/path',
  );
});

test('trailing slash wordt verwijderd', () => {
  assert.equal(
    normalizeUrl('https://example.com/recipe/'),
    'https://example.com/recipe',
  );
});

test('root-pad zonder trailing slash blijft leeg', () => {
  assert.equal(normalizeUrl('https://example.com/'), 'https://example.com');
});

test('http → http blijft (geen agressieve https-upgrade)', () => {
  assert.equal(normalizeUrl('http://example.com/r'), 'http://example.com/r');
});

test('twee URLs met case-verschil zijn gelijk na normalisatie', () => {
  assert.equal(
    normalizeUrl('https://www.AH.nl/Recepten/123/'),
    normalizeUrl('https://www.ah.nl/Recepten/123'),
  );
});

test('pad behoudt case (gevoelig voor /Recepten vs /recepten)', () => {
  assert.equal(
    normalizeUrl('https://example.com/Recipe'),
    'https://example.com/Recipe',
  );
});

test('query string blijft behouden', () => {
  assert.equal(
    normalizeUrl('https://example.com/recipe?id=1'),
    'https://example.com/recipe?id=1',
  );
});

test('ongeldige URL valt terug op lowercase + trim', () => {
  assert.equal(normalizeUrl('  Not a URL/  '), 'not a url');
});

console.log('\n══════════════════════════════════════════════');
console.log(' inferCategoryFromName');
console.log('══════════════════════════════════════════════\n');

test('"kipfilet" → Vlees', () => {
  assert.equal(inferCategoryFromName('kipfilet'), 'Vlees');
});

test('"Volle melk" → Zuivel (case-insensitive)', () => {
  assert.equal(inferCategoryFromName('Volle melk'), 'Zuivel');
});

test('"verse appel" → Fruit', () => {
  assert.equal(inferCategoryFromName('verse appel'), 'Fruit');
});

test('"tomaat" → Groente', () => {
  assert.equal(inferCategoryFromName('tomaat'), 'Groente');
});

test('"vers brood" → Bakkerij', () => {
  assert.equal(inferCategoryFromName('vers brood'), 'Bakkerij');
});

test('"diepvries pizza" → Diepvries', () => {
  assert.equal(inferCategoryFromName('diepvries pizza'), 'Diepvries');
});

test('"rode wijn" → Dranken', () => {
  assert.equal(inferCategoryFromName('rode wijn'), 'Dranken');
});

test('"chips" → Snacks', () => {
  assert.equal(inferCategoryFromName('chips'), 'Snacks');
});

test('onbekend item → lege string (eerlijk, geen valse "Overig")', () => {
  assert.equal(inferCategoryFromName('xyz quux abracadabra'), '');
});

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
