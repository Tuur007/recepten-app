/**
 * debug-colruyt.mjs — run this on your local machine (Node 18+):
 *   node debug-colruyt.mjs
 *
 * What it does:
 *   Step 1  Fetch the Colruyt recipe page HTML with real browser headers
 *   Step 2  Save full HTML to ./colruyt-debug.html so you can inspect it
 *   Step 3  Extract every possible image signal (og, twitter, json-ld,
 *           __NUXT_DATA__, window.__NUXT__, img tags, srcset, data-src)
 *   Step 4  Try to download each candidate as binary, validate content-type,
 *           check file size, save to ./colruyt-image.<ext>
 *   Step 5  Print a final verdict: which URL worked, file size, path
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = 'https://www.colruyt.be/nl/recepten/risotto-met-zalm-en-asperges';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const PASS = (s) => `\x1b[32m✅ ${s}\x1b[0m`;
const FAIL = (s) => `\x1b[31m❌ ${s}\x1b[0m`;
const INFO = (s) => `\x1b[33m   ${s}\x1b[0m`;

// ─── Step 1: Fetch HTML ───────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════');
console.log(' STEP 1 — Fetch HTML');
console.log('════════════════════════════════════════════════════════════');
console.log(INFO(`URL: ${TARGET}`));

const ctrl = new AbortController();
setTimeout(() => ctrl.abort(), 20_000);

let html, finalUrl;
try {
  const r = await fetch(TARGET, {
    signal: ctrl.signal,
    redirect: 'follow',
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
  });
  finalUrl = r.url;
  console.log(r.ok ? PASS(`HTTP ${r.status}`) : FAIL(`HTTP ${r.status}`));
  console.log(INFO(`Final URL: ${finalUrl}`));
  console.log(INFO(`Content-Type: ${r.headers.get('content-type')}`));
  if (!r.ok) { console.log(FAIL('Cannot continue — HTTP error')); process.exit(1); }
  html = await r.text();
  console.log(PASS(`HTML fetched: ${html.length} chars`));
} catch (err) {
  console.log(FAIL(`Fetch error: ${err.message}`));
  process.exit(1);
}

// ─── Step 2: Save HTML to file ────────────────────────────────────────────────

const htmlPath = path.join(__dirname, 'colruyt-debug.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log(PASS(`HTML saved to ${htmlPath}`));

// ─── Step 3: Extract every image signal ──────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════');
console.log(' STEP 3 — Extract image signals');
console.log('════════════════════════════════════════════════════════════');

function extractMetaUrl(html, key, attr) {
  const tagRe = new RegExp(`<meta\\s[^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(tagRe)?.[0];
  if (!tag) return null;
  const idx = tag.search(/\bcontent\s*=/i);
  if (idx === -1) return null;
  const after = tag.slice(idx).replace(/^content\s*=\s*/i, '');
  const delim = after[0];
  if (delim === '"') { const end = after.indexOf('"', 1); return end === -1 ? null : after.slice(1, end) || null; }
  if (delim === "'") { const inner = after.slice(1); const close = inner.search(/'(?=\s|>|\/)/); return close === -1 ? inner.replace(/[>].*/, '').trim() || null : inner.slice(0, close) || null; }
  return null;
}

function extractJsonLdImages(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data.flatMap(extractJsonLdImages);
  const out = [];
  const img = data['image'];
  if (typeof img === 'string') out.push(img);
  else if (Array.isArray(img)) {
    for (const i of img) {
      if (typeof i === 'string') out.push(i);
      else if (i && typeof i === 'object') {
        if (typeof i.url === 'string') out.push(i.url);
        if (typeof i.contentUrl === 'string') out.push(i.contentUrl);
      }
    }
  } else if (img && typeof img === 'object') {
    if (typeof img.url === 'string') out.push(img.url);
    if (typeof img.contentUrl === 'string') out.push(img.contentUrl);
  }
  if (Array.isArray(data['@graph'])) out.push(...data['@graph'].flatMap(extractJsonLdImages));
  return out;
}

function extractNestedImages(obj, depth = 0, pathStr = 'root') {
  if (depth > 15 || !obj || typeof obj !== 'object') return [];
  const results = [];
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) results.push(...extractNestedImages(obj[i], depth + 1, `${pathStr}[${i}]`));
    return results;
  }
  const imageKeys = new Set(['image','imageUrl','img','photo','thumbnail','src','imageUri','coverImage','heroImage','picture','imageHires','originalImage','mainImage','poster','imageSource','imageLink','photoUrl']);
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      if (imageKeys.has(key) && (val.startsWith('http') || val.startsWith('/'))) {
        results.push({ url: val, path: `${pathStr}.${key}` });
      }
    } else if (val && typeof val === 'object') {
      results.push(...extractNestedImages(val, depth + 1, `${pathStr}.${key}`));
    }
  }
  return results;
}

