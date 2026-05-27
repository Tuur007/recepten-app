import { stripTags, stripSiteName } from './html';
import { parseIngredientString } from './ingredients';
import { parseDurationIso8601 } from './duration';
import type { ParsedIngredient, ParsedRecipe } from './types';

export function tryParseHeuristic(html: string, url: string): ParsedRecipe | null {
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
  const m =
    html.match(re) ||
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
        'i',
      ),
    );
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
