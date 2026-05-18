import { generateId } from '../utils/id';
import { downloadImageToLocal } from './imageExtractor';
import { validateImageUri } from '../utils/imageStorage';

export interface ParsedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface ParsedRecipe {
  title: string;
  ingredients: ParsedIngredient[];
  steps: string[];
  sourceUrl: string;
  duration?: number;
  /** Raw remote image URL extracted from the page (og:image etc.) */
  imageUrl?: string;
}

// ─── Image fetch + persist ────────────────────────────────────────────────────

/**
 * Download a remote image URL and save it locally. `referer` should be the
 * page URL the image was discovered on so hotlink-protected CDNs accept the
 * request. Falls through the same hardened pipeline as the full HTML scraper.
 */
export async function extractAndSaveImage(
  url: string,
  referer: string,
): Promise<string | undefined> {
  try {
    console.log(`🔵 [extractAndSaveImage] Downloading image: ${url}`);
    const savedPath = await downloadImageToLocal(url, referer);
    if (!savedPath) {
      console.warn('[extractAndSaveImage] Download pipeline returned no path');
      return undefined;
    }
    // Data URIs are valid for rendering but won't exist on disk.
    if (savedPath.startsWith('data:')) {
      console.log('✅ [extractAndSaveImage] Image ready (data URI fallback)');
      return savedPath;
    }
    const valid = await validateImageUri(savedPath);
    if (!valid) {
      console.warn('[extractAndSaveImage] Saved file failed validation');
      return undefined;
    }
    console.log(`✅ [extractAndSaveImage] Image ready: ${savedPath}`);
    return savedPath;
  } catch (e) {
    console.error('[extractAndSaveImage] Failed:', e instanceof Error ? e.message : e);
    return undefined;
  }
}

// Matches private/loopback ranges that must never be fetched (SSRF guard).
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|\[::1\])/i;

const MAX_HTML_BYTES = 10_000_000; // 10 MB — sane upper bound for a recipe page
const FETCH_TIMEOUT_MS = 15_000;

const RECIPE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function assertSafeUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Ongeldige URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Alleen http(s) URL\'s zijn toegestaan.');
  }
  if (PRIVATE_HOST_RE.test(parsed.hostname)) {
    throw new Error('Interne netwerkadressen zijn niet toegestaan.');
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

  return parseRecipeFromHtml(html, url);
}

/**
 * Exported so tests can drive the parser without making a network call.
 * Order of attempts: JSON-LD → Marley Spoon embedded blob → Dagelijksekost →
 * heuristic. og:image is always pulled from the page meta tags.
 */
export function parseRecipeFromHtml(html: string, url: string): ParsedRecipe {
  // Extract og:image URL from the already-fetched HTML (used later to download image)
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

  // Site-specific: Marley Spoon embeds a recipe JSON blob with `name_with_subtitle`
  // and `name_with_quantity` keys (Rails app, see marleyspoon.nl/menu/<id>-<slug>).
  const ms = extractMarleySpoon(html, url);
  if (ms) return { ...ms, imageUrl: ms.imageUrl ?? imageUrl };

  // Site-specific: Dagelijksekost (uses window.__INITIAL_STATE__ or similar JSON blobs)
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

// ─── JSON-LD helpers ─────────────────────────────────────────────────────────

function collectRecipeNodes(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data)) {
    return data.flatMap(collectRecipeNodes);
  }

  const obj = data as Record<string, unknown>;
  const results: Record<string, unknown>[] = [];

  // `@type` may be a string OR an array of strings (e.g. ["Recipe","NewsArticle"]).
  // Treat any value that includes "Recipe" as a match.
  const rawType = obj['@type'];
  const types = Array.isArray(rawType)
    ? rawType.map(str)
    : [str(rawType)];
  if (types.some((t) => t === 'Recipe' || t.toLowerCase().includes('recipe'))) {
    results.push(obj);
  }

  // Walk @graph array
  if (Array.isArray(obj['@graph'])) {
    results.push(...obj['@graph'].flatMap(collectRecipeNodes));
  }

  return results;
}

function extractFromJsonLd(recipe: Record<string, unknown>, url: string): ParsedRecipe {
  const title =
    str(recipe.name) ||
    str(recipe.headline) ||
    'Recept';

  const rawIngredients = asStringArray(recipe.recipeIngredient);
  const ingredients = rawIngredients.map(parseIngredientString);

  const rawInstructions = recipe.recipeInstructions;
  const steps = extractStepsFromInstructions(rawInstructions);

  // totalTime preferred; fall back to cookTime; fall back to sum of prep + cook
  const totalTime = parseDurationIso8601(str(recipe.totalTime));
  const cookTime = parseDurationIso8601(str(recipe.cookTime));
  const prepTime = parseDurationIso8601(str(recipe.prepTime));
  const duration = totalTime ?? (prepTime != null && cookTime != null ? prepTime + cookTime : cookTime ?? prepTime);

  return { title, ingredients, steps, sourceUrl: url, duration };
}

