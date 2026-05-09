import { Ingredient } from '../types/recipe';
import { smartRound, formatQty } from './smartRounding';

export interface ScaledIngredient extends Ingredient {
  displayQty: string;
}

/**
 * Scale a list of ingredients from their base serving count to a target serving count.
 * Quantities are smart-rounded for display; the raw (unrounded) quantity is preserved
 * on the object so it can be re-scaled again without accumulated rounding error.
 */
export function scaleIngredients(
  ingredients: Ingredient[],
  fromServings: number,
  toServings: number,
): ScaledIngredient[] {
  // Guard: avoid divide-by-zero
  const ratio = fromServings > 0 ? toServings / fromServings : 1;

  return ingredients.map((ing) => {
    const scaled = ing.quantity * ratio;
    return {
      ...ing,
      displayQty: ing.quantity > 0 ? formatQty(scaled) : '',
    };
  });
}

/**
 * Return the ratio between two servings counts, clamped to a sane range.
 */
export function servingsRatio(from: number, to: number): number {
  if (from <= 0) return 1;
  return Math.max(0.1, Math.min(to / from, 20));
}