function normalizeUrl(url, base) {
  url = url.trim();
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) { try { return new URL(base).origin + url; } catch { return url; } }
  if (url.startsWith('http')) return url;
  try { return new URL(url, base).toString(); } catch { return url; }
}

const candidates = [];
const add = (rawUrl, score, source) => {
  if (!rawUrl) return;
  const url = normalizeUrl(rawUrl, finalUrl);
  if (url && url.startsWith('http')) candidates.push({ url, score, source, rawUrl });
};

// og:image:secure_url
const ogSecure = extractMetaUrl(html, 'og:image:secure_url', 'property');
console.log(`\nog:image:secure_url  → ${ogSecure ?? '(not found)'}`);
if (ogSecure) add(ogSecure, 96, 'og:image:secure_url');

// og:image
const ogUrl = extractMetaUrl(html, 'og:image', 'property');
console.log(`og:image             → ${ogUrl ?? '(not found)'}`);
if (ogUrl) add(ogUrl, 95, 'og:image');

// twitter:image
const twUrl = extractMetaUrl(html, 'twitter:image', 'name');
console.log(`twitter:image        → ${twUrl ?? '(not found)'}`);
if (twUrl) add(twUrl, 82, 'twitter:image');

// JSON-LD blocks
const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
console.log(`\nJSON-LD blocks: ${jsonLdBlocks.length}`);
for (let i = 0; i < jsonLdBlocks.length; i++) {
  try {
    const data = JSON.parse(jsonLdBlocks[i][1].trim());
    const imgs = extractJsonLdImages(data);
    console.log(`  Block ${i}: type=${data['@type'] ?? '?'}, images=${imgs.length}${imgs.length ? ' → ' + imgs[0] : ''}`);
    imgs.forEach(u => add(u, 90, `json-ld[${i}]`));
  } catch (e) {
    console.log(`  Block ${i}: PARSE ERROR — ${e.message}`);
    console.log(`  Raw (first 200): ${jsonLdBlocks[i][1].trim().slice(0, 200)}`);
  }
}

// __NEXT_DATA__
const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
console.log(`\n__NEXT_DATA__: ${nextDataMatch ? 'FOUND (' + nextDataMatch[1].length + ' chars)' : 'not found'}`);
if (nextDataMatch) {
  try {
    const imgs = extractNestedImages(JSON.parse(nextDataMatch[1]));
    console.log(`  → ${imgs.length} image paths found`);
    imgs.slice(0, 5).forEach(({ url, path }) => console.log(`    depth-path: ${path} → ${url}`));
    imgs.forEach(({ url }) => add(url, 88, '__NEXT_DATA__'));
  } catch (e) { console.log(`  PARSE ERROR: ${e.message}`); }
}

// __NUXT_DATA__ (Nuxt 3)
const nuxt3Match = html.match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
console.log(`__NUXT_DATA__:  ${nuxt3Match ? 'FOUND (' + nuxt3Match[1].length + ' chars)' : 'not found'}`);
if (nuxt3Match) {
  try {
    const imgs = extractNestedImages(JSON.parse(nuxt3Match[1]));
    console.log(`  → ${imgs.length} image paths found`);
    imgs.slice(0, 5).forEach(({ url, path }) => console.log(`    ${path} → ${url}`));
    imgs.forEach(({ url }) => add(url, 87, '__NUXT_DATA__'));
  } catch (e) { console.log(`  PARSE ERROR: ${e.message}`); }
}