function extractStepsFromInstructions(raw: unknown): string[] {
  if (!raw) return [];

  if (typeof raw === 'string') {
    return raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === 'string') return [item.trim()].filter(Boolean);
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        // HowToStep
        if (str(o['@type']) === 'HowToStep' || str(o['@type']) === 'HowToSection') {
          if (Array.isArray(o.itemListElement)) {
            return o.itemListElement.flatMap((sub: unknown) => {
              const s = sub as Record<string, unknown>;
              return [str(s.text) || str(s.name)].filter(Boolean);
            });
          }
          return [str(o.text) || str(o.name)].filter(Boolean);
        }
        return [str(o.text) || str(o.name)].filter(Boolean);
      }
      return [];
    });
  }

  return [];
}

function extractDagelijksekost(o: Record<string, unknown>, url: string): ParsedRecipe {
  const title = str(o.title) || str(o.name) || 'Recept';

  const rawIngredients = asStringArray(o.ingredients ?? o.recipeIngredient);
  const ingredients = rawIngredients.map(parseIngredientString);

  const rawStepsFromArray = asStringArray(o.steps ?? o.recipeInstructions);
  const rawSteps =
    rawStepsFromArray.length > 0
      ? rawStepsFromArray
      : extractStepsFromInstructions(o.steps ?? o.recipeInstructions);
  const steps = rawSteps.map((s) => s.trim()).filter(Boolean);

  const cookMins = o.cooking_time ? parseDurationNumber(Number(o.cooking_time)) : undefined;
  const prepMins = o.prep_time ? parseDurationNumber(Number(o.prep_time)) : undefined;
  const duration =
    cookMins != null && prepMins != null
      ? cookMins + prepMins
      : cookMins ?? prepMins;

  return { title, ingredients, steps, sourceUrl: url, duration };
}

// ─── Marley Spoon ────────────────────────────────────────────────────────────
//
// Marley Spoon (marleyspoon.nl / .com / .de / .be / .at / .se) is a Rails app
// that SSRs each recipe page and embeds the full recipe object inside an
// inline <script> tag. The object uses snake_case keys unique to their API:
//   - name_with_subtitle           → recipe title
//   - ingredients[].name_with_quantity  → quantified ingredient line
//   - assumed_ingredients[].name   → pantry items ("olijfolie, peper, zout")
//   - steps[].title / description  → numbered step text
//   - image.large                  → hero image URL
//   - cooking_time                 → minutes (number)
// Because these keys are very specific, we can fingerprint them anywhere in
// the page without depending on the URL.

function extractMarleySpoon(html: string, url: string): ParsedRecipe | null {
  const blob = findMarleySpoonBlob(html);
  if (!blob) return null;

  const title =
    str(blob.name_with_subtitle) ||
    str(blob.name) ||
    str(blob.title) ||
    '';

  const ingredients: ParsedIngredient[] = [];
  if (Array.isArray(blob.ingredients)) {
    for (const raw of blob.ingredients) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const text = str(o.name_with_quantity) || str(o.name);
      if (text) ingredients.push(parseIngredientString(text));
    }
  }
  if (Array.isArray(blob.assumed_ingredients)) {
    for (const raw of blob.assumed_ingredients) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const text = str(o.name);
      if (text) ingredients.push(parseIngredientString(text));
    }
  }

  const steps: string[] = [];
  if (Array.isArray(blob.steps)) {
    for (const raw of blob.steps) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const description = str(o.description) || str(o.text);
      const stepTitle = str(o.title);
      // Prefer the longer body text; keep the title as a prefix when both exist.
      const combined =
        description && stepTitle && !description.toLowerCase().startsWith(stepTitle.toLowerCase())
          ? `${stepTitle}. ${description}`
          : description || stepTitle;
      const cleaned = combined.replace(/\s+/g, ' ').trim();
      if (cleaned) steps.push(cleaned);
    }
  }

  if (!title || (ingredients.length === 0 && steps.length === 0)) return null;

  let imageUrl: string | undefined;
  const img = blob.image;
  if (img && typeof img === 'object') {
    const i = img as Record<string, unknown>;
    imageUrl =
      str(i.large) || str(i.original) || str(i.medium) || str(i.small) || undefined;
  } else if (typeof img === 'string') {
    imageUrl = img;
  }

  const rawCookTime = Number(blob.cooking_time);
  const duration =
    Number.isFinite(rawCookTime) && rawCookTime > 0 && rawCookTime < 1440
      ? rawCookTime
      : undefined;

  return { title, ingredients, steps, sourceUrl: url, duration, imageUrl };
}

