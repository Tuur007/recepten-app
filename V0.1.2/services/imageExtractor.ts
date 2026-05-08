/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * imageExtractor.ts
 *
 * Full pipeline with step-by-step logging.  Every decision is printed to the
 * Expo console under the [IE] tag so you can trace exactly where it fails.
 *
 * Extraction priority (highest first):
 *   96  og:image:secure_url
 *   95  og:image
 *   90  JSON-LD Recipe.image
 *   88  __NEXT_DATA__   (Next.js)
 *   87  __NUXT_DATA__   (Nuxt 3 — Colruyt, etc.)
 *   85  window.__NUXT__ (Nuxt 2)
 *   84  window.__INITIAL_STATE__
 *   83  <link rel="image_src">
 *   82  twitter:image / twitter:image:src
 *   80  microdata itemprop="image"
 *   72  img[data-src/data-image/data-lazy-src] with food keyword
 *   71  srcset best-width with food keyword
 *   70  img[src] with food keyword
 *   50  any CDN/image URL found in raw HTML text
 *   38  img[data-*] without food keyword
 *   37  srcset without food keyword
 *   35  img[src] without food keyword
 */

declare const __DEV__: boolean;

interface ImageCandidate {
  url: string;
  score: number;
  source: string;
}

// expo-file-system is a native module — load dynamically so the module works
// in environments where it is absent (web, tests).
let FS: typeof import('expo-file-system') | null = null;
try {
  FS = require('expo-file-system');
} catch {
  // Native module unavailable — download will fall back to fetch+ArrayBuffer.
}

function getImageDir(): string {
  return FS?.documentDirectory ? `${FS.documentDirectory}recipes_images` : '';
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function extractImageFromUrl(url: string): Promise<string | undefined> {
  log('━━━ extractImageFromUrl START', url);

  try {
    // ── Step 1: fetch page HTML ───────────────────────────────────────────────
    log('[1] fetching HTML…');
    let html: string;
    let finalUrl: string;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      let response: Response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
          },
        });
      } finally {
        clearTimeout(timer);
      }
      finalUrl = response.url || url;
      log(`[1] HTTP ${response.status} finalUrl=${finalUrl}`);
      if (!response.ok) {
        log('[1] FAIL — non-200, aborting');
        return undefined;
      }
      html = await response.text();
      log(`[1] HTML length=${html.length} chars`);
    } catch (err: unknown) {
      log('[1] FAIL — fetch error:', err instanceof Error ? err.message : err);
      return undefined;
    }

    // ── Step 2: extract candidates ────────────────────────────────────────────
    log('[2] extracting image candidates…');
    const candidates = extractImageCandidates(html, finalUrl);
    log(`[2] ${candidates.length} candidates found:`);
    candidates.slice(0, 10).forEach((c, i) =>
      log(`    [${i}] score=${c.score} src=${c.source} url=${c.url.slice(0, 90)}`),
    );

    if (candidates.length === 0) {
      log('[2] FAIL — no candidates found');
      return undefined;
    }

    // ── Step 3: try each candidate ────────────────────────────────────────────
    log('[3] attempting downloads…');
    for (let i = 0; i < Math.min(candidates.length, 8); i++) {
      const c = candidates[i];
      log(`[3.${i}] trying score=${c.score} src=${c.source} url=${c.url.slice(0, 90)}`);
      const result = await downloadWithRetry(c.url, finalUrl, 2);
      if (result) {
        log(`[3.${i}] SUCCESS → ${result}`);
        return result;
      }
      log(`[3.${i}] failed, next candidate`);
    }

    log('[3] FAIL — all candidates exhausted');
    return undefined;
  } catch (err: unknown) {
    log('UNEXPECTED ERROR:', err instanceof Error ? err.message : err);
    return undefined;
  }
}

// ─── Download with retry ──────────────────────────────────────────────────────

