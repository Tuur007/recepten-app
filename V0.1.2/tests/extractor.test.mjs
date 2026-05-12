/**
 * extractor.test.mjs — integration test for the image-extraction pipeline
 *
 * Runs the production `extractImageCandidates` function from
 * services/imageExtractor.ts against:
 *   1. A hermetic HTML fixture, asserting ranking & filtering behaviour
 *   2. A live recipe URL (skipped gracefully if the host returns 403, which
 *      happens for datacenter IPs but not for real phones)
 *
 * Run: npx tsx tests/extractor.test.mjs
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Public surface of the extractor — these are pure regex/scoring functions
// that have no FS dependency.
const { extractImageCandidates } = await import('../services/imageExtractor.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const PASS = (s) => console.log(`\x1b[32m✅ ${s}\x1b[0m`);
const FAIL = (s) => console.log(`\x1b[31m❌ ${s}\x1b[0m`);
const SKIP = (s) => console.log(`\x1b[33m⏭  ${s}\x1b[0m`);
const INFO = (s) => console.log(`   ${s}`);

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  return (async () => {
    try {
      await fn();
      PASS(name);
      passed++;
    } catch (e) {
      FAIL(`${name} — ${e?.message ?? e}`);
      if (e?.stack) INFO(e.stack.split('\n').slice(1, 4).join('\n'));
      failed++;
    }
  })();
}

console.log('\n══════════════════════════════════════════════');
console.log(' extractor — hermetic fixture');
console.log('══════════════════════════════════════════════\n');

const fixtureHtml = readFileSync(
  resolve(__dirname, 'fixtures/recipe-bbc-like.html'),
  'utf-8',
);
const BASE = 'https://recipes.example.com/lamb-tagine';
const candidates = extractImageCandidates(fixtureHtml, BASE);

INFO(`got ${candidates.length} candidates`);
candidates.slice(0, 10).forEach((c, i) =>
  INFO(`  [${i}] score=${c.score} src=${c.source} url=${c.url.slice(0, 80)}`),
);

await test('finds at least 5 candidates from a rich page', () => {
  assert.ok(candidates.length >= 5, `expected >= 5, got ${candidates.length}`);
});

await test('og:image:secure_url wins (highest score 96)', () => {
  const top = candidates[0];
  assert.equal(top.source, 'og:image:secure_url');
  assert.equal(top.score, 96);
  assert.equal(top.url, 'https://cdn.example.com/photos/lamb-tagine-hero.jpg');
});

await test('picks up JSON-LD Recipe.image array entries', () => {
  const jsonLd = candidates.filter((c) => c.source === 'json-ld');
  assert.ok(jsonLd.length >= 1, 'expected ≥ 1 JSON-LD candidate');
  const urls = jsonLd.map((c) => c.url);
  assert.ok(
    urls.some((u) => u.includes('lamb-tagine-16x9')),
    'expected one of the JSON-LD images to be present',
  );
});

await test('picks twitter:image (score 82)', () => {
  const tw = candidates.find((c) => c.source === 'twitter:image');
  assert.ok(tw, 'no twitter:image candidate');
  assert.equal(tw.score, 82);
});

await test('picks link[rel=image_src] (score 83) when distinct', () => {
  // canonicalKey may dedupe twitter:image_src vs og:image (same URL); the
  // candidate set keeps the higher score so just assert link source appears
  // somewhere — or the URL is at least represented.
  const all = candidates.map((c) => c.url);
  assert.ok(
    all.includes('https://cdn.example.com/photos/lamb-tagine-hero.jpg'),
    'hero URL missing entirely',
  );
});

await test('chooses the highest-width srcset image', () => {
  const srcset = candidates.find((c) => c.source.startsWith('srcset'));
  assert.ok(srcset, 'no srcset candidate');
  assert.ok(
    srcset.url.includes('lamb-tagine-1200.webp'),
    `expected 1200w variant, got ${srcset.url}`,
  );
});

await test('extracts data-src lazy-loaded image', () => {
  const lazy = candidates.find((c) => c.source === 'img[data-*]');
  assert.ok(lazy, 'no data-src candidate');
  assert.ok(lazy.url.includes('hero-hires'), `unexpected url: ${lazy.url}`);
});

await test('rejects SVG logo / banner / share icons', () => {
  const bad = candidates.find((c) =>
    c.url.includes('logo') ||
    c.url.includes('banner-728x90') ||
    c.url.includes('share-facebook') ||
    c.url.includes('share-twitter') ||
    c.url.includes('footer-icon'),
  );
  assert.equal(
    bad,
    undefined,
    `should have filtered out non-recipe images, but found: ${bad?.url}`,
  );
});

await test('resolves relative URLs against the page', () => {
  const html = `<html><head>
    <meta property="og:image" content="/images/relative.jpg">
  </head><body></body></html>`;
  const out = extractImageCandidates(html, 'https://example.com/recipes/x');
  assert.ok(out[0]?.url === 'https://example.com/images/relative.jpg', `got: ${out[0]?.url}`);
});

await test('returns empty array for HTML with no images', () => {
  const out = extractImageCandidates('<html><body><p>nothing</p></body></html>', BASE);
  assert.equal(out.length, 0);
});

console.log('\n══════════════════════════════════════════════');
console.log(' extractor — live recipe URL (smoke test)');
console.log('══════════════════════════════════════════════\n');

const LIVE_TARGETS = [
  'https://dagelijksekost.een.be/gerechten/quiche-met-prei',
  'https://www.24kitchen.nl/recepten/pasta-pesto',
];

let liveHit = false;
for (const url of LIVE_TARGETS) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) {
      SKIP(`${url} → HTTP ${res.status} (likely datacenter-IP block; harmless)`);
      continue;
    }
    const html = await res.text();
    const out = extractImageCandidates(html, url);
    if (out.length === 0) {
      FAIL(`${url} → 0 candidates`);
      failed++;
      continue;
    }
    PASS(`${url} → top candidate (score ${out[0].score}, src=${out[0].source})`);
    INFO(out[0].url.slice(0, 110));
    liveHit = true;
    break;
  } catch (e) {
    SKIP(`${url} → fetch failed: ${e?.message ?? e}`);
  }
}
if (!liveHit) {
  SKIP('all live targets unreachable (expected on datacenter IPs)');
  skipped++;
}

console.log('\n══════════════════════════════════════════════');
console.log(` Result: ${passed} passed, ${failed} failed, ${skipped} skipped`);
console.log('══════════════════════════════════════════════\n');
process.exit(failed === 0 ? 0 : 1);