// window.__NUXT__ (Nuxt 2, semicolon optional)
const nuxt2Match = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\})\s*(?:;?\s*<\/script>|;\s*(?:window\.|$))/i);
console.log(`window.__NUXT__: ${nuxt2Match ? 'FOUND' : 'not found'}`);
if (nuxt2Match) {
  try {
    const imgs = extractNestedImages(JSON.parse(nuxt2Match[1]));
    console.log(`  → ${imgs.length} image paths found`);
    imgs.slice(0, 3).forEach(({ url, path }) => console.log(`    ${path} → ${url}`));
    imgs.forEach(({ url }) => add(url, 85, '__NUXT__'));
  } catch (e) { console.log(`  PARSE ERROR: ${e.message}`); }
}

// window.__INITIAL_STATE__ (various SSR frameworks)
const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*(?:;?\s*<\/script>|;\s*(?:window\.|$))/i);
console.log(`window.__INITIAL_STATE__: ${initialStateMatch ? 'FOUND' : 'not found'}`);
if (initialStateMatch) {
  try {
    const imgs = extractNestedImages(JSON.parse(initialStateMatch[1]));
    console.log(`  → ${imgs.length} image paths found`);
    imgs.slice(0, 3).forEach(({ url, path }) => console.log(`    ${path} → ${url}`));
    imgs.forEach(({ url }) => add(url, 84, '__INITIAL_STATE__'));
  } catch (e) { console.log(`  PARSE ERROR: ${e.message}`); }
}

// ALL inline script blocks containing "image"
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([^<]*image[^<]*)<\/script>/gi)];
console.log(`\nInline scripts containing "image": ${inlineScripts.length}`);
inlineScripts.slice(0, 3).forEach((m, i) => {
  console.log(`  Script ${i} (first 300 chars): ${m[1].trim().slice(0, 300)}`);
});