async function downloadWithRetry(
  imageUrl: string,
  referer: string,
  maxAttempts: number,
): Promise<string | undefined> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await downloadImage(imageUrl, referer, attempt);
    if (result) return result;
    if (attempt < maxAttempts) {
      log(`  retry ${attempt}/${maxAttempts}…`);
      await sleep(700 * attempt);
    }
  }
  return undefined;
}

// ─── Core download ────────────────────────────────────────────────────────────

async function downloadImage(
  imageUrl: string,
  referer: string,
  attempt: number,
): Promise<string | undefined> {
  const dir = getImageDir();
  const safeUrl = encodeImageUrl(imageUrl);
  const guessedExt = guessExtFromUrl(imageUrl);
  const filename = `recipe_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${guessedExt}`;
  const filepath = dir ? `${dir}/${filename}` : '';

  log(`  [dl attempt=${attempt}] url=${safeUrl.slice(0, 80)}`);
  log(`  [dl] referer=${referer.slice(0, 60)}`);
  log(`  [dl] target=${filepath}`);

  // Ensure directory exists
  if (FS && dir) {
    try {
      const dirInfo = await FS.getInfoAsync(dir);
      if (!dirInfo.exists) {
        log('  [dl] creating dir…');
        await FS.makeDirectoryAsync(dir, { intermediates: true });
      }
    } catch (err) {
      log('  [dl] mkdir error:', err instanceof Error ? err.message : err);
      return undefined;
    }
  }

  // ── Strategy A: FS.downloadAsync (native, best for RN) ───────────────────
  if (FS && dir) {
    try {
      log('  [dl] strategy=FS.downloadAsync');
      const downloadPromise = FS.downloadAsync(safeUrl, filepath, {
        headers: buildImageHeaders(referer),
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('download timeout 20s')), 20_000),
      );
      const result = await Promise.race([downloadPromise, timeoutPromise]);

      log(`  [dl] downloadAsync status=${result.status}`);
      const ct = getHeader(result.headers as Record<string, string>, 'content-type').toLowerCase();
      log(`  [dl] content-type="${ct}"`);

      if (result.status !== 200) {
        log(`  [dl] FAIL: status ${result.status}`);
        await safeDelete(filepath);
        // Fall through to strategy B
      } else if (ct && (ct.includes('text/html') || ct.includes('application/json'))) {
        log(`  [dl] FAIL: non-image content-type "${ct}"`);
        await safeDelete(filepath);
        // Fall through to strategy B
      } else {
        const info = await FS.getInfoAsync(filepath);
        if (!info.exists) {
          log('  [dl] FAIL: file missing after download');
          return undefined;
        }
        const size = (info as any).size ?? 0;
        log(`  [dl] file size=${size} bytes`);
        if (size < 2048) {
          log('  [dl] FAIL: too small (<2KB), placeholder');
          await safeDelete(filepath);
          return undefined;
        }
        // Rename to correct extension if content-type differs
        const actualExt = contentTypeToExt(ct) ?? guessedExt;
        if (actualExt !== guessedExt) {
          const corrected = filepath.slice(0, -guessedExt.length) + actualExt;
          try { await FS.moveAsync({ from: filepath, to: corrected }); return corrected; } catch { /* keep original */ }
        }
        log('  [dl] strategy A: SUCCESS');
        return filepath;
      }
    } catch (err: unknown) {
      log('  [dl] strategy A error:', err instanceof Error ? err.message : err);
      await safeDelete(filepath);
    }
  }

  // ── Strategy B: fetch + ArrayBuffer (fallback for Snack / failed A) ───────
  log('  [dl] strategy=fetch+ArrayBuffer');
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch(safeUrl, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: buildImageHeaders(referer),
      });
    } finally {
      clearTimeout(timer);
    }

    log(`  [dl] fetch status=${response.status} finalUrl=${response.url}`);
    const ct = (response.headers.get('content-type') ?? '').toLowerCase();
    log(`  [dl] content-type="${ct}"`);

    if (!response.ok) {
      log(`  [dl] FAIL: HTTP ${response.status}`);
      return undefined;
    }
    if (ct.includes('text/html')) {
      log('  [dl] FAIL: got HTML (CDN error page)');
      return undefined;
    }

    const buf = await response.arrayBuffer();
    const bytes = buf.byteLength;
    log(`  [dl] buffer size=${bytes} bytes`);

    if (bytes < 2048) {
      log('  [dl] FAIL: buffer too small (<2KB)');
      return undefined;
    }

    // Validate magic bytes
    const magic = new Uint8Array(buf.slice(0, 4));
    const isImage =
      (magic[0] === 0xFF && magic[1] === 0xD8) || // JPEG
      (magic[0] === 0x89 && magic[1] === 0x50) || // PNG
      (magic[0] === 0x52 && magic[1] === 0x49) || // WEBP (RIFF)
      (magic[0] === 0x47 && magic[1] === 0x49) || // GIF
      (magic[0] === 0x00 && magic[2] === 0x00);   // AVIF (ftyp)
    log(`  [dl] magic bytes: [${[...magic].join(',')}] isImage=${isImage}`);
    if (!isImage && ct && !ct.includes('image/') && !ct.includes('application/octet-stream')) {
      log('  [dl] FAIL: magic bytes do not look like an image');
      return undefined;
    }

    // Write file with FS if available, otherwise return data URI (fallback)
    if (FS && dir) {
      const actualExt = contentTypeToExt(ct) ?? guessedExt;
      const fbPath = `${dir}/recipe_${Date.now()}_fb.${actualExt}`;
      try {
        // expo-file-system has no writeArrayBuffer; use base64
        const b64 = arrayBufferToBase64(buf);
        await FS.writeAsStringAsync(fbPath, b64, { encoding: 'base64' });
        const info = await FS.getInfoAsync(fbPath);
        const savedSize = (info as any).size ?? 0;
        log(`  [dl] strategy B writeAsStringAsync: ${fbPath} (${savedSize} bytes)`);
        if (savedSize > 100) {
          log('  [dl] strategy B: SUCCESS');
          return fbPath;
        }
        await safeDelete(fbPath);
      } catch (writeErr) {
        log('  [dl] writeAsStringAsync error:', writeErr instanceof Error ? writeErr.message : writeErr);
      }
    }

    // If FS is unavailable (Expo Snack web), return data URI so the Image
    // component can still render it — not persisted but visible.
    const actualExt = contentTypeToExt(ct) ?? guessedExt;
    const mime = extToMime(actualExt);
    const b64 = arrayBufferToBase64(buf);
    const dataUri = `data:${mime};base64,${b64}`;
    log(`  [dl] strategy B (data URI fallback): length=${dataUri.length}`);
    return dataUri;
  } catch (err: unknown) {
    log('  [dl] strategy B error:', err instanceof Error ? err.message : err);
    return undefined;
  }
}

