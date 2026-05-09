const weights: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
const volumes: Record<string, number> = { ml: 1, l: 1000, tsp: 5, tbsp: 15, cup: 240, 'fl oz': 29.57 };

export function convertUnit(amount: number, from: string, to: string): number {
  const f = from.toLowerCase();
  const t = to.toLowerCase();
  if (f === t) return amount;
  if (weights[f] && weights[t]) return (amount * weights[f]) / weights[t];
  if (volumes[f] && volumes[t]) return (amount * volumes[f]) / volumes[t];
  return amount;
}

export function formatQty(amount: number, unit?: string): string {
  if (!unit) return `${amount}`;
  return `${Math.round(amount * 100) / 100} ${unit}`;
}

export const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'];
export const VOLUME_UNITS = ['ml', 'l', 'tsp', 'tbsp', 'cup', 'fl oz'];
export const PIECE_UNITS = ['piece', 'pieces', 'pack', 'jar', 'can', 'box'];
export const ALL_UNITS = [...WEIGHT_UNITS, ...VOLUME_UNITS, ...PIECE_UNITS];
