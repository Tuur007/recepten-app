interface ImageCandidate {
  url: string;
  score: number;
}

let FS: typeof import('expo-file-system') | null = null;
try {
  FS = require('expo-file-system');
} catch {
  // native module unavailable (Expo Snack / web)
}

// All downloaded images land in the same dir as saveRecipeImage() so
// deleteRecipeImage() can clean them up correctly.
function getImageDir(): string {
  return FS?.documentDirectory ? `${FS.documentDirectory}recipes_images` : '';
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function extractImageFromUrl(url: string): Promise<string | undefined> {
  log('extractImageFromUrl start', url);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        },
      });
    } finally {
      clearTimeout(timer);
    }

    log('HTML fetch status', response.status, response.url);
    if (!response.ok) {
      log('HTML fetch failed', response.status);
      return undefined;
    }

    const html = await response.text();
    const finalUrl = response.url || url; // follow redirects
    const candidates = extractImageCandidates(html, finalUrl);
    log('candidates found', candidates.length, candidates.map((c) => `${c.score} ${c.url}`));

    if (candidates.length === 0) {
      log('no candidates — giving up');
      return undefined;
    }

    const sorted = candidates.sort((a, b) => b.score - a.score);
    for (const candidate of sorted) {
      log('trying candidate', candidate.url, 'score', candidate.score);
      const result = await downloadImageWithRetry(candidate.url, finalUrl);
      if (result) {
        log('download succeeded →', result);
        return result;
      }
      log('candidate failed, trying next');
    }

    log('all candidates exhausted');
    return undefined;
  } catch (err) {
    log('extractImageFromUrl error', err);
    return undefined;
  }
}

// ─── Download (native, no FileReader) ───────────────────────────────────────

async function downloadImageWithRetry(
  imageUrl: string,
  referer: string,
  maxRetries = 2,
): Promise<string | undefined> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await downloadImage(imageUrl, referer);
    if (result) return result;
    if (attempt < maxRetries) {
      log(`retry ${attempt}/${maxRetries - 1} for`, imageUrl);
      await sleep(800 * attempt);
    }
  }
  return undefined;
}

async function downloadImage(imageUrl: string, referer: string): Promise<string | undefined> {
  if (!FS) {
    log('expo-file-system not available');
    return undefined;
  }

  const safeUrl = encodeImageUrl(imageUrl);
  log('downloadImage', safeUrl, '(referer:', referer, ')');

  const dir = getImageDir();
  if (!dir) {
    log('no documentDirectory');
    return undefined;
  }

  // Ensure directory exists
  try {
    const dirInfo = await FS.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FS.makeDirectoryAsync(dir, { intermediates: true });
      log('created dir', dir);
    }
  } catch (err) {
    log('mkdir error', err);
    return undefined;
  }

  const ext = guessExtFromUrl(imageUrl);
  const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
  const filepath = `${dir}/${filename}`;

  try {
    // FS.downloadAsync is a native downloader — no Blob, no FileReader, no base64 in JS.
    // This is the reliable way to download binary files in Expo/React Native.
    const result = await FS.downloadAsync(safeUrl, filepath, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        Referer: referer,
      },
    });

    log('download result status', result.status, 'headers', JSON.stringify(result.headers));

    if (result.status !== 200) {
      log('non-200 status', result.status, '— deleting partial file');
      await FS.deleteAsync(filepath, { idempotent: true });
      return undefined;
    }

    const ct = (result.headers?.['content-type'] ?? result.headers?.['Content-Type'] ?? '').toLowerCase();
    log('content-type', ct);

    if (ct.includes('text/html') || ct.includes('application/json')) {
      log('server returned non-image content-type — rejecting');
      await FS.deleteAsync(filepath, { idempotent: true });
      return undefined;
    }

    const info = await FS.getInfoAsync(filepath);
    if (!info.exists) {
      log('file does not exist after download');
      return undefined;
    }

    const size = (info as any).size ?? 0;
    log('file size', size, 'bytes');

    if (size < 2048) {
      log('file too small (< 2 KB) — likely error page, deleting');
      await FS.deleteAsync(filepath, { idempotent: true });
      return undefined;
    }

    // Rename to correct extension based on actual content-type
    const actualExt = contentTypeToExt(ct) ?? ext;
    if (actualExt !== ext) {
      const correctedPath = filepath.replace(new RegExp(`\\.${ext}$`), `.${actualExt}`);
      try {
        await FS.moveAsync({ from: filepath, to: correctedPath });
        log('renamed to correct extension', correctedPath);
        return correctedPath;
      } catch {
        // keep original path if rename fails
      }
    }

    return filepath;
  } catch (err) {
    log('downloadAsync error', err);
    // Clean up partial file
    try { await FS.deleteAsync(filepath, { idempotent: true }); } catch { /* ignore */ }
    return undefined;
  }
}

