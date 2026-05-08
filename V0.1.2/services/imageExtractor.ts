interface ImageCandidate {
  url: string;
  score: number;
}

let FS: typeof import('expo-file-system') | null = null;
try {
  FS = require('expo-file-system');
} catch {
  // not available
}

export async function extractImageFromUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
      },
    });
    if (!response.ok) return undefined;
    const html = await response.text();
    const candidates = extractImageCandidates(html, url);
    if (candidates.length === 0) return undefined;
    const sorted = candidates.sort((a, b) => b.score - a.score);
    for (const candidate of sorted) {
      const result = await downloadImage(candidate.url);
      if (result) return result;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function extractImageCandidates(html: string, baseUrl: string): ImageCandidate[] {
  const candidates = new Map<string, ImageCandidate>();

  const add = (rawUrl: string, score: number) => {
    const resolved = normalizeUrl(rawUrl, baseUrl);
    if (!isValidImageUrl(resolved)) return;
    const key = canonicalKey(resolved);
    if (!candidates.has(key)) candidates.set(key, { url: resolved, score });
  };

  // 1. JSON-LD (highest quality)
  for (const block of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      extractJsonLdImages(JSON.parse(block[1].trim())).forEach((u) => add(u, 90));
    } catch { /* skip */ }
  }

  // 2. Next.js __NEXT_DATA__ (covers Jumbo, AH, Albert Heijn etc.)
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      extractNestedImages(nextData).forEach((u) => add(u, 88));
    } catch { /* skip */ }
  }

  // 3. Nuxt / Vue __NUXT__ hydration data
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});\s*(?:<\/script>|$)/i);
  if (nuxtMatch) {
    try {
      const nuxtData = JSON.parse(nuxtMatch[1]);
      extractNestedImages(nuxtData).forEach((u) => add(u, 85));
    } catch { /* skip */ }
  }

  // 4. og:image meta tag
  const ogUrl = extractMetaUrl(html, 'og:image', 'property');
  if (ogUrl) add(ogUrl, 95);

  const twitterUrl = extractMetaUrl(html, 'twitter:image', 'name');
  if (twitterUrl) add(twitterUrl, 82);

  const twitterUrlContent = extractMetaUrl(html, 'twitter:image:src', 'name');
  if (twitterUrlContent) add(twitterUrlContent, 82);

  // 5. itemProp="image" (Schema.org microdata)
  for (const m of html.matchAll(/itemprop=["']image["'][^>]+(?:content|src)=["']([^"']+)["']/gi)) {
    add(m[1], 80);
  }
  for (const m of html.matchAll(/(?:content|src)=["']([^"']+)["'][^>]+itemprop=["']image["']/gi)) {
    add(m[1], 80);
  }

  // 6. <img> tags with food-related class names
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)) {
    const tag = m[0].toLowerCase();
    if (/recipe|hero|featured|food|dish|meal|recept|gerecht/.test(tag)) {
      add(m[1], 70);
    } else {
      add(m[1], 40);
    }
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
        (key === 'image' || key === 'imageUrl' || key === 'img' || key === 'photo' || key === 'thumbnail' || key === 'src') &&
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
      'api.ah.nl', 'jumbo.com',
    ]);
    if (cdnHosts.has(hostname)) return true;
    if (/^(?:img|images?|cdn|media|photos?|static|assets|content|upload)\./i.test(hostname)) return true;
    if (/\/(?:photos?|images?|imgs?|pictures?|fotos?|media|uploads?|content)\//i.test(pathname)) return true;
    // Allow anything from the same domain that looks like a media path
    if (/\/(recipe|recept|dish|food|meal)\//i.test(pathname)) return true;
  } catch { return false; }
  return false;
}

async function downloadImage(imageUrl: string): Promise<string | undefined> {
  if (!FS) return undefined;
  try {
    const safeUrl = encodeImageUrl(imageUrl);

    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        Accept: 'image/*,*/*',
      },
    });
    if (!response.ok) return undefined;

    const ct = response.headers.get('content-type') ?? '';
    // Reject HTML pages masquerading as images
    if (ct.includes('text/html')) return undefined;
    const ext = contentTypeToExt(ct) ?? guessExtFromUrl(imageUrl);

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    if (!base64) return undefined;

    const dir = `${FS.documentDirectory}images`;
    const dirInfo = await FS.getInfoAsync(dir);
    if (!dirInfo.exists) await FS.makeDirectoryAsync(dir, { intermediates: true });

    const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filepath = `${dir}/${filename}`;

    await FS.writeAsStringAsync(filepath, base64, { encoding: FS.EncodingType.Base64 });

    const info = await FS.getInfoAsync(filepath);
    if (!info.exists) return undefined;
    // Reject tiny files (< 2 KB) — likely placeholder/error pages
    if ((info as any).size < 2048) {
      await FS.deleteAsync(filepath, { idempotent: true });
      return undefined;
    }
    return filepath;
  } catch {
    return undefined;
  }
}

function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma !== -1 ? result.slice(comma + 1) : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
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
