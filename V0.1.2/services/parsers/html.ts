// Generieke HTML/tekst-helpers gedeeld door de parser-modules.

export function str(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return '';
}

export function asStringArray(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'string') return val ? [val] : [];
  if (Array.isArray(val)) return val.flatMap((v) => (typeof v === 'string' ? [v] : []));
  return [];
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .trim();
}

export function stripSiteName(title: string): string {
  // Remove "| Site Name" or "- Site Name" suffixes
  return title.replace(/\s*[\|–—-]\s*[^|–—-]{3,50}$/, '').trim();
}

export function extractOgImageUrl(html: string): string | null {
  // og:image:secure_url preferred, then og:image, then twitter:image
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.startsWith('http')) return m[1];
  }
  return null;
}
