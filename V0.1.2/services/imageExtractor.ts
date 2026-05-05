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

    const best = candidates.sort((a, b) => b.score - a.score)[0];
    return await downloadImage(best.url);
  } catch {
    return undefined;
  }
}

function extractImageCandidates(html: string, baseUrl: string): ImageCandidate[] {
  const candidates: Map<string, ImageCandidate> = new Map();

  const addCandidate = (rawUrl: string, score: number, extra?: Partial<ImageCandidate>) => {
    const url = normalizeUrl(rawUrl, baseUrl);
    if (!isValidImageUrl(url)) return;
    const key = url.split('?')[0];
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
    const rawUrl = match[1];
    const url = normalizeUrl(rawUrl, baseUrl);
    if (!isValidImageUrl(url)) continue;
    const key = url.split('?')[0];
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
  url = url.trim().replace(/['"]/g, '');
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) {
    const base = new URL(baseUrl);
    return base.origin + url;
  }
  if (url.startsWith('http')) return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('javascript:') || lower.startsWith('data:')) return false;

  // Known image extensions
  if (/\.(jpg|jpeg|png|webp|gif|avif|bmp|tiff?)(\?|$)/i.test(url)) return true;

  // Extensionless but clearly an image by path pattern
  if (/\/(?:photos?|images?|imgs?|pictures?|fotos?|media)s?\//i.test(url)) return true;

  // Known image CDN hostnames (extensionless URLs are normal here)
  const imageCdnHosts = [
    'recipe-service.prod.cloud.jumbo.com',
    'images.ctfassets.net',
    'res.cloudinary.com',
    'cdn.sanity.io',
    'media.contentful.com',
    'images.squarespace-cdn.com',
    'i.imgur.com',
    'static.ah.nl',
    'images.immediate.co.uk',
    'cdn.ah.nl',
    'assets.jumbo.com',
    'img.youtube.com',
    'i.ytimg.com',
  ];

  try {
    const { hostname } = new URL(url);
    if (imageCdnHosts.includes(hostname)) return true;
    // Generic CDN subdomain patterns: img.*, images.*, cdn.*, media.*, photos.*
    if (/^(?:img|images?|cdn|media|photos?|static|assets)\./i.test(hostname)) return true;
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
    // Probe Content-Type to determine correct extension
    let ext = 'jpg';
    try {
      const head = await fetch(imageUrl, { method: 'HEAD' });
      const ct = head.headers.get('content-type') ?? '';
      if (ct.includes('png')) ext = 'png';
      else if (ct.includes('webp')) ext = 'webp';
      else if (ct.includes('gif')) ext = 'gif';
      else if (ct.includes('avif')) ext = 'avif';
    } catch {
      // fall back to guessing from URL
      const urlExt = imageUrl.match(/\.(jpg|jpeg|png|webp|gif|avif)/i)?.[1];
      if (urlExt) ext = urlExt.toLowerCase() === 'jpeg' ? 'jpg' : urlExt.toLowerCase();
    }

    const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const dir = `${FS.documentDirectory}images`;
    const filepath = `${dir}/${filename}`;

    const dirInfo = await FS.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FS.makeDirectoryAsync(dir, { intermediates: true });
    }

    const result = await FS.downloadAsync(imageUrl, filepath);
    if (result.status !== 200) return undefined;

    const fileInfo = await FS.getInfoAsync(filepath);
    return fileInfo.exists ? filepath : undefined;
  } catch {
    return undefined;
  }
}