// ─── HTML image extraction ────────────────────────────────────────────────────

function extractImageCandidates(html: string, baseUrl: string): ImageCandidate[] {
  const candidates = new Map<string, ImageCandidate>();

  const add = (rawUrl: string, score: number, source: string) => {
    if (!rawUrl?.trim()) return;
    const resolved = normalizeUrl(rawUrl.trim(), baseUrl);
    if (!resolved || !isValidImageUrl(resolved)) return;
    const key = canonicalKey(resolved);
    if (!candidates.has(key)) candidates.set(key, { url: resolved, score, source });
  };

  // 1. og:image:secure_url
  const ogSecure = extractMetaUrl(html, 'og:image:secure_url', 'property');
  if (ogSecure) add(ogSecure, 96, 'og:image:secure_url');

  // 2. og:image
  const ogUrl = extractMetaUrl(html, 'og:image', 'property');
  if (ogUrl) add(ogUrl, 95, 'og:image');

  // 3. JSON-LD Recipe.image
  for (const block of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      extractJsonLdImages(JSON.parse(block[1].trim())).forEach((u) => add(u, 90, 'json-ld'));
    } catch { /* skip malformed JSON-LD */ }
  }

  // 4. Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      extractNestedImages(JSON.parse(nextDataMatch[1])).forEach((u) => add(u, 88, '__NEXT_DATA__'));
    } catch { /* skip */ }
  }

  // 5a. Nuxt 3 — <script id="__NUXT_DATA__" type="application/json">
  const nuxt3DataMatch = html.match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nuxt3DataMatch) {
    try {
      extractNestedImages(JSON.parse(nuxt3DataMatch[1])).forEach((u) => add(u, 87, '__NUXT_DATA__'));
    } catch { /* skip */ }
  }

  // 5b. Nuxt 2 — window.__NUXT__ = {...} (semicolon optional)
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\})\s*(?:;?\s*<\/script>|;\s*(?:window\.|$))/i);
  if (nuxtMatch) {
    try {
      extractNestedImages(JSON.parse(nuxtMatch[1])).forEach((u) => add(u, 85, '__NUXT__'));
    } catch { /* skip */ }
  }

  // 6. window.__INITIAL_STATE__
  const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*(?:;?\s*<\/script>|;\s*(?:window\.|$))/i);
  if (initialStateMatch) {
    try {
      extractNestedImages(JSON.parse(initialStateMatch[1])).forEach((u) => add(u, 84, '__INITIAL_STATE__'));
    } catch { /* skip */ }
  }

  // 7. <link rel="image_src">
  const linkImg = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);
  if (linkImg) add(linkImg[1], 83, 'link[image_src]');

  // 8. twitter:image
  const twUrl = extractMetaUrl(html, 'twitter:image', 'name');
  if (twUrl) add(twUrl, 82, 'twitter:image');
  const twSrc = extractMetaUrl(html, 'twitter:image:src', 'name');
  if (twSrc) add(twSrc, 82, 'twitter:image:src');

  // 9. Schema.org microdata itemprop="image"
  for (const m of html.matchAll(/itemprop=["']image["'][^>]+(?:content|src)=["']([^"']+)["']/gi)) {
    add(m[1], 80, 'microdata');
  }
  for (const m of html.matchAll(/(?:content|src)=["']([^"']+)["'][^>]+itemprop=["']image["']/gi)) {
    add(m[1], 80, 'microdata');
  }

  // 10. data-src / data-image / data-lazy-src / data-original
  for (const m of html.matchAll(/<img[^>]+data-(?:src|image|lazy-src|original)=["']([^"']+)["'][^>]*/gi)) {
    const food = /recipe|hero|featured|food|dish|meal|recept|gerecht/i.test(m[0]);
    add(m[1], food ? 72 : 38, 'img[data-*]');
  }

  // 11. srcset — best resolution (highest w descriptor)
  for (const m of html.matchAll(/<(?:img|source)[^>]+srcset=["']([^"']+)["'][^>]*/gi)) {
    const food = /recipe|hero|featured|food|dish|meal|recept|gerecht/i.test(m[0]);
    const parts = m[1].trim().split(',').map((s) => s.trim().split(/\s+/));
    let best: string | null = null;
    let bestW = 0;
    for (const [u, w] of parts) {
      if (!u) continue;
      const width = parseInt((w ?? '0').replace(/[^0-9]/g, '')) || 0;
      if (width > bestW || !best) { bestW = width; best = u; }
    }
    if (best) add(best, food ? 71 : 37, `srcset(${bestW}w)`);
  }

  // 12. Regular img[src]
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)) {
    const food = /recipe|hero|featured|food|dish|meal|recept|gerecht/i.test(m[0]);
    add(m[1], food ? 70 : 35, 'img[src]');
  }

  // 13. Any URL in raw HTML text that looks like a CDN image (catch-all)
  for (const m of html.matchAll(/"(https?:\/\/[^"]{10,300})"/g)) {
    const u = m[1];
    if (/(colruyt|\.jpg|\.jpeg|\.png|\.webp|\.avif)(\?|")/i.test(u + '"')) {
      add(u, 50, 'raw-html-url');
    }
  }

  const sorted = Array.from(candidates.values()).sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    log('NO_CANDIDATES — diagnostic dump:',
      'og:image=' + !!extractMetaUrl(html, 'og:image', 'property'),
      'json-ld-blocks=' + (html.match(/<script[^>]+application\/ld\+json/gi)?.length ?? 0),
      '__NEXT_DATA__=' + /<script[^>]+id=["']__NEXT_DATA__/.test(html),
      '__NUXT_DATA__=' + /<script[^>]+id=["']__NUXT_DATA__/.test(html),
      '__NUXT__=' + /window\.__NUXT__/.test(html),
      '__INITIAL_STATE__=' + /window\.__INITIAL_STATE__/.test(html),
      'img-count=' + (html.match(/<img\s/gi)?.length ?? 0),
    );
    log('HTML_HEAD:', html.slice(0, 800).replace(/\s+/g, ' '));
  }

  return sorted;
}

// ─── JSON-LD image extraction ─────────────────────────────────────────────────

function extractJsonLdImages(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data.flatMap(extractJsonLdImages);
  const obj = data as Record<string, unknown>;
  const out: string[] = [];
  const img = obj['image'];
  if (typeof img === 'string') out.push(img);
  else if (Array.isArray(img)) {
    for (const i of img) {
      if (typeof i === 'string') out.push(i);
      else if (i && typeof i === 'object') {
        const o = i as Record<string, unknown>;
        if (typeof o.url === 'string') out.push(o.url);
        if (typeof o.contentUrl === 'string') out.push(o.contentUrl);
      }
    }
  } else if (img && typeof img === 'object') {
    const o = img as Record<string, unknown>;
    if (typeof o.url === 'string') out.push(o.url);
    if (typeof o.contentUrl === 'string') out.push(o.contentUrl);
  }
  if (Array.isArray(obj['@graph'])) {
    out.push(...(obj['@graph'] as unknown[]).flatMap(extractJsonLdImages));
  }
  return out;
}

// ─── Nested JSON image walk ───────────────────────────────────────────────────

// Depth 15 covers AH's dehydratedState (depth 11) and other deep SSR blobs.
function extractNestedImages(obj: unknown, depth = 0): string[] {
  if (depth > 15 || !obj || typeof obj !== 'object') return [];
  const results: string[] = [];
  if (Array.isArray(obj)) {
    for (const item of obj) results.push(...extractNestedImages(item, depth + 1));
    return results;
  }
  const o = obj as Record<string, unknown>;
  const imageKeys = new Set([
    'image', 'imageUrl', 'img', 'photo', 'thumbnail', 'src',
    'imageUri', 'coverImage', 'heroImage', 'picture',
    'imageHires', 'originalImage', 'mainImage', 'poster',
    'imageSource', 'imageLink', 'photoUrl',
  ]);
  for (const key of Object.keys(o)) {
    const val = o[key];
    if (typeof val === 'string') {
      if (imageKeys.has(key) && (val.startsWith('http') || val.startsWith('/'))) {
        results.push(val);
      }
    } else if (val && typeof val === 'object') {
      results.push(...extractNestedImages(val, depth + 1));
    }
  }
  return results;
}

// ─── Meta tag extraction ──────────────────────────────────────────────────────

function extractMetaUrl(html: string, key: string, attr: string): string | null {
  const tagRe = new RegExp(`<meta\\s[^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(tagRe)?.[0];
  if (!tag) return null;
  const idx = tag.search(/\bcontent\s*=/i);
  if (idx === -1) return null;
  const after = tag.slice(idx).replace(/^content\s*=\s*/i, '');
  const delim = after[0];
  if (delim === '"') {
    const end = after.indexOf('"', 1);
    return end === -1 ? null : after.slice(1, end) || null;
  }
  if (delim === "'") {
    const inner = after.slice(1);
    const close = inner.search(/'(?=\s|>|\/)/);
    return close === -1 ? inner.replace(/[>].*/, '').trim() || null : inner.slice(0, close) || null;
  }
  return null;
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function normalizeUrl(url: string, baseUrl: string): string {
  url = url.trim();
  if (!url) return '';
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) {
    try { return new URL(baseUrl).origin + url; } catch { return url; }
  }
  if (url.startsWith('http')) return url;
  try { return new URL(url, baseUrl).toString(); } catch { return url; }
}

function canonicalKey(url: string): string {
  try { const u = new URL(url); return u.origin + u.pathname; } catch { return url.split('?')[0]; }
}

function isValidImageUrl(url: string): boolean {
  if (!url || url.includes('javascript:') || url.startsWith('data:')) return false;
  try {
    const { pathname, hostname } = new URL(url);
    // Known image extensions
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?|$)/i.test(pathname)) return true;
    // Known CDN / image-serving hosts
    const cdnHosts = new Set([
      'recipe-service.prod.cloud.jumbo.com',
      'images.ctfassets.net', 'res.cloudinary.com', 'cdn.sanity.io',
      'media.contentful.com', 'images.squarespace-cdn.com', 'i.imgur.com',
      'static.ah.nl', 'cdn.ah.nl', 'images.immediate.co.uk',
      'img.youtube.com', 'i.ytimg.com', 'media.24kitchen.nl',
      'www.spar.nl',
      'static.colruytgroup.com', 'images.colruytgroup.com',
      'www.colruyt.be', 'colruyt.be',
      'api.ah.nl', 'jumbo.com', 'dagelijksekost.een.be',
      'img.kidskitchen.nl', 'images.nieuwsblad.be',
    ]);
    if (cdnHosts.has(hostname)) return true;
    // Generic CDN/image subdomain patterns
    if (/^(?:img|images?|cdn|media|photos?|static|assets|content|upload)\./i.test(hostname)) return true;
    // Path-based patterns
    if (/\/(?:photos?|images?|imgs?|pictures?|fotos?|media|uploads?|content)\//i.test(pathname)) return true;
    if (/\/(recipe|recept|dish|food|meal)\//i.test(pathname)) return true;
  } catch { return false; }
  return false;
}

function encodeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = u.pathname
      .split('/')
      .map((seg) => {
        try { return encodeURIComponent(decodeURIComponent(seg)); }
        catch { return encodeURIComponent(seg); }
      })
      .join('/');
    return u.toString();
  } catch { return url; }
}

function contentTypeToExt(ct: string): string | null {
  if (!ct) return null;
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('avif')) return 'avif';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  return null;
}

function guessExtFromUrl(url: string): string {
  const m = url.match(/\.(jpg|jpeg|png|webp|gif|avif)/i);
  return m ? (m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase()) : 'jpg';
}

function extToMime(ext: string): string {
  const map: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
  return map[ext] ?? 'image/jpeg';
}

function getHeader(headers: Record<string, string>, name: string): string {
  if (!headers) return '';
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key] ?? '';
  }
  return '';
}

function buildImageHeaders(referer: string): Record<string, string> {
  return {
    'User-Agent': UA,
    'Accept': 'image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8',
    'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
    'Referer': referer,
    'Origin': (() => { try { return new URL(referer).origin; } catch { return referer; } })(),
  };
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function safeDelete(path: string): Promise<void> {
  if (!FS || !path) return;
  try { await FS.deleteAsync(path, { idempotent: true }); } catch { /* ignore */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[IE]', ...args);
  }
}

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
