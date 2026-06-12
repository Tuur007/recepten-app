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

import { log, warn } from '../../utils/logger';
import { str } from './html';
import { parseIngredientString } from './ingredients';
import type { ParsedIngredient, ParsedRecipe } from './types';

export interface FetchOptions {
  userAgent: string;
  timeoutMs: number;
}

const MARLEY_SPOON_HOST_RE = /^(?:www\.)?marleyspoon\.(?:com|nl|be|de|at|se|dk)$/i;

const MARLEY_SPOON_QUERY = `query GetRecipe($id: String!) {
  recipe(id: $id) {
    id
    title
    subtitle
    image(size: LARGE) { url }
    duration { from to unit }
    shippedIngredients { name nameWithQuantity }
    assumedIngredients { name }
    steps { title description }
  }
}`;

export function isMarleySpoonUrl(url: string): boolean {
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
  // Allowlist: de host komt uit de opgehaalde pagina — zonder check kan een
  // kwaadaardige pagina het token + de query naar een eigen server sturen.
  try {
    const parsed = new URL(apiHost);
    if (parsed.protocol !== 'https:') return null;
    if (!/(^|\.)marleyspoon\.[a-z]{2,6}$/i.test(parsed.hostname)) return null;
  } catch {
    return null;
  }
  return { apiToken: tokenMatch[1], apiHost };
}

/**
 * Fetch a Marley Spoon recipe via the public GraphQL API. Throws with a
 * descriptive message on failure — the HTML has no recipe content, so a silent
 * fallback would surface a misleading stub instead of the real error.
 */
export async function fetchMarleySpoonRecipe(
  url: string,
  html: string,
  options: FetchOptions,
): Promise<ParsedRecipe> {
  const recipeId = extractMarleySpoonRecipeId(url);
  if (!recipeId) {
    throw new Error('Geen recept-ID gevonden in deze Marley Spoon URL.');
  }

  const gon = extractGonBootstrap(html);
  if (!gon) {
    warn('[marleyspoon] no gon.api_token in HTML');
    throw new Error('Kon de toegangstoken niet uit de pagina lezen.');
  }

  log(`[marleyspoon] POST ${gon.apiHost}/graphql for recipe ${recipeId}`);

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
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

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
        'User-Agent': options.userAgent,
        ...(origin ? { Origin: origin, Referer: `${origin}/` } : {}),
      },
      body,
    });
  } catch (e) {
    warn('[marleyspoon] GraphQL fetch failed:', e instanceof Error ? e.message : e);
    throw new Error('Marley Spoon API onbereikbaar. Probeer opnieuw.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    warn('[marleyspoon] GraphQL HTTP', response.status);
    throw new Error(`Marley Spoon API gaf fout (HTTP ${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    warn('[marleyspoon] GraphQL response was not JSON');
    throw new Error('Marley Spoon API gaf geen geldig JSON-antwoord.');
  }

  const obj = payload as Record<string, unknown> | null;
  const errors = obj && Array.isArray(obj.errors) ? obj.errors : null;
  if (errors && errors.length > 0) {
    const summary = JSON.stringify(errors).slice(0, 200);
    warn('[marleyspoon] GraphQL errors:', summary);
    throw new Error(`Marley Spoon API meldt: ${summary}`);
  }

  const data = obj?.data;
  const recipe =
    data && typeof data === 'object' ? (data as Record<string, unknown>).recipe : null;
  if (!recipe || typeof recipe !== 'object') {
    warn('[marleyspoon] empty data.recipe in response');
    throw new Error('Marley Spoon API gaf een leeg recept terug.');
  }

  const converted = convertMarleySpoonRecipe(recipe as Record<string, unknown>, url);
  log(
    `[marleyspoon] recipe parsed: ${converted.ingredients.length} ingredients, ${converted.steps.length} steps`,
  );
  return converted;
}

function convertMarleySpoonRecipe(r: Record<string, unknown>, url: string): ParsedRecipe {
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
 * Marley Spoon writes quantities glued to the unit ("100g glasnoedels"). Insert
 * a space so the generic ingredient parser (which expects "100 g …") picks them up.
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
