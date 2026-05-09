import { GroceryItem } from '../types/grocery';

const ORDER = ['produce', 'dairy', 'meat', 'frozen', 'pantry', 'other'];

export function groupItems(items: GroceryItem[]): Map<string, GroceryItem[]> {
  const grouped = new Map<string, GroceryItem[]>();
  items.forEach((item) => {
    const aisle = item.aisle || 'other';
    if (!grouped.has(aisle)) grouped.set(aisle, []);
    grouped.get(aisle)!.push(item);
  });
  return new Map(
    [...grouped.entries()].sort(
      (a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]),
    ),
  );
}

export function getAisleLabel(aisle: string): string {
  const labels: Record<string, string> = {
    produce: '🥬 Groenten & Fruit',
    dairy: '🥛 Zuivel',
    meat: '🥩 Vlees & Vis',
    frozen: '🧊 Diepvries',
    pantry: '🗄️ Voorraad',
    other: '📦 Overig',
  };
  return labels[aisle] ?? aisle;
}