// ─── HTML extraction ─────────────────────────────────────────────────────────

function extractImageCandidates(html: string, baseUrl: string): ImageCandidate[] {
  const candidates = new Map<string, ImageCandidate>();

  const add = (rawUrl: string, score: number) => {
    const resolved = normalizeUrl(rawUrl, baseUrl);
    if (!isValidImageUrl(resolved)) return;
    const key = canonicalKey(resolved);
    if (!candidates.has(key)) candidates.set(key, { url: resolved, score });
  };

  // 1. og:image — highest quality, most reliable
  const ogUrl = extractMetaUrl(html, 'og:image', 'property');
  if (ogUrl) add(ogUrl, 95);

  // 2. JSON-LD Recipe.image
  for (const block of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      extractJsonLdImages(JSON.parse(block[1].trim())).forEach((u) => add(u, 90));
    } catch { /* skip */ }
  }

  // 3. Next.js __NEXT_DATA__ (Jumbo, AH etc.)
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      extractNestedImages(JSON.parse(nextDataMatch[1])).forEach((u) => add(u, 88));
    } catch { /* skip */ }
  }

  // 4. Nuxt / Vue __NUXT__ hydration
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|$)/i);
  if (nuxtMatch) {
    try {
      extractNestedImages(JSON.parse(nuxtMatch[1])).forEach((u) => add(u, 85));
    } catch { /* skip */ }
  }

  // 5. twitter:image
  const twitterUrl = extractMetaUrl(html, 'twitter:image', 'name');
  if (twitterUrl) add(twitterUrl, 82);
  const twitterUrlSrc = extractMetaUrl(html, 'twitter:image:src', 'name');
  if (twitterUrlSrc) add(twitterUrlSrc, 82);

  // 6. Schema.org microdata itemProp="image"
  for (const m of html.matchAll(/itemprop=["']image["'][^>]+(?:content|src)=["']([^"']+)["']/gi)) {
    add(m[1], 80);
  }
  for (const m of html.matchAll(/(?:content|src)=["']([^"']+)["'][^>]+itemprop=["']image["']/gi)) {
    add(m[1], 80);
  }

  // 7. data-src / lazy-loaded images (srcset first src)
  for (const m of html.matchAll(/<img[^>]+data-src=["']([^"']+)["'][^>]*/gi)) {
    const tag = m[0].toLowerCase();
    const score = /recipe|hero|featured|food|dish|meal|recept|gerecht/.test(tag) ? 72 : 38;
    add(m[1], score);
  }

  // 8. Regular img src
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)) {
    const tag = m[0].toLowerCase();
    const score = /recipe|hero|featured|food|dish|meal|recept|gerecht/.test(tag) ? 70 : 35;
    add(m[1], score);
  }

  return Array.from(candidates.values());
}

function extractNestedImages(obj: unknown, depth = 0): string[] {
  if (depth > 8 || !obj || typeof obj !== 'object') return [];
  const results: string[] = [];
  if (Array.isArray(obj)) {
    for (const item of obj) results.push(...extractNestedImages(item, depth + 1));
    return results;
  }
  const o = obj as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    const val = o[key];
    if (typeof val === 'string') {
      if (
        (key === 'image' || key === 'imageUrl' || key === 'img' ||
         key === 'photo' || key === 'thumbnail' || key === 'src' ||
         key === 'imageUri' || key === 'coverImage' || key === 'heroImage') &&
        (val.startsWith('http') || val.startsWith('/'))
      ) {
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
  if (Array.isArray(obj['@graph'])) out.push(...obj['@graph'].flatMap(extractJsonLdImages));
  return out;
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

function normalizeUrl(url: string, baseUrl: string): string {
  url = url.trim();
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(...args: unknown[]): void {
  if (__DEV__) {
    console.log('[ImageExtractor]', ...args);
  }
}
