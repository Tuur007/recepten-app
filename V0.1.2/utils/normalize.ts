export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(the|a|an)\s+/i, '');
}

export function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();

  const unitAliases: Record<string, string> = {
    gram: 'g',
    grams: 'g',
    kilogram: 'kg',
    kilograms: 'kg',
    milligram: 'mg',
    milligrams: 'mg',
    milliliter: 'ml',
    milliliters: 'ml',
    liter: 'l',
    liters: 'l',
    cup: 'cup',
    cups: 'cup',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    pound: 'lb',
    pounds: 'lb',
    ounce: 'oz',
    ounces: 'oz',
    piece: 'piece',
    pieces: 'piece',
    stuk: 'stuk',
    stuks: 'stuk',
    stukie: 'stuk',
  };

  return unitAliases[normalized] || normalized;
}

export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const norm1 = normalizeUnit(unit1);
  const norm2 = normalizeUnit(unit2);

  if (norm1 === norm2) return true;

  const volumeUnits = new Set(['ml', 'l', 'cup', 'tbsp', 'tsp']);
  const weightUnits = new Set(['g', 'kg', 'mg', 'lb', 'oz']);

  return (
    (volumeUnits.has(norm1) && volumeUnits.has(norm2)) ||
    (weightUnits.has(norm1) && weightUnits.has(norm2))
  );
}
