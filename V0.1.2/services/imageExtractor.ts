/* eslint-disable @typescript-eslint/no-explicit-any */
declare const __DEV__: boolean;

interface ImageCandidate {
  url: string;
  score: number;
  source: string;
}

let FS: typeof import('expo-file-system') | null = null;
try {
  FS = require('expo-file-system');
} catch {
  // native module unavailable (Expo Snack / web)
}

// All downloaded images land in the same dir managed by imageStorage.ts
// so deleteRecipeImage() can clean them up correctly.
function getImageDir(): string {
  return FS?.documentDirectory ? `${FS.documentDirectory}recipes_images` : '';
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function extractImageFromUrl(url: string): Promise<string | undefined> {
  log('start', url);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });
    } finally {
      clearTimeout(timer);
    }

    log('html status', response.status, response.url);
    if (!response.ok) {
      log('html fetch failed', response.status);
      return undefined;
    }

    const html = await response.text();
    const finalUrl = response.url || url;
    const candidates = extractImageCandidates(html, finalUrl);
    log('candidates found:', candidates.length);
    candidates.slice(0, 8).forEach((c, i) =>
      log(`  [${i}] score=${c.score} src=${c.source} url=${c.url.slice(0, 90)}`),
    );

    if (candidates.length === 0) {
      log('no candidates');
      return undefined;
    }

    for (let i = 0; i < Math.min(candidates.length, 6); i++) {
      const c = candidates[i];
      log(`try [${i}] ${c.source}`, c.url.slice(0, 80));
      const result = await downloadImageWithRetry(c.url, finalUrl);
      if (result) {
        log('success', result);
        return result;
      }
      log(`candidate [${i}] failed, next`);
    }

    log('all candidates failed');
    return undefined;
  } catch (err) {
    log('error', err);
    return undefined;
  }
}

// ─── Download ────────────────────────────────────────────────────────────────

async function downloadImageWithRetry(
  imageUrl: string,
  referer: string,
  maxAttempts = 2,
): Promise<string | undefined> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await downloadImage(imageUrl, referer);
    if (result) return result;
    if (attempt < maxAttempts) {
      log(`retry ${attempt}/${maxAttempts - 1}`);
      await sleep(600 * attempt);
    }
  }
  return undefined;
}

async function downloadImage(imageUrl: string, referer: string): Promise<string | undefined> {
  if (!FS) {
    log('expo-file-system unavailable');
    return undefined;
  }

  const safeUrl = encodeImageUrl(imageUrl);
  const dir = getImageDir();
  if (!dir) return undefined;

  try {
    const dirInfo = await FS.getInfoAsync(dir);
    if (!dirInfo.exists) await FS.makeDirectoryAsync(dir, { intermediates: true });
  } catch (err) {
    log('mkdir error', err);
    return undefined;
  }

  const ext = guessExtFromUrl(imageUrl);
  const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
  const filepath = `${dir}/${filename}`;

  try {
    // Use FS.downloadAsync (native downloader) — avoids the FileReader/Blob
    // path which is unreliable in React Native.
    const downloadPromise = FS.downloadAsync(safeUrl, filepath, {
      headers: {
        'User-Agent': UA,
        'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Referer': referer,
      },
    });

    // FS.downloadAsync has no built-in timeout — race against 20 s.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('download timeout')), 20_000),
    );

    const result = await Promise.race([downloadPromise, timeoutPromise]);

    log('dl status', result.status, 'url', safeUrl.slice(0, 70));

    if (result.status !== 200) {
      log('non-200', result.status);
      await FS.deleteAsync(filepath, { idempotent: true });
      return undefined;
    }

    // Content-type check — headers keys may be any casing
    const ct = getHeader(result.headers as Record<string, string>, 'content-type').toLowerCase();
    log('content-type', ct);

    if (ct && (ct.includes('text/html') || ct.includes('application/json'))) {
      log('non-image content-type', ct);
      await FS.deleteAsync(filepath, { idempotent: true });
      return undefined;
    }

    const info = await FS.getInfoAsync(filepath);
    if (!info.exists) {
      log('file missing after download');
      return undefined;
    }

    const size = (info as any).size ?? 0;
    log('file size', size, 'bytes');

    if (size < 2048) {
      log('too small, rejecting');
      await FS.deleteAsync(filepath, { idempotent: true });
      return undefined;
    }

    // Rename to correct extension based on actual content-type
    const actualExt = contentTypeToExt(ct) ?? ext;
    if (actualExt !== ext) {
      const correctedPath = filepath.slice(0, -ext.length) + actualExt;
      try {
        await FS.moveAsync({ from: filepath, to: correctedPath });
        log('renamed to correct ext', correctedPath);
        return correctedPath;
      } catch {
        // keep original if rename fails — still a valid file
      }
    }

    return filepath;
  } catch (err: unknown) {
    log('downloadAsync error', err instanceof Error ? err.message : err);
    try { await FS.deleteAsync(filepath, { idempotent: true }); } catch { /* ignore */ }
    return undefined;
  }
}

// ─── HTML image extraction ───────────────────────────────────────────────────

