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

  // 1. JSON-LD schema.org/Recipe — works on most food blogs & WordPress sites
  const jsonLd = tryParseJsonLd(html, url);
  if (jsonLd && isUsable(jsonLd)) return jsonLd;

  // 2. Next.js __NEXT_DATA__ — dagelijksekost.een.be and similar SSR sites
  const nextData = tryParseNextData(html, url);
  if (nextData && isUsable(nextData)) return nextData;

  // 3. HTML Microdata (itemprop attributes)
  const microdata = tryParseMicrodata(html, url);
  if (microdata && isUsable(microdata)) return microdata;

  // 4. Generic HTML heuristic — Dutch/Belgian recipe class-name patterns
  const heuristic = tryParseHeuristic(html, url);
  if (heuristic && isUsable(heuristic)) return heuristic;

  // 5. Last-resort: extract whatever title we can find + empty ingredient list
  //    so the user can fill in details manually rather than seeing a hard error.
  const fallbackTitle =
    extractMetaContent(html, 'og:title') ||
    extractH1(html) ||
    extractTitleTag(html) ||
    '';
  if (fallbackTitle) {
    return { title: fallbackTitle, ingredients: [], steps: [], sourceUrl: url };
  }

  throw new Error(
    'Kon het recept niet automatisch uitlezen van deze pagina.\n' +
      'Vul de gegevens hieronder handmatig in.',
  );
}