// img tags (all of them)
const imgTags = [...html.matchAll(/<img[^>]+>/gi)];
console.log(`\n<img> tags: ${imgTags.length}`);
for (const m of imgTags.slice(0, 10)) {
  const src = m[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const dataSrc = m[0].match(/\bdata-(?:src|image|lazy-src|original)=["']([^"']+)["']/i)?.[1];
  const srcset = m[0].match(/\bsrcset=["']([^"']+)["']/i)?.[1]?.split(',')[0]?.trim()?.split(/\s+/)[0];
  const klass = m[0].match(/\bclass=["']([^"']{0,60})["']/i)?.[1];
  console.log(`  class="${klass ?? ''}" src=${src ?? '-'} data-src=${dataSrc ?? '-'} srcset=${srcset ?? '-'}`);
  if (src) add(src, /recipe|hero|featured|food|meal|gerecht|recept/.test(m[0].toLowerCase()) ? 70 : 35, 'img[src]');
  if (dataSrc) add(dataSrc, /recipe|hero|featured/.test(m[0].toLowerCase()) ? 72 : 38, 'img[data-src]');
  if (srcset) add(srcset, 37, 'srcset');
}

// All unique "https://..." strings containing "colruyt" or matching image CDN patterns
const allUrls = [...html.matchAll(/"(https?:\/\/[^"]{10,300})"/g)].map(m => m[1]);
const cdnUrls = allUrls.filter(u => /(colruyt|\.jpg|\.png|\.webp|\.jpeg|images?\/|recipe.*image|image.*recipe)/i.test(u));
const uniqueCdnUrls = [...new Set(cdnUrls)];
console.log(`\nAll CDN/image-like URLs in HTML: ${uniqueCdnUrls.length}`);
uniqueCdnUrls.slice(0, 10).forEach((u, i) => {
  console.log(`  [${i}] ${u.slice(0, 120)}`);
  add(u, 50, 'url-in-html');
});

// Final candidate list
console.log(`\n════════════════════════════════════════════════════════════`);
console.log(` STEP 3 RESULT — ${candidates.length} candidates`);
console.log(`════════════════════════════════════════════════════════════`);
const unique = [];
const seen = new Set();
for (const c of candidates.sort((a, b) => b.score - a.score)) {
  const key = c.url.split('?')[0];
  if (!seen.has(key)) { seen.add(key); unique.push(c); }
}
unique.slice(0, 12).forEach((c, i) =>
  console.log(`  [${i}] score=${c.score} src=${c.source.padEnd(18)} ${c.url.slice(0, 100)}`),
);

if (unique.length === 0) {
  console.log(FAIL('Zero candidates — no image URLs found at all'));
  console.log('\nHTML snippet (head, first 2000 chars):');
  console.log(html.slice(0, 2000));
  process.exit(1);
}

// ─── Step 4: Download image binary ───────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════');
console.log(' STEP 4 — Download image binary');
console.log('════════════════════════════════════════════════════════════');

async function tryDownload(imgUrl, referer, label) {
  console.log(`\n  → [${label}] ${imgUrl.slice(0, 100)}`);
  const ctrl2 = new AbortController();
  const timer = setTimeout(() => ctrl2.abort(), 20_000);
  try {
    const r = await fetch(imgUrl, {
      signal: ctrl2.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        'Accept': 'image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8',
        'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
        'Referer': referer,
        'Origin': new URL(referer).origin,
      },
    });
    clearTimeout(timer);
    const ct = r.headers.get('content-type') ?? '';
    console.log(`     HTTP ${r.status} | content-type: ${ct} | final: ${r.url}`);

    if (!r.ok) {
      console.log(FAIL(`     Non-200 status: ${r.status}`));
      return null;
    }
    if (ct.toLowerCase().includes('text/html')) {
      console.log(FAIL('     Got HTML instead of image (CDN error page / auth redirect)'));
      const text = await r.text();
      console.log(`     HTML snippet: ${text.slice(0, 200)}`);
      return null;
    }

    const buf = await r.arrayBuffer();
    const bytes = buf.byteLength;
    console.log(`     Buffer size: ${bytes} bytes`);

    if (bytes < 2048) {
      console.log(FAIL(`     File too small (${bytes} bytes) — likely a placeholder`));
      return null;
    }

    // Determine extension from content-type
    let ext = 'jpg';
    if (ct.includes('png')) ext = 'png';
    else if (ct.includes('webp')) ext = 'webp';
    else if (ct.includes('gif')) ext = 'gif';
    else if (ct.includes('avif')) ext = 'avif';
    else { const m = imgUrl.match(/\.(jpg|jpeg|png|webp|gif|avif)/i); if (m) ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase(); }

    const outPath = path.join(__dirname, `colruyt-image.${ext}`);
    fs.writeFileSync(outPath, Buffer.from(buf));

    // Verify
    const stat = fs.statSync(outPath);
    console.log(PASS(`     Saved: ${outPath} (${stat.size} bytes, ext=${ext})`));

    // Read first 4 bytes to verify it's really an image (magic bytes)
    const magic = Buffer.from(buf).slice(0, 4);
    const isJpeg = magic[0] === 0xFF && magic[1] === 0xD8;
    const isPng  = magic[0] === 0x89 && magic[1] === 0x50;
    const isWebp = magic.toString('ascii', 0, 4) === 'RIFF';
    const isGif  = magic.toString('ascii', 0, 3) === 'GIF';
    console.log(PASS(`     Magic bytes OK: jpeg=${isJpeg} png=${isPng} webp=${isWebp} gif=${isGif}`));

    return { path: outPath, bytes: stat.size, ext, url: imgUrl };
  } catch (err) {
    clearTimeout(timer);
    console.log(FAIL(`     Error: ${err.message}`));
    return null;
  }
}

let success = null;
for (let i = 0; i < Math.min(unique.length, 8); i++) {
  const result = await tryDownload(unique[i].url, finalUrl, `${i}:${unique[i].source}`);
  if (result) { success = result; break; }
}

// ─── Step 5: Verdict ─────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════');
console.log(' STEP 5 — Verdict');
console.log('════════════════════════════════════════════════════════════');

if (success) {
  console.log(PASS(`Image downloaded successfully!`));
  console.log(INFO(`URL:   ${success.url}`));
  console.log(INFO(`Path:  ${success.path}`));
  console.log(INFO(`Size:  ${success.bytes} bytes`));
  console.log(INFO(`Ext:   ${success.ext}`));
  console.log('\nThis URL should work in the React Native app too.');
  console.log('Check [ImageExtractor] logs in Expo console when importing.');
} else {
  console.log(FAIL('All candidates failed.'));
  console.log('\nAction: open colruyt-debug.html in your browser and run:');
  console.log("  document.querySelector('meta[property=\"og:image\"]')?.content");
  console.log("  JSON.parse(document.getElementById('__NUXT_DATA__')?.textContent ?? '{}')");
  console.log('\nAlso check if the page requires JavaScript rendering (no HTML images at all).');
}
