// services/nutrition.ts
//
// Aggregate-laag bovenop Open Food Facts: voor elk ingrediënt zoeken we het
// best passende product, converteren de opgegeven hoeveelheid naar gram (of ml),
// en sommeren we de nutriment-waardes. Per-portie deling gebeurt aan het eind.
//
// Bewust eenvoudig:
//   • Geen lokale cache — OFF is snel en de berekening is een
//     expliciete actie van de gebruiker (knop "bereken nutritie").
//   • Onbekende ingrediënten dragen niets bij — we tellen mee hoeveel er gematcht
//     waren zodat de UI eerlijk kan tonen "x van y ingrediënten verwerkt".

import type { Ingredient, NutritionInfo } from '../types/recipe';
import { warn } from '../utils/logger';
import { searchBestMatch, type OFFProduct } from './openFoodFacts';

interface UnitConversion {
  /** Multiplier om naar gram (of ml — beide zijn 1g≈1ml voor onze schatting) te komen. */
  toGrams: number;
}

// Eenvoudige conversietabel — alleen massa-eenheden. Volume-eenheden worden
// als water benaderd (1ml = 1g) wat voor de meeste vloeistoffen close-enough is.
const UNIT_TO_GRAMS: Record<string, UnitConversion> = {
  'g':            { toGrams: 1 },
  'gr':           { toGrams: 1 },
  'gram':         { toGrams: 1 },
  'grams':        { toGrams: 1 },
  'kg':           { toGrams: 1000 },
  'kilogram':     { toGrams: 1000 },
  'kilograms':    { toGrams: 1000 },
  'ml':           { toGrams: 1 },
  'milliliter':   { toGrams: 1 },
  'milliliters':  { toGrams: 1 },
  'cl':           { toGrams: 10 },
  'centiliter':   { toGrams: 10 },
  'dl':           { toGrams: 100 },
  'deciliter':    { toGrams: 100 },
  'l':            { toGrams: 1000 },
  'liter':        { toGrams: 1000 },
  'liters':       { toGrams: 1000 },
  // Lepel-eenheden — culinair standaard.
  'tl':           { toGrams: 5 },
  'theelepel':    { toGrams: 5 },
  'theelepels':   { toGrams: 5 },
  'tsp':          { toGrams: 5 },
  'teaspoon':     { toGrams: 5 },
  'teaspoons':    { toGrams: 5 },
  'el':           { toGrams: 15 },
  'eetlepel':     { toGrams: 15 },
  'eetlepels':    { toGrams: 15 },
  'tbsp':         { toGrams: 15 },
  'tablespoon':   { toGrams: 15 },
  'tablespoons':  { toGrams: 15 },
};

/**
 * Schatting voor stuksgewicht — pas op: de waarden zijn ruw en bedoeld om
 * een richtcijfer te krijgen wanneer iemand "2 uien" of "1 ei" intypt.
 */
const PIECE_WEIGHT_FALLBACK = 100;
const PIECE_WEIGHTS: Record<string, number> = {
  ei: 60,
  eieren: 60,
  ui: 110,
  uien: 110,
  knoflook: 5,
  teen: 5,
  teentje: 5,
  teentjes: 5,
  tomaat: 120,
  tomaten: 120,
  paprika: 150,
  appel: 150,
  citroen: 80,
  limoen: 50,
  banaan: 120,
  wortel: 70,
  wortels: 70,
  aardappel: 150,
  aardappelen: 150,
};

/**
 * Schat het gewicht in gram van één ingrediëntregel. Levert `null` op wanneer
 * we geen redelijke schatting hebben — die wordt dan overgeslagen.
 */
function estimateGrams(ing: Ingredient): number | null {
  const qty = ing.quantity;
  if (!qty || qty <= 0) return null;

  const unitKey = ing.unit?.toLowerCase().trim();
  if (unitKey && UNIT_TO_GRAMS[unitKey]) {
    return qty * UNIT_TO_GRAMS[unitKey].toGrams;
  }

  // Geen herkende eenheid: zoek naar stuksgewicht via ingrediëntnaam.
  const nameKey = ing.name.toLowerCase().split(' ')[0];
  const piece = PIECE_WEIGHTS[nameKey] ?? PIECE_WEIGHT_FALLBACK;
  return qty * piece;
}

function addOptional(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null && b == null) return undefined;
  return (a ?? 0) + (b ?? 0);
}

function divide(value: number | undefined, divisor: number): number | undefined {
  if (value == null) return undefined;
  return value / divisor;
}

function round1(n: number | undefined): number | undefined {
  if (n == null) return undefined;
  return Math.round(n * 10) / 10;
}

/**
 * Bereken nutritie voor een receptenset op basis van OFF-data. Voor elke
 * ingrediëntregel zoeken we het meest complete product en schalen we de
 * /100g waarden naar de werkelijke gewichtschatting. De waardes worden
 * uiteindelijk gedeeld door het aantal porties.
 */
export async function computeRecipeNutrition(
  ingredients: Ingredient[],
  servings: number,
): Promise<NutritionInfo> {
  const safeServings = servings > 0 ? servings : 4;

  let totalKcal: number | undefined;
  let totalProtein: number | undefined;
  let totalCarbs: number | undefined;
  let totalFat: number | undefined;
  let totalFiber: number | undefined;
  let totalSugar: number | undefined;
  let totalSalt: number | undefined;
  let matched = 0;

  for (const ing of ingredients) {
    const grams = estimateGrams(ing);
    if (!grams) continue;

    let product: OFFProduct | null = null;
    try {
      product = await searchBestMatch(ing.name);
    } catch (err) {
      warn(`[nutrition] OFF search failed for "${ing.name}":`, err);
      continue;
    }
    if (!product || product.nutriments.energyKcal == null) continue;

    matched++;
    const factor = grams / 100;
    const n = product.nutriments;
    totalKcal    = addOptional(totalKcal,    n.energyKcal != null ? n.energyKcal * factor : undefined);
    totalProtein = addOptional(totalProtein, n.protein    != null ? n.protein    * factor : undefined);
    totalCarbs   = addOptional(totalCarbs,   n.carbs      != null ? n.carbs      * factor : undefined);
    totalFat     = addOptional(totalFat,     n.fat        != null ? n.fat        * factor : undefined);
    totalFiber   = addOptional(totalFiber,   n.fiber      != null ? n.fiber      * factor : undefined);
    totalSugar   = addOptional(totalSugar,   n.sugar      != null ? n.sugar      * factor : undefined);
    totalSalt    = addOptional(totalSalt,    n.salt       != null ? n.salt       * factor : undefined);
  }

  return {
    calories: round1(divide(totalKcal,    safeServings)),
    protein:  round1(divide(totalProtein, safeServings)),
    carbs:    round1(divide(totalCarbs,   safeServings)),
    fat:      round1(divide(totalFat,     safeServings)),
    fiber:    round1(divide(totalFiber,   safeServings)),
    sugar:    round1(divide(totalSugar,   safeServings)),
    salt:     round1(divide(totalSalt,    safeServings)),
    computedAt: new Date().toISOString(),
    matchedIngredients: matched,
    totalIngredients: ingredients.length,
  };
}