function extractImageCandidates(html: string, baseUrl: string): ImageCandidate[] {
  const candidates = new Map<string, ImageCandidate>();

  const add = (rawUrl: string, score: number, source: string) => {
    if (!rawUrl) return;
    const resolved = normalizeUrl(rawUrl, baseUrl);
    if (!resolved || !isValidImageUrl(resolved)) return;
    const key = canonicalKey(resolved);
    if (!candidates.has(key)) candidates.set(key, { url: resolved, score, source });
  };

  // 1. og:image:secure_url (highest priority — explicit HTTPS)
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
    } catch { /* skip bad JSON */ }
  }

  // 4. Next.js __NEXT_DATA__ (Jumbo, AH, etc.)
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      extractNestedImages(JSON.parse(nextDataMatch[1])).forEach((u) => add(u, 88, '__NEXT_DATA__'));
    } catch { /* skip */ }
  }

  // 5a. Nuxt 3 — <script id="__NUXT_DATA__" type="application/json"> (Colruyt, etc.)
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

  // 6. twitter:image
  const twUrl = extractMetaUrl(html, 'twitter:image', 'name');
  if (twUrl) add(twUrl, 82, 'twitter:image');
  const twSrc = extractMetaUrl(html, 'twitter:image:src', 'name');
  if (twSrc) add(twSrc, 82, 'twitter:image:src');

  // 7. <link rel="image_src">
  const linkImg = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)
               ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);
  if (linkImg) add(linkImg[1], 83, 'link[image_src]');

  // 8. Schema.org microdata
  for (const m of html.matchAll(/itemprop=["']image["'][^>]+(?:content|src)=["']([^"']+)["']/gi)) {
    add(m[1], 80, 'microdata');
  }
  for (const m of html.matchAll(/(?:content|src)=["']([^"']+)["'][^>]+itemprop=["']image["']/gi)) {
    add(m[1], 80, 'microdata');
  }

  // 9. data-src / data-image / data-lazy-src (lazy-loaded images)
  for (const m of html.matchAll(/<img[^>]+data-(?:src|image|lazy-src|original)=["']([^"']+)["'][^>]*/gi)) {
    const tag = m[0].toLowerCase();
    const food = /recipe|hero|featured|food|dish|meal|recept|gerecht/.test(tag);
    add(m[1], food ? 72 : 38, 'img[data-src]');
  }

  // 10. srcset — pick the highest-resolution URL
  for (const m of html.matchAll(/<(?:img|source)[^>]+srcset=["']([^"']+)["'][^>]*/gi)) {
    const tag = m[0].toLowerCase();
    const food = /recipe|hero|featured|food|dish|meal|recept|gerecht/.test(tag);
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

  // 11. Regular img src (lowest priority)
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)) {
    const tag = m[0].toLowerCase();
    const food = /recipe|hero|featured|food|dish|meal|recept|gerecht/.test(tag);
    add(m[1], food ? 70 : 35, 'img[src]');
  }

  const sorted = Array.from(candidates.values()).sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    // Dump extraction signals to console so the dev can diagnose unknown sites
    log('NO_CANDIDATES — signals:',
      'og:image=' + !!extractMetaUrl(html, 'og:image', 'property'),
      'json-ld=' + (html.match(/<script[^>]+application\/ld\+json/i) ? html.match(/<script[^>]+application\/ld\+json/gi)!.length : 0),
      '__NEXT_DATA__=' + /<script[^>]+id=["']__NEXT_DATA__/.test(html),
      '__NUXT_DATA__=' + /<script[^>]+id=["']__NUXT_DATA__/.test(html),
      '__NUXT__=' + /window\.__NUXT__/.test(html),
      'imgs=' + (html.match(/<img\s/gi) ?? []).length,
    );
    log('HTML_SAMPLE (first 600 chars):', html.slice(0, 600).replace(/\s+/g, ' '));
  }

  return sorted;
}

// Recursively walks JSON tree looking for image URLs.
// Depth 15 covers real-world structures like AH's dehydratedState (depth 11).
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
  if (Array.isArray(obj['@graph'])) out.push(...(obj['@graph'] as unknown[]).flatMap(extractJsonLdImages));
  return out;
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

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
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?|$)/i.test(pathname)) return true;
    const cdnHosts = new Set([
      'recipe-service.prod.cloud.jumbo.com',
      'images.ctfassets.net', 'res.cloudinary.com', 'cdn.sanity.io',
      'media.contentful.com', 'images.squarespace-cdn.com', 'i.imgur.com',
      'static.ah.nl', 'cdn.ah.nl', 'images.immediate.co.uk',
      'img.youtube.com', 'i.ytimg.com', 'media.24kitchen.nl',
      'www.spar.nl', 'static.colruytgroup.com', 'images.colruytgroup.com',
      'www.colruyt.be', 'colruyt.be',
      'api.ah.nl', 'jumbo.com', 'dagelijksekost.een.be',
      'img.kidskitchen.nl', 'images.nieuwsblad.be',
    ]);
    if (cdnHosts.has(hostname)) return true;
    if (/^(?:img|images?|cdn|media|photos?|static|assets|content|upload)\./i.test(hostname)) return true;
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

// Case-insensitive header lookup (HTTP headers are case-insensitive by spec)
function getHeader(headers: Record<string, string>, name: string): string {
  if (!headers) return '';
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key] ?? '';
  }
  return '';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  if (__DEV__) console.log('[ImageExtractor]', ...args);
}

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
