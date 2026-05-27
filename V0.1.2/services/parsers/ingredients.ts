import { generateId } from '../../utils/id';
import { stripTags } from './html';
import type { ParsedIngredient } from './types';

export const UNITS_NL = [
  'eetlepels?', 'el', 'theelepels?', 'tl', 'kopjes?', 'kop',
  'liter', 'l', 'deciliter', 'dl', 'milliliter', 'ml',
  'kilogram', 'kg', 'gram', 'g', 'pond',
  'snufje', 'snuf', 'mespunt', 'takje', 'takjes?', 'bosje', 'bosjes?',
  'stuk', 'stuks', 'teen', 'tenen',
  'plak', 'plakjes?', 'blad', 'blaadjes?',
];

export const UNITS_EN = [
  'tablespoons?', 'tbsp', 'teaspoons?', 'tsp',
  'cups?', 'pints?', 'quarts?', 'gallons?',
  'ounces?', 'oz', 'pounds?', 'lb', 'lbs',
  'liters?', 'l', 'milliliters?', 'ml',
  'kilograms?', 'kg', 'grams?', 'g',
  'cloves?', 'bunches?', 'bunch', 'sprigs?', 'leaves?', 'slices?',
  'cans?', 'packages?', 'pkg', 'pieces?',
];

const ALL_UNITS = [...UNITS_NL, ...UNITS_EN].join('|');
const UNIT_RE = new RegExp(`^(${ALL_UNITS})\\b\\.?`, 'i');

export const FRACTION_MAP: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

export function parseIngredientString(raw: string): ParsedIngredient {
  let s = stripTags(raw).trim();

  // Replace unicode fractions
  for (const [frac, val] of Object.entries(FRACTION_MAP)) {
    s = s.replace(frac, ` ${val} `);
  }

  // Replace "1/2" style fractions
  s = s.replace(/(\d+)\s*\/\s*(\d+)/g, (_, n, d) => String(Number(n) / Number(d)));

  // Normalise multiple spaces
  s = s.replace(/\s+/g, ' ').trim();

  // Match leading quantity: optional whole number + optional decimal
  const qtyMatch = s.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)?\s*/);
  let quantity = 1;
  let rest = s;

  if (qtyMatch) {
    const main = parseFloat(qtyMatch[1]);
    const frac = qtyMatch[2] ? parseFloat(qtyMatch[2]) : 0;
    const safeMain = isNaN(main) || main < 0 || main > 9999 ? 1 : main;
    const safeFrac = isNaN(frac) || frac < 0 || frac >= 1 ? 0 : frac;
    quantity = safeMain + safeFrac;
    rest = s.slice(qtyMatch[0].length).trim();
  } else {
    rest = s;
  }

  // Match unit
  const unitMatch = rest.match(UNIT_RE);
  let unit = '';
  if (unitMatch) {
    unit = unitMatch[0].replace(/\.$/, '').trim();
    rest = rest.slice(unitMatch[0].length).trim();
  }

  const name = rest.trim() || raw.trim();

  return { id: generateId(), name, quantity, unit };
}
