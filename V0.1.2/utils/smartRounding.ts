/**
 * Round a quantity to the nearest "cook-friendly" step.
 * < 1   → nearest 0.25  (so 0.333 → 0.25, not 0.3333...)
 * 1–4   → nearest 0.5
 * > 4   → nearest whole number
 */
export function smartRound(qty: number): number {
  if (qty <= 0) return 0;
  if (qty < 1) return Math.round(qty * 4) / 4;
  if (qty <= 4) return Math.round(qty * 2) / 2;
  return Math.round(qty);
}

/**
 * Format a rounded quantity for display.
 * Strips trailing .0 so 2.0 → "2", keeps 1.5 → "1.5".
 */
export function formatQty(qty: number): string {
  if (!qty) return '';
  const r = smartRound(qty);
  return r % 1 === 0 ? String(r) : String(r);
}
