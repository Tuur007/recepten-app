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
  const jsonLdBlocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1].trim());
      extractJsonLdImages(data).forEach((u) => addCandidate(u, 90));
    } catch {
      // malformed — skip
    }
  }

  // og:image — use a robust extractor that handles apostrophes in URLs
  const ogUrl = extractMetaImageUrl(html, 'og:image', 'property');
  if (ogUrl) addCandidate(ogUrl, 95);

  // twitter:image
  const twitterUrl = extractMetaImageUrl(html, 'twitter:image', 'name');
  if (twitterUrl) addCandidate(twitterUrl, 88);

  // <img> tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
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
 * Extracts the content of a <meta> tag where the URL may contain apostrophes.
 *
 * The standard regex `content=["']([^"']+)["']` breaks when the URL itself
 * contains an apostrophe (e.g. "pinda's"). Instead we:
 * 1. Find the full <meta ...> tag that contains the property/name attribute.
 * 2. Extract the content attribute from that tag using a delimiter-aware parser
 *    that reads until the same delimiter that opened content="..." or content='...'.
 *    For double-quoted content (the common case) apostrophes are fine.
 * 3. If the tag uses single-quote delimiters and the URL has apostrophes, we
 *    fall back to reading until the next `>` and stripping the closing `'`.
 */
function extractMetaImageUrl(html: string, metaKey: string, attr: 'property' | 'name'): string | null {
  // Match the entire <meta> tag that has the right property/name value
  const tagRe = new RegExp(
    `<meta\\s[^>]*(?:${attr})=["']${metaKey}["'][^>]*>`,
    'i',
  );
  const tagMatch = html.match(tagRe);

  if (!tagMatch) {
    // Also try reversed attribute order: content first, then property/name
    const tagReReversed = new RegExp(
      `<meta\\s[^>]*content=[^>]*(?:${attr})=["']${metaKey}["'][^>]*>`,
      'i',
    );
    const reversed = html.match(tagReReversed);
    if (!reversed) return null;
    return extractContentFromMetaTag(reversed[0]);
  }

  return extractContentFromMetaTag(tagMatch[0]);
}

function extractContentFromMetaTag(tag: string): string | null {
  // Find content=" or content=' inside the tag
  const contentIdx = tag.search(/\bcontent\s*=/i);
  if (contentIdx === -1) return null;

  const afterEquals = tag.slice(contentIdx).replace(/^content\s*=\s*/i, '');
  const delimiter = afterEquals[0];

  if (delimiter === '"') {
    // Read until next double-quote — apostrophes inside are fine
    const end = afterEquals.indexOf('"', 1);
    if (end === -1) return null;
    return afterEquals.slice(1, end) || null;
  }

  if (delimiter === "'") {
    // Read until next single-quote — but the URL may contain apostrophes.
    // Heuristic: a real closing quote is followed by whitespace or > or /
    const rest = afterEquals.slice(1);
    const closeRe = /'(?=\s|>|\/)/;
    const closeMatch = rest.match(closeRe);
    if (closeMatch && closeMatch.index !== undefined) {
      return rest.slice(0, closeMatch.index) || null;
    }
    // Last resort: take everything up to >
    return rest.replace(/[>].*$/, '').replace(/['"]$/, '').trim() || null;
  }

  return null;
}

function extractJsonLdImages(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data.flatMap(extractJsonLdImages);

  const obj = data as Record<string, unknown>;
  const results: string[] = [];

  const image = obj['image'];
  if (typeof image === 'string') {
    results.push(image);
  } else if (Array.isArray(image)) {
    for (const item of image) {
      if (typeof item === 'string') results.push(item);
      else if (item && typeof item === 'object') {
        const imgObj = item as Record<string, unknown>;
        if (typeof imgObj.url === 'string') results.push(imgObj.url);
        if (typeof imgObj.contentUrl === 'string') results.push(imgObj.contentUrl);
      }
    }
  } else if (image && typeof image === 'object') {
    const imgObj = image as Record<string, unknown>;
    if (typeof imgObj.url === 'string') results.push(imgObj.url);
    if (typeof imgObj.contentUrl === 'string') results.push(imgObj.contentUrl);
  }

  if (Array.isArray(obj['@graph'])) {
    results.push(...obj['@graph'].flatMap(extractJsonLdImages));
  }

  return results;
}

function normalizeUrl(url: string, baseUrl: string): string {
  url = url.trim();
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) {
    try {
      const base = new URL(baseUrl);
      return base.origin + url;
    } catch {
      return url;
    }
  }
  if (url.startsWith('http')) return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function canonicalKey(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url.split('?')[0];
  }
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('javascript:') || lower.startsWith('data:')) return false;

  try {
    const { pathname, hostname } = new URL(url);
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(pathname)) return true;

    const imageCdnHosts = new Set([
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
      'assets.jumbo.com',
    ]);

    if (imageCdnHosts.has(hostname)) return true;
    if (/^(?:img|images?|cdn|media|photos?|static|assets)\./i.test(hostname)) return true;
    if (/\/(?:photos?|images?|imgs?|pictures?|fotos?|media)\//i.test(pathname)) return true;
  } catch {
    return false;
  }

  return false;
}

function extractImageSize(imgTag: string): { width?: number; height?: number } {
  const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
  const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
  return {
    width: widthMatch ? parseInt(widthMatch[1], 10) : undefined,
    height: heightMatch ? parseInt(heightMatch[1], 10) : undefined,
  };
}

async function downloadImage(imageUrl: string): Promise<string | undefined> {
  if (!FS) return undefined;
  try {
    const safeUrl = encodeImageUrl(imageUrl);
    let ext = guessExtFromUrl(imageUrl);

    try {
      const probe = await fetch(safeUrl, {
        headers: {
          Range: 'bytes=0-511',
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      });
      const ct = probe.headers.get('content-type') ?? '';
      if (ct.includes('png')) ext = 'png';
      else if (ct.includes('webp')) ext = 'webp';
      else if (ct.includes('gif')) ext = 'gif';
      else if (ct.includes('avif')) ext = 'avif';
      else if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg';
    } catch {
      // keep guessed ext
    }

    const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const dir = `${FS.documentDirectory}images`;
    const filepath = `${dir}/${filename}`;

    const dirInfo = await FS.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FS.makeDirectoryAsync(dir, { intermediates: true });
    }

    const result = await FS.downloadAsync(safeUrl, filepath, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });

    if (result.status !== 200) {
      try { await FS.deleteAsync(filepath, { idempotent: true }); } catch { /* ignore */ }
      return undefined;
    }

    const fileInfo = await FS.getInfoAsync(filepath);
    return fileInfo.exists ? filepath : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Percent-encodes characters in the URL path that are technically invalid
 * in URLs but commonly appear in CDN filenames (apostrophes, commas, spaces).
 * Preserves already-encoded sequences to avoid double-encoding.
 */
function encodeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    u.pathname = u.pathname
      .split('/')
      .map((segment) => {
        try {
          // Decode first to avoid double-encoding, then re-encode
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join('/');
    return u.toString();
  } catch {
    return url;
  }
}

function guessExtFromUrl(url: string): string {
  const m = url.match(/\.(jpg|jpeg|png|webp|gif|avif)/i);
  if (!m) return 'jpg';
  return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
}
