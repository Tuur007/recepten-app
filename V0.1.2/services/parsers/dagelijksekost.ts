import { str, asStringArray } from './html';
import { parseIngredientString } from './ingredients';
import { parseDurationNumber } from './duration';
import { extractStepsFromInstructions } from './jsonld';
import type { ParsedRecipe } from './types';

export function extractDagelijksekost(o: Record<string, unknown>, url: string): ParsedRecipe {
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
    cookMins != null && prepMins != null ? cookMins + prepMins : cookMins ?? prepMins;

  return { title, ingredients, steps, sourceUrl: url, duration };
}