function isUsable(r: ParsedRecipe): boolean {
  return r.title.trim().length > 0 && (r.ingredients.length > 0 || r.steps.length > 0);
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ' +
          'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl-BE,nl;q=0.9,en-GB;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) throw new Error(`Server antwoordde met ${response.status}`);
    return await response.text();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Verzoek verlopen. Controleer je verbinding en probeer opnieuw.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Strategy 1 — JSON-LD (schema.org/Recipe)
// Works on: Karola's Kitchen, most WordPress blogs (WP Recipe Maker,
//           Tasty Recipes, WPRM), HelloFresh, many international sites.
// ---------------------------------------------------------------------------

function tryParseJsonLd(html: string, url: string): ParsedRecipe | null {
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;

  while ((m = scriptRe.exec(html)) !== null) {
    try {
      const data: unknown = JSON.parse(m[1]);
      const node = findRecipeNode(data);
      if (node) return extractFromJsonLd(node, url);
    } catch {
      // malformed JSON — try next script tag
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
  const t = obj['@type'];
  if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return obj;
  if (obj['@graph']) return findRecipeNode(obj['@graph']);
  return null;
}

function extractFromJsonLd(recipe: Record<string, unknown>, url: string): ParsedRecipe {
  const title = str(recipe.name) || str(recipe.headline) || 'Recept';

  const rawIngredients = asStringArray(recipe.recipeIngredient);
  const ingredients = rawIngredients.map(parseIngredientString);

  const steps: string[] = [];
  const instructions = recipe.recipeInstructions;
  if (Array.isArray(instructions)) {
    for (const step of instructions) {
      if (typeof step === 'string') {
        steps.push(...splitSentences(step));
      } else if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>;
        if (s['@type'] === 'HowToSection' && Array.isArray(s.itemListElement)) {
          for (const sub of s.itemListElement as Record<string, unknown>[]) {
            const t = str(sub.text) || str(sub.name);
            if (t) steps.push(t.trim());
          }
        } else {
          const t = str(s.text) || str(s.name);
          if (t) steps.push(t.trim());
        }
      }
    }
  } else if (typeof instructions === 'string') {
    steps.push(...splitSentences(instructions));
  }

  return { title, ingredients, steps, sourceUrl: url };
}

// ---------------------------------------------------------------------------
// Strategy 2 — Next.js __NEXT_DATA__
// Works on: dagelijksekost.een.be (VRT), other Next.js SSR recipe sites.
// ---------------------------------------------------------------------------

function tryParseNextData(html: string, url: string): ParsedRecipe | null {
  const m = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;

  try {
    const data = JSON.parse(m[1]) as Record<string, unknown>;
    return searchObjectForRecipe(data, url, 0);
  } catch {
    return null;
  }
}

function searchObjectForRecipe(
  obj: unknown,
  url: string,
  depth: number,
): ParsedRecipe | null {
  if (depth > 10 || !obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = searchObjectForRecipe(item, url, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const o = obj as Record<string, unknown>;

  // Dagelijkse Kost structure: { title, ingredients[{amount,unit,name}], steps[{text}] }
  if (typeof o.title === 'string' && Array.isArray(o.ingredients)) {
    return extractDagelijksekost(o, url);
  }

  // Generic: { name, recipeIngredient, recipeInstructions } (schema.org-like in JS)
  if (typeof o.name === 'string' && Array.isArray(o.recipeIngredient)) {
    return extractFromJsonLd(o, url);
  }

  for (const value of Object.values(o)) {
    const found = searchObjectForRecipe(value, url, depth + 1);
    if (found) return found;
  }
  return null;
}

function extractDagelijksekost(
  o: Record<string, unknown>,
  url: string,
): ParsedRecipe {
  const title = str(o.title) || 'Recept';

  const rawIngredients = Array.isArray(o.ingredients) ? o.ingredients : [];
  const ingredients: ParsedIngredient[] = rawIngredients.flatMap((group: unknown) => {
    if (group && typeof group === 'object') {
      const g = group as Record<string, unknown>;
      if (Array.isArray(g.ingredients)) {
        return g.ingredients.map((ing: unknown) => parseDKIngredient(ing));
      }
      return [parseDKIngredient(g)];
    }
    return [];
  });

  const rawSteps = Array.isArray(o.steps)
    ? o.steps
    : Array.isArray(o.preparation_steps)
      ? o.preparation_steps
      : Array.isArray(o.preparations)
        ? o.preparations
        : [];

  const steps: string[] = rawSteps.flatMap((s: unknown) => {
    if (typeof s === 'string') return splitSentences(s);
    if (s && typeof s === 'object') {
      const step = s as Record<string, unknown>;
      const text = str(step.text) || str(step.description) || str(step.step);
      return text ? [text.trim()] : [];
    }
    return [];
  });

  return { title, ingredients, steps, sourceUrl: url };
}

function parseDKIngredient(ing: unknown): ParsedIngredient {
  if (!ing || typeof ing !== 'object') {
    return { name: String(ing ?? ''), quantity: 1, unit: '' };
  }
  const o = ing as Record<string, unknown>;

  const rawText = str(o.text) || str(o.ingredient_text) || str(o.label);
  if (rawText) return parseIngredientString(rawText);

  const name = str(o.name) || str(o.ingredient) || str(o.product) || '';
  const unit = str(o.unit) || str(o.measure) || '';
  const qty = parseFloat(str(o.amount) || str(o.quantity) || str(o.qty) || '1');

  return { name, quantity: isFinite(qty) ? qty : 1, unit };
}

// ---------------------------------------------------------------------------
// Strategy 3 — HTML Microdata (itemprop attributes)
// ---------------------------------------------------------------------------

function tryParseMicrodata(html: string, url: string): ParsedRecipe | null {
  if (
    !html.includes('schema.org/Recipe') &&
    !html.includes('schema.org%2FRecipe')
  ) {
    return null;
  }

  const title =
    extractItemprop(html, 'name') ||
    extractMetaContent(html, 'og:title') ||
    extractH1(html) ||
    extractTitleTag(html) ||
    '';

  const ingredientMatches = [
    ...html.matchAll(/itemprop=["']recipeIngredient["'][^>]*>([^<]+)/gi),
  ].map((m) => decodeHtmlEntities(m[1].trim()));

  const ingredients = ingredientMatches.map(parseIngredientString);

  const instructionText = extractItemprop(html, 'recipeInstructions') || '';
  const steps = instructionText
    ? splitSentences(instructionText)
    : [
        ...(html.matchAll(/itemprop=["']text["'][^>]*>([^<]{10,})/gi)),
      ].map((m) => decodeHtmlEntities(m[1].trim()));

  if (!title && ingredients.length === 0) return null;
  return { title, ingredients, steps, sourceUrl: url };
}

function extractItemprop(html: string, prop: string): string {
  const metaM = html.match(
    new RegExp(`itemprop=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'),
  );
  if (metaM) return decodeHtmlEntities(metaM[1]);

  const tagM = html.match(
    new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]+)`, 'i'),
  );
  if (tagM) return decodeHtmlEntities(tagM[1].trim());

  return '';
}

// ---------------------------------------------------------------------------
// Strategy 4 — Generic HTML heuristic
// ---------------------------------------------------------------------------

function tryParseHeuristic(html: string, url: string): ParsedRecipe | null {
  const title =
    extractH1(html) ||
    extractMetaContent(html, 'og:title') ||
    extractMetaContent(html, 'twitter:title') ||
    extractTitleTag(html) ||
    '';

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const ingredients = extractHeuristicIngredients(cleaned);
  const steps = extractHeuristicSteps(cleaned);

  if (!title && ingredients.length === 0) return null;
  return { title, ingredients, steps, sourceUrl: url };
}

function extractHeuristicIngredients(html: string): ParsedIngredient[] {
  const containerPatterns = [
    /class=["'][^"']*ingredi[eë]nt[^"']*["'][\s\S]{0,3000}?<\/[uo]l>/gi,
    /class=["'][^"']*ingredient[^"']*["'][\s\S]{0,3000}?<\/[uo]l>/gi,
    /class=["'][^"']*bestanddelen[^"']*["'][\s\S]{0,3000}?<\/[uo]l>/gi,
    // data-* attributes (used by some modern sites)
    /data-[^=]*ingredient[^=]*=["'][^"']*["'][\s\S]{0,3000}?<\/[uo]l>/gi,
  ];

  for (const pattern of containerPatterns) {
    const containerMatch = html.match(pattern);
    if (containerMatch) {
      const items = [...containerMatch[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      const parsed = items
        .map((m) => decodeHtmlEntities(stripTags(m[1])).trim())
        .filter((t) => t.length > 2 && t.length < 200)
        .map(parseIngredientString);
      if (parsed.length > 0) return parsed;
    }
  }
  return [];
}

function extractHeuristicSteps(html: string): string[] {
  const containerPatterns = [
    /class=["'][^"']*(bereidings?(?:wijze)?|voorbereiding|stapp?en?)[^"']*["'][\s\S]{0,5000}?<\/[uo]l>/gi,
    /class=["'][^"']*(preparation|instructions?|directions?|method|steps?)[^"']*["'][\s\S]{0,5000}?<\/[uo]l>/gi,
    /class=["'][^"']*(bereidings?(?:wijze)?|voorbereiding|stapp?en?)[^"']*["'][\s\S]{0,5000}?<\/div>/gi,
  ];

  for (const pattern of containerPatterns) {
    const containerMatch = html.match(pattern);
    if (containerMatch) {
      const items = [
        ...containerMatch[0].matchAll(/<(?:li|p)[^>]*>([\s\S]*?)<\/(?:li|p)>/gi),
      ];
      const steps = items
        .map((m) => decodeHtmlEntities(stripTags(m[1])).trim())
        .filter((t) => t.length > 10);
      if (steps.length > 0) return steps;
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function extractH1(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? decodeHtmlEntities(stripTags(m[1])).trim() : '';
}

/** Extract <title>...</title> as last-resort title fallback */
function extractTitleTag(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  // Strip common site suffixes like " | Site Name" or " - Site Name"
  const raw = decodeHtmlEntities(stripTags(m[1])).trim();
  return raw.replace(/\s*[|\-–—]\s*.{2,60}$/, '').trim();
}

function extractMetaContent(html: string, property: string): string {
  const m = html.match(
    new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
      'i',
    ),
  );
  if (m) return decodeHtmlEntities(m[1]);
  const m2 = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
      'i',
    ),
  );
  return m2 ? decodeHtmlEntities(m2[1]) : '';
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function asStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return [val];
  return [];
}

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

// ---------------------------------------------------------------------------
// Ingredient string parser  e.g. "1½ cups all-purpose flour" → structured
// Also handles: "1-2 tomatoes" (range → take max), "ca. 200g" (approximate)
// ---------------------------------------------------------------------------

export function parseIngredientString(raw: string): ParsedIngredient {
  const text = decodeHtmlEntities(raw)
    .trim()
    .replace(/¼/g, '0.25')
    .replace(/½/g, '0.5')
    .replace(/¾/g, '0.75')
    .replace(/⅓/g, '0.333')
    .replace(/⅔/g, '0.667')
    .replace(/⅛/g, '0.125')
    .replace(/(\d),(\d)/g, '$1.$2')   // Dutch decimal comma
    .replace(/^(?:ca\.?|circa|ongeveer|approx\.?)\s*/i, ''); // strip approximation prefix

  let remaining = text;
  let quantity = 1;

  // Handle range "1-2" or "1 à 2" → take the maximum value
  const rangeMatch = remaining.match(/^(\d*\.?\d+)\s*[-à]\s*(\d*\.?\d+)\s*/);
  if (rangeMatch) {
    quantity = parseFloat(rangeMatch[2]); // take max of range
    remaining = remaining.slice(rangeMatch[0].length);
  } else {
    // Match mixed numbers "1 1/2", plain fractions "1/2", or decimals
    const qMatch = remaining.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*/);
    if (qMatch) {
      const q = qMatch[1].trim();
      if (q.includes('/')) {
        const spaceIdx = q.indexOf(' ');
        if (spaceIdx > -1) {
          const [whole, frac] = q.split(' ');
          const [num, den] = frac.split('/');
          quantity = parseFloat(whole) + parseFloat(num) / parseFloat(den);
        } else {
          const [num, den] = q.split('/');
          quantity = parseFloat(num) / parseFloat(den);
        }
      } else {
        quantity = parseFloat(q);
      }
      remaining = remaining.slice(qMatch[0].length);
    }
  }

  // Match unit (longest-first to avoid partial matches)
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
