import { GroceryItem, SourceLineage, computeTotalQuantity } from '../types/grocery';
import { Ingredient } from '../types/recipe';
import { generateId } from './id';
import { normalizeIngredientName, normalizeUnit, areUnitsCompatible } from './normalize';

/**
 * Merges recipe ingredients into the existing grocery list.
 *
 * Rules:
 *  - Same name + same unit + same sourceId  → quantity overwritten (idempotent re-add)
 *  - Same name + same unit + new sourceId   → source appended, totalQuantity recalculated
 *  - Same name + different unit             → kept as a separate row
 *  - New name                               → new row added
 */
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
        sources,
        totalQuantity: computeTotalQuantity(sources),
        checked: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return result;
}

/**
 * Removes all contributions of a given sourceId from the grocery list.
 * Items with no remaining sources are deleted entirely.
 */
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

/** Human-readable label showing recipe origins, e.g. "(Lasagna, Spaghetti)" */
export function formatItemOrigin(item: GroceryItem): string {
  const recipeNames = item.sources
    .filter((s) => s.sourceType === 'recipe')
    .map((s) => s.sourceName);
  if (recipeNames.length === 0) return '';
  return `(${recipeNames.join(', ')})`;
}
