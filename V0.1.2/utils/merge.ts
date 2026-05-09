import { GroceryItem, SourceLineage, computeTotalQuantity } from '../types/grocery';
import { Ingredient } from '../types/recipe';
import { generateId } from './id';
import { normalizeIngredientName, normalizeUnit, areUnitsCompatible } from './normalize';

export function mergeIngredientsIntoGrocery(
  existing: GroceryItem[],
  ingredients: Ingredient[],
  recipeId: string,
  recipeName: string,
): GroceryItem[] {
  const result: GroceryItem[] = existing.map((item) => ({
    ...item,
    sources: item.sources.map((s) => ({ ...s })),
  }));

  for (const ingredient of ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);
    const normalizedUnit = normalizeUnit(ingredient.unit);

    const matchIndex = result.findIndex(
      (item) =>
        normalizeIngredientName(item.name) === normalizedName &&
        areUnitsCompatible(item.unit, normalizedUnit),
    );

    if (matchIndex >= 0) {
      const item = result[matchIndex];
      const existingSourceIdx = item.sources.findIndex((s) => s.sourceId === recipeId);

      let updatedSources: SourceLineage[];
      if (existingSourceIdx >= 0) {
        // Same recipe re-added: overwrite quantity (no duplicate)
        updatedSources = item.sources.map((s, i) =>
          i === existingSourceIdx ? { ...s, quantity: ingredient.quantity } : s,
        );
      } else {
        // New recipe contributing to this item: append source
        updatedSources = [
          ...item.sources,
          {
            sourceId: recipeId,
            sourceType: 'recipe' as const,
            sourceName: recipeName,
            quantity: ingredient.quantity,
          },
        ];
      }

      result[matchIndex] = {
        ...item,
        sources: updatedSources,
        totalQuantity: computeTotalQuantity(updatedSources),
      };
    } else {
      const sources: SourceLineage[] = [
        {
          sourceId: recipeId,
          sourceType: 'recipe',
          sourceName: recipeName,
          quantity: ingredient.quantity,
        },
      ];
      result.push({
        id: generateId(),
        name: ingredient.name,
        unit: ingredient.unit,
        category: '',
        sources,
        totalQuantity: computeTotalQuantity(sources),
        checked: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return result;
}

export function removeSourceFromGrocery(
  existing: GroceryItem[],
  sourceId: string,
): GroceryItem[] {
  return existing
    .map((item) => {
      const sources = item.sources.filter((s) => s.sourceId !== sourceId);
      return { ...item, sources, totalQuantity: computeTotalQuantity(sources) };
    })
    .filter((item) => item.sources.length > 0);
}

export function formatItemOrigin(item: GroceryItem): string {
  const recipeNames = item.sources
    .filter((s) => s.sourceType === 'recipe')
    .map((s) => s.sourceName);
  if (recipeNames.length === 0) return '';
  return `(${recipeNames.join(', ')})`;
}
