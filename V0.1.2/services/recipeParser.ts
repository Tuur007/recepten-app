export interface ParsedRecipe {
  title: string;
  ingredients: ParsedIngredient[];
  steps: string[];
  sourceUrl: string;
  duration?: number;
  prepTime?: number;
  cookTime?: number;
}

function extractFromJsonLd(recipe: Record<string, unknown>, url: string): ParsedRecipe {
  const title = str(recipe.name) || str(recipe.headline) || 'Recept';

  const rawIngredients = asStringArray(recipe.recipeIngredient);
  const ingredients = rawIngredients.map(parseIngredientString);

  // ... steps extraction ...

  const duration = parseDurationIso8601(str(recipe.cookTime)) 
    ?? parseDurationIso8601(str(recipe.totalTime));
  const prepTime = parseDurationIso8601(str(recipe.prepTime));
  const cookTime = parseDurationIso8601(str(recipe.cookTime));

  return { title, ingredients, steps, sourceUrl: url, duration, prepTime, cookTime };
}

function extractDagelijksekost(o: Record<string, unknown>, url: string): ParsedRecipe {
  const title = str(o.title) || 'Recept';
  // ... ingredients and steps ...

  const duration = o.cooking_time ? parseDurationNumber(Number(o.cooking_time)) : undefined;
  const prepTime = o.prep_time ? parseDurationNumber(Number(o.prep_time)) : undefined;
  const cookTime = o.cooking_time ? parseDurationNumber(Number(o.cooking_time)) : undefined;

  return { title, ingredients, steps, sourceUrl: url, duration, prepTime, cookTime };
}

function tryParseHeuristic(html: string, url: string): ParsedRecipe | null {
  const title = extractH1(html) || extractMetaContent(html, 'og:title') || '';

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const ingredients = extractHeuristicIngredients(cleaned);
  const steps = extractHeuristicSteps(cleaned);
  const duration = extractHeuristicDuration(cleaned);
  const prepTime = undefined;
  const cookTime = duration;

  if (!title && ingredients.length === 0) return null;
  return { title, ingredients, steps, sourceUrl: url, duration, prepTime, cookTime };
}

function extractHeuristicDuration(html: string): number | undefined {
  const patterns = [
    /cookTime['":\s]*["']?PT(\d+)M/i,
    /(?:cook(?:ing)?|prep)[_\s]*time['":\s]*(\d+)\s*(?:min|minute)/i,
    /\b(\d+)\s*(?:min|minute)s?\s*(?:cook|prep|ready)/i,
  ];

  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) {
      const duration = parseInt(m[1], 10);
      if (duration > 0 && duration < 1440) return duration;
    }
  }

  return undefined;
}

function parseDurationIso8601(iso: string): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/PT(\d+)H?(\d+)?M/);
  if (!m) return undefined;
  const hours = parseInt(m[1], 10) || 0;
  const minutes = parseInt(m[2], 10) || 0;
  return hours * 60 + minutes || undefined;
}

function parseDurationNumber(mins: number): number | undefined {
  return mins > 0 && mins < 1440 ? mins : undefined;
}
