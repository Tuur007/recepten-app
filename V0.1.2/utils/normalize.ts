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
    gr: 'g',
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

/**
 * Normaliseert een URL voor vergelijking. Lowercase protocol + host, strip
 * een trailing slash van het pad. Behoudt path-case, query en hash — en
 * upgradeert `http://` *niet* naar `https://` (dat zou silent gedrag wijzigen).
 *
 * Bij een ongeldige URL valt de functie terug op een gelowercased + trimmed
 * vergelijking zonder trailing slash, zodat de check altijd iets oplevert.
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const protocol = u.protocol.toLowerCase();
    const host = u.host.toLowerCase();
    const path = u.pathname.replace(/\/$/, '');
    return `${protocol}//${host}${path}${u.search}${u.hash}`;
  } catch {
    return url.toLowerCase().trim().replace(/\/+$/, '');
  }
}

/**
 * Raadt een grocery-category op basis van keyword-matching in de naam. Map
 * is afgestemd op DEFAULT_GROCERY_CATEGORIES. Returnt een lege string als
 * er niets matcht — eerlijker dan "Overig" altijd terugsturen.
 */
export function inferCategoryFromName(name: string): string {
  const n = name.toLowerCase();
  const rules: Array<[string[], string]> = [
    [
      ['melk', 'kaas', 'yoghurt', 'boter', 'room', 'eieren', 'ei ', 'eitje', 'kwark'],
      'Zuivel',
    ],
    [
      ['kip', 'vlees', 'rund', 'biefstuk', 'varken', 'spek', 'worst', 'gehakt', 'ham', 'vis', 'zalm', 'tonijn', 'garnaal'],
      'Vlees',
    ],
    [
      ['tomaat', 'sla', 'ui ', 'uien', 'wortel', 'aardappel', 'komkommer', 'courgette', 'paprika', 'broccoli', 'spinazie', 'prei', 'champignon', 'knoflook'],
      'Groente',
    ],
    [
      ['appel', 'banaan', 'peer', 'sinaasappel', 'citroen', 'druif', 'aardbei', 'framboos', 'mango', 'kiwi'],
      'Fruit',
    ],
    [['brood', 'croissant', 'baguette', 'pistolet', 'broodje'], 'Bakkerij'],
    [['diepvries', 'bevroren', 'ijs '], 'Diepvries'],
    [['water', 'wijn', 'sap', 'cola', 'limonade', 'koffie', 'thee', 'bier'], 'Dranken'],
    [['chips', 'koek', 'snoep', 'chocolade', 'reep'], 'Snacks'],
  ];
  for (const [keywords, category] of rules) {
    if (keywords.some((w) => n.includes(w))) return category;
  }
  // Eindigt-op-"ui" kan dubbelzinnig zijn; vermijd false negatives door op
  // exacte woordgrens te testen voor het ene-letter-woord "ui".
  if (/\bui\b/.test(n) || /\beieren?\b/.test(n)) {
    return /\bui\b/.test(n) ? 'Groente' : 'Zuivel';
  }
  return '';
}

/**
 * Twee units mogen alleen samengevoegd worden als ze, genormaliseerd, exact
 * gelijk zijn. Bewust GEEN cross-unit "compatibiliteit" (g↔kg, ml↔l,
 * tsp↔tbsp): computeTotalQuantity in types/grocery.ts somt enkel getallen
 * zonder conversie, dus "200 g" + "1 kg" als compatibel zien zou "201 g"
 * opleveren. Verschillende units → aparte grocery-rijen.
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  return normalizeUnit(unit1) === normalizeUnit(unit2);
}
