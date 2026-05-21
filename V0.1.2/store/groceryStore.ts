import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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
  deleteItem: (id: string) => void;
  clearChecked: () => void;
  selectAll: (checked: boolean) => void;
  updateQuantity: (id: string, quantity: number) => void;
  getCheckedCount: () => number;
  getUncheckedCount: () => number;
  getTotal: () => number;
}

export const useGroceryStore = create<GroceryState>()(
  immer((set, get) => ({
    items: [],
    isLoading: false,
    hasLoaded: false,

    setItems: (items) => set({ items }),
    setLoading: (isLoading) => set({ isLoading }),
    setLoaded: (hasLoaded) => set({ hasLoaded }),

    addItem: (item) =>
      set((s) => { s.items.push(item); }),

    addItems: (newItems) =>
      set((s) => { s.items.push(...newItems); }),

    updateItemInStore: (id, updates) =>
      set((s) => {
        const item = s.items.find((i) => i.id === id);
        if (item) Object.assign(item, updates);
      }),

    deleteItem: (id) =>
      set((s) => { s.items = s.items.filter((i) => i.id !== id); }),

    clearChecked: () =>
      set((s) => { s.items = s.items.filter((i) => !i.checked); }),

    selectAll: (checked) =>
      set((s) => { s.items.forEach((i) => { i.checked = checked; }); }),

    updateQuantity: (id, quantity) =>
      set((s) => {
        const item = s.items.find((i) => i.id === id);
        if (item) item.totalQuantity = quantity;
      }),

    getCheckedCount: () => get().items.filter((i) => i.checked).length,

    getUncheckedCount: () => get().items.filter((i) => !i.checked).length,

    getTotal: () =>
      get().items.reduce((sum, item) => {
        if (item.price == null) return sum;
        return sum + item.price * item.totalQuantity;
      }, 0),
  })),
);
