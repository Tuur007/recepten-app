interface ImageCandidate {
  url: string;
  width?: number;
  height?: number;
  size?: number;
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

  const jsonLdRegex = /"image":\s*"?([^"}\n]+)"?/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    const url = normalizeUrl(match[1], baseUrl);
    if (isValidImageUrl(url)) {
      const key = url.split('?')[0];
      if (!candidates.has(key)) {
        candidates.set(key, { url, score: 85 });
      }
    }
  }

  const ogMatch =
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (ogMatch) {
    const url = normalizeUrl(ogMatch[1], baseUrl);
    if (isValidImageUrl(url)) {
      const key = url.split('?')[0];
      if (!candidates.has(key)) {
        candidates.set(key, { url, score: 95 });
      }
    }
  }

  const twitterMatch =
    html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i);
  if (twitterMatch) {
    const url = normalizeUrl(twitterMatch[1], baseUrl);
    if (isValidImageUrl(url)) {
      const key = url.split('?')[0];
      if (!candidates.has(key)) {
        candidates.set(key, { url, score: 90 });
      }
    }
  }

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = normalizeUrl(match[1], baseUrl);
    if (isValidImageUrl(url)) {
      const key = url.split('?')[0];
      if (!candidates.has(key)) {
        const size = extractImageSize(match[0]);
        let score = 60;
        if (
          url.includes('recipe') ||
          url.includes('food') ||
          url.includes('dish') ||
          url.includes('recept')
        ) {
          score = 75;
        }
        if (size?.width && size.width >= 400 && size?.height && size.height >= 300) {
          score += 15;
        }
        candidates.set(key, { url, ...size, score });
      }
    }
  }

  return Array.from(candidates.values());
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
  const lowerUrl = url.toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const hasExt = validExtensions.some((ext) => lowerUrl.includes(ext));
  const noJavascript = !lowerUrl.includes('javascript:');
  const noData = !lowerUrl.startsWith('data:');
  return hasExt && noJavascript && noData;
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
    const filename = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const dir = `${FS.documentDirectory}images`;
    const filepath = `${dir}/${filename}`;

    const dirInfo = await FS.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FS.makeDirectoryAsync(dir, { intermediates: true });
    }

    await FS.downloadAsync(imageUrl, filepath);

    const fileInfo = await FS.getInfoAsync(filepath);
    if (fileInfo.exists) {
      return filepath;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
