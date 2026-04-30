export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  recipes: string[];
  checked: boolean;
  createdAt: string;
}

export type GroceryItemInput = Omit<GroceryItem, 'id' | 'createdAt'>;
export type GroceryItemUpdate = Partial<GroceryItemInput>;
