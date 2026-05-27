import { log, warn, error } from '../../utils/logger';
import { downloadImageToLocal } from '../imageExtractor';
import { validateImageUri } from '../../utils/imageStorage';
import { extractOgImageUrl } from './html';
import { collectRecipeNodes, extractFromJsonLd } from './jsonld';
import { extractDagelijksekost } from './dagelijksekost';
import { tryParseHeuristic } from './heuristic';
import { isMarleySpoonUrl, fetchMarleySpoonRecipe } from './marleyspoon';
import type { ParsedRecipe } from './types';

// Matches private/loopback ranges that must never be fetched (SSRF guard).
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|\[::1\])/i;

export const MAX_HTML_BYTES = 10_000_000; // 10 MB — sane upper bound for a recipe page
export const FETCH_TIMEOUT_MS = 15_000;

export const RECIPE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export function assertSafeUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Ongeldige URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error("Alleen http(s) URL's zijn toegestaan.");
  }
  if (PRIVATE_HOST_RE.test(parsed.hostname)) {
    throw new Error('Interne netwerkadressen zijn niet toegestaan.');
  }
}

/**
 * Download a remote image URL and save it locally. `referer` should be the page
 * URL the image was discovered on so hotlink-protected CDNs accept the request.
 */
export async function extractAndSaveImage(
  url: string,
  referer: string,
): Promise<string | undefined> {
  try {
    log(`[extractAndSaveImage] Downloading image: ${url}`);
    const savedPath = await downloadImageToLocal(url, referer);
    if (!savedPath) {
      warn('[extractAndSaveImage] Download pipeline returned no path');
      return undefined;
    }
    // Data URIs are valid for rendering but won't exist on disk.
    if (savedPath.startsWith('data:')) {
      log('[extractAndSaveImage] Image ready (data URI fallback)');
      return savedPath;
    }
    const valid = await validateImageUri(savedPath);
    if (!valid) {
      warn('[extractAndSaveImage] Saved file failed validation');
      return undefined;
    }
    log(`[extractAndSaveImage] Image ready: ${savedPath}`);
    return savedPath;
  } catch (e) {
    error('[extractAndSaveImage] Failed:', e instanceof Error ? e.message : e);
    return undefined;
  }
}

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  assertSafeUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // Send a Referer pointing at the site's root — some Cloudflare-protected
  // hosts (Marley Spoon among them) 403 fetches that arrive without one.
  let referer = '';
  try {
    const u = new URL(url);
    referer = `${u.protocol}//${u.host}/`;
  } catch {
    /* unreachable: assertSafeUrl already validated */
  }

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': RECIPE_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        ...(referer ? { Referer: referer } : {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Kan pagina niet ophalen (HTTP ${response.status})`);
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_HTML_BYTES) {
    throw new Error('Pagina is te groot om te verwerken.');
  }

  const html = await response.text();
  if (html.length > MAX_HTML_BYTES) {
    throw new Error('Pagina is te groot om te verwerken.');
  }

  // Site-specific: Marley Spoon's recipe pages are an empty SPA shell. Don't
  // silently fall back to the HTML parser on failure — the HTML genuinely has
  // no recipe content, so a fallback would surface a misleading stub.
  if (isMarleySpoonUrl(url)) {
    const ms = await fetchMarleySpoonRecipe(url, html, {
      userAgent: RECIPE_UA,
      timeoutMs: FETCH_TIMEOUT_MS,
    });
    const imageUrl = extractOgImageUrl(html) ?? undefined;
    return { ...ms, imageUrl: ms.imageUrl ?? imageUrl };
  }

  return parseRecipeFromHtml(html, url);
}

/**
 * Exported so tests can drive the parser without a network call. Order of
 * attempts: JSON-LD → Dagelijksekost → heuristic. og:image is always pulled
 * from the page meta tags.
 */
export function parseRecipeFromHtml(html: string, url: string): ParsedRecipe {
  const imageUrl = extractOgImageUrl(html) ?? undefined;

  // Try all JSON-LD blocks — may contain Recipe schema
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data: unknown = JSON.parse(match[1].trim());
      const recipes = collectRecipeNodes(data);
      for (const node of recipes) {
        const parsed = extractFromJsonLd(node, url);
        if (parsed.title && (parsed.ingredients.length > 0 || parsed.steps.length > 0)) {
          return { ...parsed, imageUrl: parsed.imageUrl ?? imageUrl };
        }
      }
    } catch {
      // malformed JSON-LD — skip
    }
  }

  // Site-specific: Dagelijksekost (window.__RECIPE__ JSON blob)
  const dagMatch = html.match(/window\.__RECIPE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (dagMatch) {
    try {
      const obj = JSON.parse(dagMatch[1]) as Record<string, unknown>;
      return { ...extractDagelijksekost(obj, url), imageUrl };
    } catch {
      // fall through
    }
  }

  // Heuristic fallback
  const heuristic = tryParseHeuristic(html, url);
  if (heuristic) return { ...heuristic, imageUrl };

  throw new Error('Kon geen recept vinden op deze pagina. Probeer een andere URL.');
}
