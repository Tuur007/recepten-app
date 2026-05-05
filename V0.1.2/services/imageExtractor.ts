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

  // og:image — highest priority
  const ogMatch =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (ogMatch) addCandidate(ogMatch[1], 95);

  // twitter:image
  const twitterMatch =
    html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i);
  if (twitterMatch) addCandidate(twitterMatch[1], 88);

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
  url = url.trim().replace(/^["']|["']$/g, '');
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

// Stable dedup key — strip query params but keep path intact
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

  // Known image extensions anywhere in path (before query string)
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)$/.test(pathname)) return true;
  } catch {
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp)(\?|$)/i.test(url)) return true;
  }

  // Known image CDN hostnames
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

  try {
    const { hostname } = new URL(url);
    if (imageCdnHosts.has(hostname)) return true;
    if (/^(?:img|images?|cdn|media|photos?|static|assets)\./i.test(hostname)) return true;
  } catch {
    return false;
  }

  if (/\/(?:photos?|images?|imgs?|pictures?|fotos?|media)s?\//i.test(url)) return true;

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
    // Encode special characters in the URL path (commas, spaces, etc.)
    const safeUrl = encodeSpecialChars(imageUrl);

    // Probe content-type with a small GET request (HEAD often blocked by CDNs)
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

function encodeSpecialChars(url: string): string {
  try {
    const u = new URL(url);
    // Re-encode only the pathname — preserve existing valid percent-encoding
    u.pathname = u.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
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
