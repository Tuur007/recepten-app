import { useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { GroceryItem, GroceryItemInput, GroceryItemUpdate } from '../../types/grocery';
import { Ingredient } from '../../types/recipe';
import { GroceryRepository } from './repository';
import { useGroceryStore } from '../../store/groceryStore';
import { mergeIngredientsIntoGrocery, removeSourceFromGrocery } from '../../utils/merge';

export function useGrocery() {
  const db = useSQLiteContext();
  const {
    items,
    isLoading,
    hasLoaded,
    setItems,
    setLoading,
    setLoaded,
    addItem,
    updateItemInStore,
    removeItem,
  } = useGroceryStore();

  useEffect(() => {
    if (hasLoaded) return;
    setLoading(true);
    GroceryRepository.getAll(db)
      .then((data) => {
        setItems(data);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('[useGrocery] Fout bij laden:', err);
      })
      .finally(() => setLoading(false));
  }, [db, hasLoaded, setLoading, setItems, setLoaded]);

  const addManual = useCallback(
    async (input: GroceryItemInput): Promise<GroceryItem> => {
      const item = await GroceryRepository.create(db, input);
      addItem(item);
      return item;
    },
    [db, addItem],
  );

  /**
   * Adds a recipe's ingredients to the grocery list.
   * Tracks sourceId so the same recipe re-added overwrites instead of duplicating.
   */
  const addFromRecipe = useCallback(
    async (ingredients: Ingredient[], recipeId: string, recipeName: string): Promise<void> => {
      const merged = mergeIngredientsIntoGrocery(items, ingredients, recipeId, recipeName);

      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM grocery_items');
        for (const item of merged) {
          await db.runAsync(
            `INSERT INTO grocery_items (id, name, unit, sources, total_quantity, checked, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.name,
              item.unit,
              JSON.stringify(item.sources),
              item.totalQuantity,
              item.checked ? 1 : 0,
              item.createdAt,
            ],
          );
        }
      });

      setItems(merged);
    },
    [db, items, setItems],
  );

  /**
   * Removes all contributions of a recipe from the grocery list.
   * Items with no remaining sources are deleted automatically.
   */
  const removeSource = useCallback(
    async (sourceId: string): Promise<void> => {
      const updated = removeSourceFromGrocery(items, sourceId);

      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM grocery_items');
        for (const item of updated) {
          await db.runAsync(
            `INSERT INTO grocery_items (id, name, unit, sources, total_quantity, checked, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.name,
              item.unit,
              JSON.stringify(item.sources),
              item.totalQuantity,
              item.checked ? 1 : 0,
              item.createdAt,
            ],
          );
        }
      });

      setItems(updated);
    },
    [db, items, setItems],
  );

  const toggleChecked = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const checked = !item.checked;
      await GroceryRepository.update(db, id, { checked });
      updateItemInStore(id, { checked });
    },
    [db, items, updateItemInStore],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await GroceryRepository.delete(db, id);
      removeItem(id);
    },
    [db, removeItem],
  );

  const clearChecked = useCallback(async (): Promise<void> => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM grocery_items WHERE checked = 1');
    });
    const updated = await GroceryRepository.getAll(db);
    setItems(updated);
  }, [db, setItems]);

  return {
    items,
    uncheckedItems: items.filter((i) => !i.checked),
    checkedItems: items.filter((i) => i.checked),
    isLoading,
    hasLoaded,
    addManual,
    addFromRecipe,
    removeSource,
    toggleChecked,
    remove,
    clearChecked,
  };
}
