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
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
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
    const url = normalizeUrl(rawUrl, baseUrl);
    if (!isValidImageUrl(url)) return;
    const key = canonicalKey(url);
    if (!candidates.has(key)) candidates.set(key, { url, score });
  };

  // JSON-LD
  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { extractJsonLdImages(JSON.parse(block[1].trim())).forEach((u) => add(u, 90)); } catch { /* skip */ }
  }

  // og:image — parse robustly to handle apostrophes in URLs
  const ogUrl = extractMetaUrl(html, 'og:image', 'property');
  if (ogUrl) add(ogUrl, 95);

  const twitterUrl = extractMetaUrl(html, 'twitter:image', 'name');
  if (twitterUrl) add(twitterUrl, 88);

  // <img> tags
  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*/gi)) {
    add(match[1], 50);
  }

  return Array.from(candidates.values());
}

function extractMetaUrl(html: string, key: string, attr: string): string | null {
  // Find the <meta> tag containing the property/name
  const tagRe = new RegExp(`<meta\\s[^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(tagRe)?.[0];
  if (!tag) return null;

  // Extract content= with delimiter tracking so apostrophes in URLs don't break it
  const idx = tag.search(/\bcontent\s*=/i);
  if (idx === -1) return null;
  const after = tag.slice(idx).replace(/^\bcontent\s*=\s*/i, '').replace(/^content\s*=/i, '');
  const delim = after[0];
  if (delim === '"') {
    // double-quoted: apostrophes inside are fine
    const end = after.indexOf('"', 1);
    return end === -1 ? null : after.slice(1, end) || null;
  }
  if (delim === "'") {
    // single-quoted: read until closing quote followed by space or >
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
  if (url.startsWith('/')) { try { return new URL(baseUrl).origin + url; } catch { return url; } }
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
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(pathname)) return true;
    const cdnHosts = new Set([
      'recipe-service.prod.cloud.jumbo.com',
      'images.ctfassets.net', 'res.cloudinary.com', 'cdn.sanity.io',
      'media.contentful.com', 'images.squarespace-cdn.com', 'i.imgur.com',
      'static.ah.nl', 'cdn.ah.nl', 'images.immediate.co.uk',
      'img.youtube.com', 'i.ytimg.com',
    ]);
    if (cdnHosts.has(hostname)) return true;
    if (/^(?:img|images?|cdn|media|photos?|static|assets)\./i.test(hostname)) return true;
    if (/\/(?:photos?|images?|imgs?|pictures?|fotos?|media)\//i.test(pathname)) return true;
  } catch { return false; }
  return false;
}

async function downloadImage(imageUrl: string): Promise<string | undefined> {
  if (!FS) return undefined;
  try {
    const safeUrl = encodeImageUrl(imageUrl);

    // Fetch the image bytes directly — avoids expo downloadAsync failures
    // on extensionless CDN URLs returning application/octet-stream
    const response = await fetch(safeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        Accept: 'image/*,*/*',
      },
    });
    if (!response.ok) return undefined;

    const ct = response.headers.get('content-type') ?? '';
    const ext = contentTypeToExt(ct) ?? guessExtFromUrl(imageUrl);

    // Use blob() → FileReader for base64 — this is the only reliable path on Hermes/RN
    // because spreading large Uint8Arrays with String.fromCharCode causes stack overflows
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
    return info.exists ? filepath : undefined;
  } catch {
    return undefined;
  }
}

function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result is "data:image/jpeg;base64,<data>" — strip the prefix
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
    u.pathname = u.pathname.split('/').map((seg) => {
      try { return encodeURIComponent(decodeURIComponent(seg)); }
      catch { return encodeURIComponent(seg); }
    }).join('/');
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
