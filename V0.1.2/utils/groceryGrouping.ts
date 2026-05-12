import { GroceryItem } from '../types/grocery';
import { DEFAULT_AISLES } from '../constants/aisles';

const FALLBACK_AISLE: (typeof DEFAULT_AISLES)[number] = 'Overig';

const AISLE_EMOJI: Record<(typeof DEFAULT_AISLES)[number], string> = {
  'Groente & Fruit': '🥬',
  'Vlees & Vis': '🥩',
  'Zuivel & Eieren': '🥛',
  'Brood & Bakkerij': '🥖',
  'Diepvries': '🧊',
  'Dranken': '🥤',
  'Snacks & Snoep': '🍫',
  'Pantry & Basics': '🗄️',
  'Overig': '📦',
};

function normalizeAisle(aisle?: string): string {
  if (!aisle) return FALLBACK_AISLE;
  return (DEFAULT_AISLES as readonly string[]).includes(aisle) ? aisle : FALLBACK_AISLE;
}

export function groupItems(items: GroceryItem[]): Map<string, GroceryItem[]> {
  const grouped = new Map<string, GroceryItem[]>();
  items.forEach((item) => {
    const aisle = normalizeAisle(item.aisle);
    if (!grouped.has(aisle)) grouped.set(aisle, []);
    grouped.get(aisle)!.push(item);
  });
  return new Map(
    [...grouped.entries()].sort(
      (a, b) => DEFAULT_AISLES.indexOf(a[0] as never) - DEFAULT_AISLES.indexOf(b[0] as never),
    ),
  );
}

export function getAisleLabel(aisle: string): string {
  const key = normalizeAisle(aisle) as (typeof DEFAULT_AISLES)[number];
  const emoji = AISLE_EMOJI[key];
  return `${emoji} ${key}`;
}
