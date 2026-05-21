export interface SourceLineage {
  sourceId: string;
  sourceType: 'recipe' | 'manual';
  sourceName: string;
  quantity: number;
}

export interface GroceryItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  sources: SourceLineage[];
  totalQuantity: number; // always === sum(sources.map(s => s.quantity))
  checked: boolean;
  createdAt: string;
  // Prijs per eenheid (in dezelfde unit als `unit`). getTotal() vermenigvuldigt
  // direct met totalQuantity zonder verdere correctie.
  price?: number;
  aisle?: string;
  storeId?: string;
}

// totalQuantity is intentionally excluded from input — computed by computeTotalQuantity()
export type GroceryItemInput = Omit<GroceryItem, 'id' | 'createdAt' | 'totalQuantity'>;
export type GroceryItemUpdate = Partial<GroceryItemInput>;

export function computeTotalQuantity(sources: SourceLineage[]): number {
  return sources.reduce((sum, s) => sum + s.quantity, 0);
}
