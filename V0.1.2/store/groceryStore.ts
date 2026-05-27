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
  applyLocalEdit: (id: string, updates: Partial<GroceryItem>) => void;
  replaceFromRemote: (id: string, item: GroceryItem) => void;
  deleteItem: (id: string) => void;
  clearChecked: () => void;
  selectAll: (checked: boolean) => void;
  setCheckedByIds: (ids: string[], checked: boolean) => void;
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

    // Lokale optimistische edit.
    applyLocalEdit: (id, updates) =>
      set((s) => {
        const item = s.items.find((i) => i.id === id);
        if (item) Object.assign(item, updates);
      }),

    // Remote update (Supabase realtime): neem de binnenkomende rij over.
    // GroceryItem heeft geen updatedAt; createdAt is de enige tijdstempel
    // waarop we een LWW-overschrijving kunnen signaleren (Sentry via console).
    replaceFromRemote: (id, item) =>
      set((s) => {
        const existing = s.items.find((i) => i.id === id);
        if (!existing) return;
        if (new Date(existing.createdAt).getTime() > new Date(item.createdAt).getTime()) {
          console.error('[sync] LWW overwrote newer local edit', {
            id,
            localUpdatedAt: existing.createdAt,
            remoteUpdatedAt: item.createdAt,
          });
        }
        Object.assign(existing, item);
      }),

    deleteItem: (id) =>
      set((s) => { s.items = s.items.filter((i) => i.id !== id); }),

    clearChecked: () =>
      set((s) => { s.items = s.items.filter((i) => !i.checked); }),

    selectAll: (checked) =>
      set((s) => { s.items.forEach((i) => { i.checked = checked; }); }),

    setCheckedByIds: (ids, checked) =>
      set((s) => {
        const idSet = new Set(ids);
        s.items.forEach((i) => { if (idSet.has(i.id)) i.checked = checked; });
      }),

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
