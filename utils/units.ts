export const KNOWN_UNITS: string[] = [
  // Volume — longest first to avoid partial regex matches
  'eetlepels', 'eetlepel', 'theelepels', 'theelepel',
  'milliliters', 'milliliter', 'tablespoons', 'tablespoon',
  'teaspoons', 'teaspoon', 'kilograms', 'kilogram',
  'ounces', 'ounce', 'pounds', 'pound', 'grams', 'gram',
  'liters', 'liter', 'liters', 'liter',
  'cups', 'cup', 'tbsp', 'tbs', 'tsp',
  'lbs', 'lb', 'oz', 'kg', 'ml', 'gr', 'g', 'l',
  'dl', 'deciliter', 'deciliters',
  'cl', 'centiliter', 'centiliters',
  // Count / other — NL + EN
  'pakjes', 'pakje', 'blikjes', 'blikje', 'bossen', 'bosje', 'bos',
  'snufjes', 'snufje', 'snuifjes', 'snuifje',
  'scheutjes', 'scheutje',
  'plakjes', 'plakje', 'plakken',
  'takjes', 'takje',
  'stukjes', 'stukje', 'stuks',
  'teentjes', 'teentje', 'teen',
  'packages', 'package', 'bunches', 'bunch', 'slices', 'slice',
  'cloves', 'clove', 'pieces', 'piece', 'pinches', 'pinch',
  'dashes', 'dash', 'cans', 'can', 'whole',
  'large', 'medium', 'small', 'pkg',
  'zakjes', 'zakje',
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
