import { KNOWN_UNITS } from '../utils/units';

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface ParsedRecipe {
  title: string;
  ingredients: ParsedIngredient[];
  steps: string[];
  sourceUrl: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const html = await fetchHtml(url);

  const jsonLdResult = tryParseJsonLd(html, url);
  if (jsonLdResult) return jsonLdResult;

  throw new Error(
    'Could not automatically extract a recipe from this page.\n' +
    'Please fill in the details manually.',
  );
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ReceptenApp/1.0 (recipe-importer)' },
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    return await response.text();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// JSON-LD strategy (schema.org/Recipe) — works on most food sites
// ---------------------------------------------------------------------------

function tryParseJsonLd(html: string, url: string): ParsedRecipe | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data: unknown = JSON.parse(match[1]);
      const recipeNode = findRecipeNode(data);
      if (recipeNode) return extractFromJsonLd(recipeNode, url);
    } catch {
      // malformed JSON — continue to next script tag
    }
  }

  return null;
}

function findRecipeNode(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  const obj = data as Record<string, unknown>;
  const type = obj['@type'];

  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj;
  }

  if (obj['@graph']) {
    return findRecipeNode(obj['@graph']);
  }

  return null;
}

function extractFromJsonLd(recipe: Record<string, unknown>, url: string): ParsedRecipe {
  const title = typeof recipe.name === 'string' ? recipe.name : 'Untitled Recipe';

  const rawIngredients = Array.isArray(recipe.recipeIngredient)
    ? (recipe.recipeIngredient as unknown[]).map(String)
    : [];

  const ingredients: ParsedIngredient[] = rawIngredients.map(parseIngredientString);

  const instructions = recipe.recipeInstructions;
  const steps: string[] = [];

  if (Array.isArray(instructions)) {
    for (const step of instructions) {
      if (typeof step === 'string') {
        steps.push(step.trim());
      } else if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>;
        if (s['@type'] === 'HowToSection' && Array.isArray(s.itemListElement)) {
          for (const sub of s.itemListElement as Record<string, unknown>[]) {
            const text = typeof sub.text === 'string' ? sub.text.trim() : '';
            if (text) steps.push(text);
          }
        } else if (typeof s.text === 'string') {
          steps.push(s.text.trim());
        }
      }
    }
  } else if (typeof instructions === 'string') {
    steps.push(...instructions.split('\n').map(s => s.trim()).filter(Boolean));
  }

  return { title, ingredients, steps, sourceUrl: url };
}

// ---------------------------------------------------------------------------
// Ingredient string parser  e.g. "1½ cups all-purpose flour" → structured
// ---------------------------------------------------------------------------

export function parseIngredientString(raw: string): ParsedIngredient {
  // Normalise Unicode fractions
  const text = raw
    .trim()
    .replace(/¼/g, '0.25')
    .replace(/½/g, '0.5')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.333')
    .replace(/⅔/g, '0.667')
    .replace(/⅛/g, '0.125');

  let remaining = text;
  let quantity = 1;

  // Match mixed numbers "1 1/2", plain fractions "1/2", or decimals "1.5"
  const qMatch = remaining.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*/);
  if (qMatch) {
    const q = qMatch[1].trim();
    if (q.includes('/')) {
      const parts = q.split('/');
      quantity = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else if (/\d\s+\d/.test(q)) {
      const [whole, frac] = q.split(/\s+/);
      const [num, den] = frac.split('/');
      quantity = parseFloat(whole) + parseFloat(num) / parseFloat(den);
    } else {
      quantity = parseFloat(q);
    }
    remaining = remaining.slice(qMatch[0].length);
  }

  // Match unit (longest-first list so "tablespoons" beats "table")
  const unitPattern = new RegExp(`^(${KNOWN_UNITS.join('|')})\\b\\.?\\s*`, 'i');
  const uMatch = remaining.match(unitPattern);
  let unit = '';

  if (uMatch) {
    unit = uMatch[1].toLowerCase();
    remaining = remaining.slice(uMatch[0].length);
  }

  const name = remaining.trim() || raw.trim();

  return { name, quantity: isFinite(quantity) ? quantity : 1, unit };
}