function findMarleySpoonBlob(html: string): Record<string, unknown> | null {
  // Marley Spoon's signature is unique enough that we can scan the raw HTML
  // for `"name_with_subtitle"` and walk back to the enclosing JSON object.
  const SIG = '"name_with_subtitle"';
  const sigIdx = html.indexOf(SIG);
  if (sigIdx < 0) return null;

  // Walk back, trying each '{' as a potential JSON start. The first one that
  // parses into an object containing the signature wins. Cap attempts so a
  // pathological page can't pin the CPU.
  const MAX_ATTEMPTS = 200;
  let attempts = 0;
  for (let i = sigIdx; i >= 0 && attempts < MAX_ATTEMPTS; i--) {
    if (html[i] !== '{') continue;
    attempts++;
    const parsed = tryParseJsonObjectAt(html, i);
    if (!parsed || typeof parsed !== 'object') continue;
    const target = findObjectWithKey(parsed, 'name_with_subtitle');
    if (target) return target;
  }

  return null;
}

/** Parse a JSON object starting at `s[start]`, balancing braces with full string-state tracking. Returns null if invalid. */
function tryParseJsonObjectAt(s: string, start: number): unknown | null {
  if (s[start] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inStr = false;
      }
      continue;
    }
    if (c === '"') {
      inStr = true;
    } else if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function findObjectWithKey(node: unknown, key: string): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findObjectWithKey(item, key);
      if (found) return found;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  if (key in obj) return obj;
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const found = findObjectWithKey(v, key);
      if (found) return found;
    }
  }
  return null;
}

function tryParseHeuristic(html: string, url: string): ParsedRecipe | null {
  const title =
    extractH1(html) ||
    stripSiteName(extractMetaContent(html, 'og:title')) ||
    extractMetaContent(html, 'twitter:title') ||
    '';

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const ingredients = extractHeuristicIngredients(cleaned);
  const steps = extractHeuristicSteps(cleaned);
  const duration = extractHeuristicDuration(html); // search raw html for time patterns

  if (!title && ingredients.length === 0) return null;
  return { title, ingredients, steps, sourceUrl: url, duration };
}

// ─── Heuristic extractors ────────────────────────────────────────────────────

function extractH1(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  return stripTags(m[1]).trim();
}

function extractMetaContent(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'));
  return m ? m[1].trim() : '';
}

