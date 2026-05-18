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

  // Site-specific: Marley Spoon's recipe pages are an empty SPA shell — the
  // actual data is loaded by JS via a GraphQL call to api.marleyspoon.com.
  // We replicate that request using the JWT embedded in the page bootstrap.
  // Don't silently fall back to the HTML parser on failure: the HTML genuinely
  // has no recipe content, so a fallback would surface a misleading stub
  // recipe (title + image, no ingredients/steps) instead of the real error.
  if (isMarleySpoonUrl(url)) {
    const ms = await fetchMarleySpoonRecipe(url, html);
    const imageUrl = extractOgImageUrl(html) ?? undefined;
    return { ...ms, imageUrl: ms.imageUrl ?? imageUrl };
  }

  return parseRecipeFromHtml(html, url);
}

/**
 * Exported so tests can drive the parser without making a network call.
 * Order of attempts: JSON-LD → Dagelijksekost → heuristic. og:image is always
 * pulled from the page meta tags.
 *
 * Marley Spoon needs a second async fetch (GraphQL API) and is handled in
 * `parseRecipeFromUrl` instead — see `fetchMarleySpoonRecipe`.
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
// Marley Spoon (marleyspoon.nl / .com / .be / .de / .at / .se / .dk) ships an
// empty SPA shell for /menu/<id>-<slug> pages — ingredients & steps are not in
// the HTML at all. The page bootstraps with a short-lived JWT in
// `window.gon.api_token` and then POSTs a GraphQL query to
// `https://api.marleyspoon.com/graphql` (host comes from `gon.api_host`).
//
// We replicate that flow:
//   1. Pull `gon.api_token` + `gon.api_host` out of the inline <script>.
//   2. Extract the numeric recipe ID from the URL path.
//   3. Send our own GraphQL query asking for exactly the fields we need.
//   4. Convert the response to our ParsedRecipe shape.
//
// The query mirrors the field names observed in the real production response
// (camelCase, GraphQL convention): title/subtitle, shippedIngredients{ name,
// nameWithQuantity }, assumedIngredients{ name }, steps{ title, description },
// image{ url }, duration{ from, to, unit }.

const MARLEY_SPOON_HOST_RE = /^(?:www\.)?marleyspoon\.(?:com|nl|be|de|at|se|dk)$/i;

const MARLEY_SPOON_QUERY = `query GetRecipe($id: ID!) {
  recipe(id: $id) {
    id
    title
    subtitle
    image { url }
    duration { from to unit }
    shippedIngredients { name nameWithQuantity }
    assumedIngredients { name }
    steps { title description }
  }
}`;

function isMarleySpoonUrl(url: string): boolean {
  try {
    return MARLEY_SPOON_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function extractMarleySpoonRecipeId(url: string): string | null {
  try {
    const m = new URL(url).pathname.match(/\/menu\/(\d+)(?:[-/]|$)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

interface GonBootstrap {
  apiToken: string;
  apiHost: string;
}

function extractGonBootstrap(html: string): GonBootstrap | null {
  const tokenMatch = html.match(/gon\.api_token\s*=\s*"([^"]+)"/);
  const hostMatch = html.match(/gon\.api_host\s*=\s*"([^"]+)"/);
  if (!tokenMatch || !hostMatch) return null;
  // gon.api_host is JSON-escaped (e.g. "https:\/\/api.marleyspoon.com").
  const apiHost = hostMatch[1].replace(/\\\//g, '/');
  if (!/^https?:\/\//i.test(apiHost)) return null;
  return { apiToken: tokenMatch[1], apiHost };
}

/**
 * Fetch a Marley Spoon recipe via the public GraphQL API.
 * Throws an Error with a descriptive message if anything goes wrong — Marley
 * Spoon's `/menu/<id>-<slug>` pages have no recipe content in the HTML, so
 * silently falling back to the heuristic parser only produces a stub with a
 * title and a hero image and would mislead the user into thinking the import
 * worked. Surface the real failure instead.
 */
