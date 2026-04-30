import { GroceryItem } from '../types/grocery';
import { Ingredient } from '../types/recipe';
import { generateId } from './id';
import { areUnitsCompatible, normalizeUnit } from './units';

/**
 * Merges recipe ingredients into the existing grocery list.
 *
 * Rules:
 *  - Same name + same unit  → sum quantities, union recipe sources.
 *  - Same name + diff unit  → kept as a separate row.
 *  - New name               → new row added.
 */
export function mergeIngredientsIntoGrocery(
  existing: GroceryItem[],
  ingredients: Ingredient[],
  recipeTitle: string,
): GroceryItem[] {
  const result = existing.map(item => ({ ...item, recipes: [...item.recipes] }));

  for (const ingredient of ingredients) {
    const normalizedName = ingredient.name.toLowerCase().trim();
    const normalizedUnit = normalizeUnit(ingredient.unit);

    const matchIndex = result.findIndex(
      item =>
        item.name.toLowerCase().trim() === normalizedName &&
        areUnitsCompatible(item.unit, normalizedUnit),
    );

    if (matchIndex >= 0) {
      result[matchIndex] = {
        ...result[matchIndex],
        quantity: result[matchIndex].quantity + ingredient.quantity,
        recipes: Array.from(new Set([...result[matchIndex].recipes, recipeTitle])),
      };
    } else {
      result.push({
        id: generateId(),
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        recipes: [recipeTitle],
        checked: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return result;
}

/** Human-readable label showing recipe origins, e.g. "2 cups (lasagna, pasta)" */
export function formatItemOrigin(item: GroceryItem): string {
  if (item.recipes.length === 0) return '';
  return `(${item.recipes.join(', ')})`;
}