function extractHeuristicIngredients(html: string): ParsedIngredient[] {
  // Look for common ingredient list containers
  const containerPatterns = [
    /class=["'][^"']*ingredient[^"']*["'][^>]*>([\s\S]*?)<\/(?:ul|ol|div)/gi,
    /id=["'][^"']*ingredient[^"']*["'][^>]*>([\s\S]*?)<\/(?:ul|ol|div)/gi,
  ];

  for (const pattern of containerPatterns) {
    const m = pattern.exec(html);
    if (m) {
      const items = extractListItems(m[1]);
      if (items.length > 0) {
        return items.map(parseIngredientString);
      }
    }
  }

  return [];
}

function extractHeuristicSteps(html: string): string[] {
  const containerPatterns = [
    /class=["'][^"']*(?:instruction|direction|method|step)[^"']*["'][^>]*>([\s\S]*?)<\/(?:ul|ol|div)/gi,
    /id=["'][^"']*(?:instruction|direction|method|step)[^"']*["'][^>]*>([\s\S]*?)<\/(?:ul|ol|div)/gi,
  ];

  for (const pattern of containerPatterns) {
    const m = pattern.exec(html);
    if (m) {
      const items = extractListItems(m[1]);
      if (items.length > 0) return items;
    }
  }

  return [];
}

function extractListItems(html: string): string[] {
  const items: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text) items.push(text);
  }
  return items;
}

function extractHeuristicDuration(html: string): number | undefined {
  const patterns = [
    // ISO8601 inline: cookTime":"PT45M or totalTime":"PT1H30M
    /(?:totalTime|cookTime)['":\s]+["']?(PT[^"'\s<]+)/i,
    // Plain minutes in structured data attributes
    /(?:cook(?:ing)?|total|prep)[_\-\s]*time['":\s=]*(\d{1,3})\s*(?:min|minute|minuten)/i,
    // "45 minuten" near a time keyword
    /\b(\d{1,3})\s*(?:min|minute|minuten)s?\b/i,
  ];

  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const raw = m[1];
      // Could be ISO string or plain number
      if (raw.startsWith('PT')) {
        return parseDurationIso8601(raw);
      }
      const mins = parseInt(raw, 10);
      if (mins > 0 && mins < 1440) return mins;
    }
  }

  return undefined;
}

// ─── Duration parsers ────────────────────────────────────────────────────────

function parseDurationIso8601(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  // e.g. PT30M, PT1H30M, PT1H, P0DT45M
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return undefined;
  const hours = m[1] ? parseInt(m[1], 10) : 0;
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 && total < 1440 ? total : undefined;
}

function parseDurationNumber(mins: number): number | undefined {
  return mins > 0 && mins < 1440 ? mins : undefined;
}

// ─── Ingredient string parser ────────────────────────────────────────────────

const UNITS_NL = [
  'eetlepels?', 'el', 'theelepels?', 'tl', 'kopjes?', 'kop',
  'liter', 'l', 'deciliter', 'dl', 'milliliter', 'ml',
  'kilogram', 'kg', 'gram', 'g', 'pond',
  'snufje', 'snuf', 'mespunt', 'takje', 'takjes?', 'bosje', 'bosjes?',
  'stuk', 'stuks', 'teen', 'tenen',
  'plak', 'plakjes?', 'blad', 'blaadjes?',
];

const UNITS_EN = [
  'tablespoons?', 'tbsp', 'teaspoons?', 'tsp',
  'cups?', 'pints?', 'quarts?', 'gallons?',
  'ounces?', 'oz', 'pounds?', 'lb', 'lbs',
  'liters?', 'l', 'milliliters?', 'ml',
  'kilograms?', 'kg', 'grams?', 'g',
  'cloves?', 'bunches?', 'bunch', 'sprigs?', 'leaves?', 'slices?',
  'cans?', 'packages?', 'pkg', 'pieces?',
];

const ALL_UNITS = [...UNITS_NL, ...UNITS_EN].join('|');
const UNIT_RE = new RegExp(`^(${ALL_UNITS})\\b\\.?`, 'i');
const FRACTION_MAP: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

function parseIngredientString(raw: string): ParsedIngredient {
  let s = stripTags(raw).trim();

  // Replace unicode fractions
  for (const [frac, val] of Object.entries(FRACTION_MAP)) {
    s = s.replace(frac, ` ${val} `);
  }

  // Replace "1/2" style fractions
  s = s.replace(/(\d+)\s*\/\s*(\d+)/g, (_, n, d) =>
    String(Number(n) / Number(d)),
  );

  // Normalise multiple spaces
  s = s.replace(/\s+/g, ' ').trim();

  // Match leading quantity: optional whole number + optional decimal
  const qtyMatch = s.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)?\s*/);
  let quantity = 1;
  let rest = s;

  if (qtyMatch) {
    const main = parseFloat(qtyMatch[1]);
    const frac = qtyMatch[2] ? parseFloat(qtyMatch[2]) : 0;
    const safeMain = isNaN(main) || main < 0 || main > 9999 ? 1 : main;
    const safeFrac = isNaN(frac) || frac < 0 || frac >= 1 ? 0 : frac;
    quantity = safeMain + safeFrac;
    rest = s.slice(qtyMatch[0].length).trim();
  } else {
    // no leading number
    rest = s;
  }

  // Match unit
  const unitMatch = rest.match(UNIT_RE);
  let unit = '';
  if (unitMatch) {
    unit = unitMatch[0].replace(/\.$/, '').trim();
    rest = rest.slice(unitMatch[0].length).trim();
  }

  const name = rest.trim() || raw.trim();

  return { id: generateId(), name, quantity, unit };
}

// ─── Tiny utilities ──────────────────────────────────────────────────────────

function str(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return '';
}

function asStringArray(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'string') return val ? [val] : [];
  if (Array.isArray(val)) return val.flatMap((v) => (typeof v === 'string' ? [v] : []));
  return [];
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

function stripSiteName(title: string): string {
  // Remove "| Site Name" or "- Site Name" suffixes
  return title.replace(/\s*[\|–—-]\s*[^|–—-]{3,50}$/, '').trim();
}

function extractOgImageUrl(html: string): string | null {
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
