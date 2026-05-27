import { str, asStringArray } from './html';
import { parseIngredientString } from './ingredients';
import { parseDurationIso8601 } from './duration';
import type { ParsedRecipe } from './types';

export function collectRecipeNodes(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data)) {
    return data.flatMap(collectRecipeNodes);
  }

  const obj = data as Record<string, unknown>;
  const results: Record<string, unknown>[] = [];

  // `@type` may be a string OR an array of strings (e.g. ["Recipe","NewsArticle"]).
  // Treat any value that includes "Recipe" as a match.
  const rawType = obj['@type'];
  const types = Array.isArray(rawType) ? rawType.map(str) : [str(rawType)];
  if (types.some((t) => t === 'Recipe' || t.toLowerCase().includes('recipe'))) {
    results.push(obj);
  }

  // Walk @graph array
  if (Array.isArray(obj['@graph'])) {
    results.push(...obj['@graph'].flatMap(collectRecipeNodes));
  }

  return results;
}

export function extractFromJsonLd(recipe: Record<string, unknown>, url: string): ParsedRecipe {
  const title = str(recipe.name) || str(recipe.headline) || 'Recept';

  const rawIngredients = asStringArray(recipe.recipeIngredient);
  const ingredients = rawIngredients.map(parseIngredientString);

  const rawInstructions = recipe.recipeInstructions;
  const steps = extractStepsFromInstructions(rawInstructions);

  // totalTime preferred; fall back to cookTime; fall back to sum of prep + cook
  const totalTime = parseDurationIso8601(str(recipe.totalTime));
  const cookTime = parseDurationIso8601(str(recipe.cookTime));
  const prepTime = parseDurationIso8601(str(recipe.prepTime));
  const duration =
    totalTime ?? (prepTime != null && cookTime != null ? prepTime + cookTime : cookTime ?? prepTime);

  return { title, ingredients, steps, sourceUrl: url, duration };
}

export function extractStepsFromInstructions(raw: unknown): string[] {
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
