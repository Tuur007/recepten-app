import { create } from 'zustand';
import { GroceryItem } from '../types/grocery';

interface GroceryState {
  items: GroceryItem[];
  isLoading: boolean;
  hasLoaded: boolean;

  setItems: (items: GroceryItem[]) => void;
  setLoading: (loading: boolean) => void;
  setLoaded: (loaded: boolean) => void;
  addItem: (item: GroceryItem) => void;
  addItems: (items: GroceryItem[]) => void;
  updateItemInStore: (id: string, updates: Partial<GroceryItem>) => void;
  removeItem: (id: string) => void;
  clearChecked: () => void;
  selectAll: (checked: boolean) => void;
  deleteItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  getCheckedCount: () => number;
  getUncheckedCount: () => number;
  getTotal: () => number;
}

export const useGroceryStore = create<GroceryState>((set, get) => ({
  items: [],
  isLoading: false,
  hasLoaded: false,

  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoaded: (hasLoaded) => set({ hasLoaded }),

  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),

  addItems: (newItems) =>
    set((state) => ({ items: [...state.items, ...newItems] })),

  updateItemInStore: (id, updates) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  clearChecked: () =>
    set((state) => ({ items: state.items.filter((i) => !i.checked) })),

  selectAll: (checked) =>
    set((state) => ({ items: state.items.map((i) => ({ ...i, checked })) })),

  deleteItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, totalQuantity: quantity } : i)),
    })),

  getCheckedCount: () => get().items.filter((i) => i.checked).length,

  getUncheckedCount: () => get().items.filter((i) => !i.checked).length,

  getTotal: () =>
    get().items.reduce((sum, item) => {
      if (item.price == null) return sum;
      const multiplier = item.totalQuantity > 0 ? item.totalQuantity : 1;
      return sum + item.price * multiplier;
    }, 0),
}));
