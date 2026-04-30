export const KNOWN_UNITS: string[] = [
  // Volume — sorted longest-first to avoid partial regex matches
  'milliliters', 'milliliter', 'tablespoons', 'tablespoon',
  'teaspoons', 'teaspoon', 'kilograms', 'kilogram',
  'ounces', 'ounce', 'pounds', 'pound', 'grams', 'gram',
  'liters', 'liter', 'cups', 'cup', 'tbsp', 'tbs', 'tsp',
  'lbs', 'lb', 'oz', 'kg', 'ml', 'g', 'l',
  // Count / other
  'packages', 'package', 'bunches', 'bunch', 'slices', 'slice',
  'cloves', 'clove', 'pieces', 'piece', 'pinches', 'pinch',
  'dashes', 'dash', 'cans', 'can', 'whole', 'large', 'medium', 'small', 'pkg',
];

export function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

/**
 * Two items are compatible if they share the exact same normalised unit.
 * Unit conversion (e.g. g ↔ kg) is intentionally deferred to a future release.
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  return normalizeUnit(unit1) === normalizeUnit(unit2);
}
