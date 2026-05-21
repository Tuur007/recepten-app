import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateId } from '../utils/id';

export interface Shop {
  id: string;
  name: string;
}

export const DEFAULT_SHOPS: Shop[] = [
  { id: 'colruyt', name: 'Colruyt' },
  { id: 'delhaize', name: 'Delhaize' },
  { id: 'lidl', name: 'Lidl' },
  { id: 'aldi', name: 'Aldi' },
  { id: 'carrefour', name: 'Carrefour' },
  { id: 'ah', name: 'Albert Heijn' },
  { id: 'okay', name: 'Okay' },
  { id: 'spar', name: 'Spar' },
];

const PREF_SHOPS = 'shops';

interface ShopsState {
  shops: Shop[];
  hydrated: boolean;
  setShopsInternal: (shops: Shop[]) => void;
  setHydrated: () => void;
}

export const useShopsStore = create<ShopsState>()(
  immer((set) => ({
    shops: DEFAULT_SHOPS,
    hydrated: false,
    setShopsInternal: (shops) => set({ shops }),
    setHydrated: () => set({ hydrated: true }),
  })),
);

async function persistShops(db: SQLiteDatabase, shops: Shop[]): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [PREF_SHOPS, JSON.stringify(shops)],
  );
}

export function useHydrateShops(): void {
  const db = useSQLiteContext();
  const hydrated = useShopsStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) return;
    db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_prefs WHERE key = ?',
      [PREF_SHOPS],
    )
      .then((rows) => {
        if (rows.length > 0) {
          try {
            const parsed = JSON.parse(rows[0].value) as Shop[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              useShopsStore.getState().setShopsInternal(parsed);
            }
          } catch { /* bewaar defaults */ }
        }
      })
      .catch(() => {})
      .finally(() => useShopsStore.getState().setHydrated());
  }, [db, hydrated]);
}

export function useShopsActions() {
  const db = useSQLiteContext();

  const addShop = (name: string): void => {
    const shops = [...useShopsStore.getState().shops, { id: generateId(), name: name.trim() }];
    useShopsStore.getState().setShopsInternal(shops);
    persistShops(db, shops).catch(console.error);
  };

  const removeShop = (id: string): void => {
    const shops = useShopsStore.getState().shops.filter((s) => s.id !== id);
    useShopsStore.getState().setShopsInternal(shops);
    persistShops(db, shops).catch(console.error);
  };

  const updateShop = (id: string, name: string): void => {
    const shops = useShopsStore.getState().shops.map((s) => (s.id === id ? { ...s, name } : s));
    useShopsStore.getState().setShopsInternal(shops);
    persistShops(db, shops).catch(console.error);
  };

  return { addShop, removeShop, updateShop };
}
