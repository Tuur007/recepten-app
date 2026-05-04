/**
 * Lijst van bekende maateenheden, van langst naar kortst gesorteerd.
 * Dit is belangrijk voor de regex-matching in parseIngredientString:
 * langere eenheden moeten eerst worden gecontroleerd om gedeeltelijke
 * overeenkomsten te voorkomen (bijv. 'el' voor 'eetlepel').
 *
 * Bevat Nederlandse én Engelse eenheden.
 */
export const KNOWN_UNITS: string[] = [
  // --- Nederlands (lang naar kort) ---
  'eetlepels',
  'eetlepel',
  'theelepels',
  'theelepel',
  'milliliters',
  'milliliter',
  'deciliters',
  'deciliter',
  'centiliters',
  'centiliter',
  'kilograms',
  'kilogram',
  'pakjes',
  'pakje',
  'blikjes',
  'blikje',
  'bossen',
  'bosje',
  'snufjes',
  'snufje',
  'snuifjes',
  'snuifje',
  'scheutjes',
  'scheutje',
  'plakjes',
  'plakje',
  'plakken',
  'takjes',
  'takje',
  'stukjes',
  'stukje',
  'teentjes',
  'teentje',
  'stuks',
  'teen',
  'zakjes',
  'zakje',
  'liters',
  'liter',
  'grams',
  'gram',
  'bos',

  // --- Engels (lang naar kort) ---
  'tablespoons',
  'tablespoon',
  'teaspoons',
  'teaspoon',
  'ounces',
  'ounce',
  'pounds',
  'pound',
  'packages',
  'package',
  'bunches',
  'bunch',
  'slices',
  'slice',
  'cloves',
  'clove',
  'pieces',
  'piece',
  'pinches',
  'pinch',
  'dashes',
  'dash',
  'cans',
  'can',
  'cups',
  'cup',
  'tbsp',
  'tbs',
  'tsp',
  'lbs',
  'lb',
  'oz',
  'kg',
  'ml',
  'gr',
  'dl',
  'cl',
  'g',
  'l',

  // --- Beschrijvend / overig ---
  'whole',
  'large',
  'medium',
  'small',
  'pkg',
];

/**
 * Normaliseert een eenheid naar kleine letters zonder spaties.
 */
export function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

/**
 * Controleert of twee eenheden compatible zijn.
 *
 * Compatibiliteit wordt bepaald op basis van exacte overeenkomst
 * na normalisatie. Eenheidsconversie (bijv. g ↔ kg) is bewust
 * uitgesteld naar een toekomstige versie.
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  return normalizeUnit(unit1) === normalizeUnit(unit2);
}
