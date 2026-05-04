import { generateId } from '../utils/id';

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
}

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Kan pagina niet ophalen (HTTP ${response.status})`);
  }

  const html = await response.text();

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
          return parsed;
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
      return extractDagelijksekost(obj, url);
    } catch {
      // fall through
    }
  }

  // Heuristic fallback
  const heuristic = tryParseHeuristic(html, url);
  if (heuristic) return heuristic;

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

  const type = str(obj['@type']);
  if (type === 'Recipe' || type.toLowerCase().includes('recipe')) {
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
    stripSiteName(extractMetaContent('', 'og:title')) ||
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

  const rawSteps =
    asStringArray(o.steps ?? o.recipeInstructions) ||
    extractStepsFromInstructions(o.steps ?? o.recipeInstructions);
  const steps = rawSteps.map((s) => s.trim()).filter(Boolean);

  const cookMins = o.cooking_time ? parseDurationNumber(Number(o.cooking_time)) : undefined;
  const prepMins = o.prep_time ? parseDurationNumber(Number(o.prep_time)) : undefined;
  const duration =
    cookMins != null && prepMins != null
      ? cookMins + prepMins
      : cookMins ?? prepMins;

  return { title, ingredients, steps, sourceUrl: url, duration };
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
    quantity = main + frac;
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
