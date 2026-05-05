interface ImageCandidate {
  url: string;
  width?: number;
  height?: number;
  score: number;
}

let FS: typeof import('expo-file-system') | null = null;
try {
  FS = require('expo-file-system');
} catch {
  // Native module not available
}

export async function extractImageFromUrl(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
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
  const candidates: Map<string, ImageCandidate> = new Map();

  const addCandidate = (rawUrl: string, score: number, extra?: Partial<ImageCandidate>) => {
    const url = normalizeUrl(rawUrl, baseUrl);
    if (!isValidImageUrl(url)) return;
    const key = canonicalKey(url);
    if (!candidates.has(key)) {
      candidates.set(key, { url, score, ...extra });
    }
  };

  // JSON-LD blocks
  for (const block of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      extractJsonLdImages(JSON.parse(block[1].trim())).forEach((u) => addCandidate(u, 90));
    } catch { /* malformed */ }
  }

  // og:image and twitter:image — robust extraction that handles apostrophes in URLs
  const ogUrl = extractMetaUrl(html, 'og:image', 'property');
  if (ogUrl) addCandidate(ogUrl, 95);

  const twitterUrl = extractMetaUrl(html, 'twitter:image', 'name');
  if (twitterUrl) addCandidate(twitterUrl, 88);

  // <img> tags
  let match: RegExpExecArray | null;
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = normalizeUrl(match[1], baseUrl);
    if (!isValidImageUrl(url)) continue;
    const key = canonicalKey(url);
    if (candidates.has(key)) continue;
    const size = extractImageSize(match[0]);
    let score = 50;
    if (/recipe|food|dish|recept/i.test(url)) score = 70;
    if (size?.width && size.width >= 400 && size?.height && size.height >= 300) score += 15;
    candidates.set(key, { url, score, ...size });
  }

  return Array.from(candidates.values());
}

/**
 * Extracts content= from a <meta> tag robustly.
 * Standard regex breaks when the URL contains apostrophes (e.g. "pinda's").
 * Strategy: find the full <meta> tag by its property/name, then parse
 * the content attribute using the actual opening delimiter so apostrophes
 * inside double-quoted values are never an issue.
 */
function extractMetaUrl(html: string, key: string, attr: 'property' | 'name'): string | null {
  // Match whole <meta> tag — use [^>]* but allow > inside quoted attrs via [\s\S] on a small window
  // Two orderings: property first, content second — and reversed
  const patterns = [
    new RegExp(`<meta\\s[^>]*${attr}=["']${key}["'][^>]*>`, 'i'),
    new RegExp(`<meta\\s[^>]*content=[^>]*${attr}=["']${key}["'][^>]*>`, 'i'),
  ];

  for (const re of patterns) {
    const tagMatch = html.match(re);
    if (!tagMatch) continue;
    const tag = tagMatch[0];

    // Find content= in the tag and extract with delimiter-awareness
    const contentRe = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i;
    const cm = tag.match(contentRe);
    if (cm && cm[2]) return cm[2];

    // Fallback: content attribute delimited by the same char but URL has that char —
    // read from after content=" until the next whitespace+attr or end of tag
    const fallbackRe = /\bcontent\s*=\s*["']([^>]+?)(?:\s+\w+=|>)/i;
    const fm = tag.match(fallbackRe);
    if (fm && fm[1]) return fm[1].replace(/["']$/, '').trim();
  }

  // Last resort: scan for og:image / twitter:image in raw text between <meta and >
  // covering cases where the tag spans multiple lines or has unusual formatting
  const rawRe = new RegExp(
    `<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"'>]+(?:'[^"'>]*)*)["']`,
    'i',
  );
  const rawMatch = html.match(rawRe);
  if (rawMatch) return rawMatch[1];

  return null;
}

function extractJsonLdImages(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data.flatMap(extractJsonLdImages);
  const obj = data as Record<string, unknown>;
  const results: string[] = [];
  const image = obj['image'];
  if (typeof image === 'string') results.push(image);
  else if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === 'string') results.push(item);
      else if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        if (typeof o.url === 'string') results.push(o.url);
        if (typeof o.contentUrl === 'string') results.push(o.contentUrl);
      }
    }
  } else if (image && typeof image === 'object') {
    const o = image as Record<string, unknown>;
    if (typeof o.url === 'string') results.push(o.url);
    if (typeof o.contentUrl === 'string') results.push(o.contentUrl);
  }
  if (Array.isArray(obj['@graph'])) results.push(...obj['@graph'].flatMap(extractJsonLdImages));
  return results;
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
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('javascript:') || lower.startsWith('data:')) return false;
  try {
    const { pathname, hostname } = new URL(url);
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(pathname)) return true;
    const cdnHosts = new Set([
      'recipe-service.prod.cloud.jumbo.com',
      'images.ctfassets.net',
      'res.cloudinary.com',
      'cdn.sanity.io',
      'media.contentful.com',
      'images.squarespace-cdn.com',
      'i.imgur.com',
      'static.ah.nl',
      'cdn.ah.nl',
      'images.immediate.co.uk',
      'img.youtube.com',
      'i.ytimg.com',
    ]);
    if (cdnHosts.has(hostname)) return true;
    if (/^(?:img|images?|cdn|media|photos?|static|assets)\./i.test(hostname)) return true;
    if (/\/(?:photos?|images?|imgs?|pictures?|fotos?|media)\//i.test(pathname)) return true;
  } catch { return false; }
  return false;
}

function extractImageSize(imgTag: string): { width?: number; height?: number } {
  const w = imgTag.match(/width=["']?(\d+)["']?/i);
  const h = imgTag.match(/height=["']?(\d+)["']?/i);
  return {
    width: w ? parseInt(w[1], 10) : undefined,
    height: h ? parseInt(h[1], 10) : undefined,
  };
}

/**
 * Downloads an image by fetching it as a blob and writing it manually.
 * This avoids expo-file-system downloadAsync failures on extensionless CDN
 * URLs that return application/octet-stream instead of image/jpeg.
 */
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
    const ext = contentTypeToExt(ct) ?? guessExtFromUrl(imageUrl);

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) return undefined;

    const base64 = arrayBufferToBase64(arrayBuffer);

    const dir = `${FS.documentDirectory}images`;
    const dirInfo = await FS.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FS.makeDirectoryAsync(dir, { intermediates: true });
    }

    const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const filepath = `${dir}/${filename}`;

    await FS.writeAsStringAsync(filepath, base64, {
      encoding: FS.EncodingType.Base64,
    });

    const fileInfo = await FS.getInfoAsync(filepath);
    return fileInfo.exists ? filepath : undefined;
  } catch {
    return undefined;
  }
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
  if (!m) return 'jpg';
  return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