async function fetchMarleySpoonRecipe(
  url: string,
  html: string,
): Promise<ParsedRecipe> {
  const recipeId = extractMarleySpoonRecipeId(url);
  if (!recipeId) {
    throw new Error('Geen recept-ID gevonden in deze Marley Spoon URL.');
  }

  const gon = extractGonBootstrap(html);
  if (!gon) {
    console.warn('[marleyspoon] no gon.api_token in HTML');
    throw new Error('Kon de toegangstoken niet uit de pagina lezen.');
  }

  console.log(
    `🔵 [marleyspoon] POST ${gon.apiHost}/graphql for recipe ${recipeId}`,
  );

  const origin = (() => {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}`;
    } catch {
      return '';
    }
  })();

  const body = JSON.stringify({
    query: MARLEY_SPOON_QUERY,
    variables: { id: recipeId },
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${gon.apiHost}/graphql`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: '*/*',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gon.apiToken}`,
        'User-Agent': RECIPE_UA,
        ...(origin ? { Origin: origin, Referer: `${origin}/` } : {}),
      },
      body,
    });
  } catch (e) {
    console.warn('[marleyspoon] GraphQL fetch failed:', e instanceof Error ? e.message : e);
    throw new Error('Marley Spoon API onbereikbaar. Probeer opnieuw.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.warn('[marleyspoon] GraphQL HTTP', response.status);
    throw new Error(`Marley Spoon API gaf fout (HTTP ${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    console.warn('[marleyspoon] GraphQL response was not JSON');
    throw new Error('Marley Spoon API gaf geen geldig JSON-antwoord.');
  }

  const obj = payload as Record<string, unknown> | null;
  const errors = obj && Array.isArray(obj.errors) ? obj.errors : null;
  if (errors && errors.length > 0) {
    const summary = JSON.stringify(errors).slice(0, 200);
    console.warn('[marleyspoon] GraphQL errors:', summary);
    throw new Error(`Marley Spoon API meldt: ${summary}`);
  }

  const data = obj?.data;
  const recipe =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>).recipe
      : null;
  if (!recipe || typeof recipe !== 'object') {
    console.warn('[marleyspoon] empty data.recipe in response');
    throw new Error('Marley Spoon API gaf een leeg recept terug.');
  }

  const converted = convertMarleySpoonRecipe(recipe as Record<string, unknown>, url);
  console.log(
    `✅ [marleyspoon] recipe parsed: ${converted.ingredients.length} ingredients, ${converted.steps.length} steps`,
  );
  return converted;
}

/**
 * Map a Marley Spoon GraphQL `recipe` object to our ParsedRecipe shape.
 * Exported (via parseMarleySpoonRecipeJson below) so the conversion is
 * unit-testable without making a real GraphQL call.
 */
function convertMarleySpoonRecipe(
  r: Record<string, unknown>,
  url: string,
): ParsedRecipe {
  const titleMain = str(r.title);
  const subtitle = str(r.subtitle);
  const title = subtitle ? `${titleMain} ${subtitle}`.trim() : titleMain || 'Recept';

  const ingredients: ParsedIngredient[] = [];

  if (Array.isArray(r.shippedIngredients)) {
    for (const raw of r.shippedIngredients) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const text = str(o.nameWithQuantity) || str(o.name);
      if (text) ingredients.push(parseIngredientString(normaliseMarleySpoonQuantity(text)));
    }
  }
  if (Array.isArray(r.assumedIngredients)) {
    for (const raw of r.assumedIngredients) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      const text = str(o.name);
      if (text) ingredients.push(parseIngredientString(text));
    }
  }

  const steps: string[] = [];
  if (Array.isArray(r.steps)) {
    for (const raw of r.steps) {
      if (!raw || typeof raw !== 'object') continue;
      const o = raw as Record<string, unknown>;
      // Step descriptions use Markdown-ish underscore bolding (e.g. `__noedels__`).
      // Strip the markers so they don't leak into the saved recipe text.
      const description = str(o.description).replace(/__([^_]+)__/g, '$1');
      const stepTitle = str(o.title);
      const body =
        description && stepTitle &&
        !description.toLowerCase().startsWith(stepTitle.toLowerCase())
          ? `${stepTitle}. ${description}`
          : description || stepTitle;
      const cleaned = body.replace(/\s+/g, ' ').trim();
      if (cleaned) steps.push(cleaned);
    }
  }

  if (!title || (ingredients.length === 0 && steps.length === 0)) {
    // GraphQL responded, but with nothing usable — surface as null so the
    // caller's heuristic fallback runs.
    return { title, ingredients, steps, sourceUrl: url };
  }

  let duration: number | undefined;
  const d = r.duration;
  if (d && typeof d === 'object') {
    const dd = d as Record<string, unknown>;
    const to = Number(dd.to);
    const from = Number(dd.from);
    if (Number.isFinite(to) && to > 0 && to < 1440) duration = to;
    else if (Number.isFinite(from) && from > 0 && from < 1440) duration = from;
  }

  let imageUrl: string | undefined;
  const img = r.image;
  if (img && typeof img === 'object') {
    const u = str((img as Record<string, unknown>).url);
    if (u) imageUrl = u;
  }

  return { title, ingredients, steps, sourceUrl: url, duration, imageUrl };
}

/**
 * Marley Spoon writes quantities glued to the unit ("100g glasnoedels",
 * "200ml kokosmelk", "1el olie"). Insert a space so the generic ingredient
 * parser, which expects "100 g …", picks them up correctly.
 */
function normaliseMarleySpoonQuantity(s: string): string {
  return s.replace(/^(\d+(?:[.,]\d+)?)([a-zA-Zà-ÿ])/u, '$1 $2');
}

/** Test hook: convert a previously-captured GraphQL `data.recipe` payload. */
export function parseMarleySpoonRecipeJson(
  recipe: Record<string, unknown>,
  url: string,
): ParsedRecipe {
  return convertMarleySpoonRecipe(recipe, url);
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
