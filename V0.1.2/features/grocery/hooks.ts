import { useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { GroceryItem, GroceryItemInput } from '../../types/grocery';
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
        console.error('[useGrocery] Load error:', err);
        setLoaded(true); // Still mark loaded on error to prevent retry loop
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

  const addFromRecipe = useCallback(
    async (ingredients: Ingredient[], recipeId: string, recipeName: string): Promise<void> => {
      const merged = mergeIngredientsIntoGrocery(items, ingredients, recipeId, recipeName);

      await db.withTransactionAsync(async () => {
        await GroceryRepository.upsertMany(db, merged);
      });

      setItems(merged);
    },
    [db, items, setItems],
  );

  const removeSource = useCallback(
    async (sourceId: string): Promise<void> => {
      const updated = removeSourceFromGrocery(items, sourceId);

      await db.withTransactionAsync(async () => {
        // Delete items that have no sources left
        const toDelete = items.filter(item => 
          !updated.find(u => u.id === item.id)
        );
        for (const item of toDelete) {
          await GroceryRepository.delete(db, item.id);
        }
        
        // Upsert remaining items
        await GroceryRepository.upsertMany(db, updated);
      });

      setItems(updated);
    },
    [db, items, setItems],
  );

  const removeSingleSource = useCallback(
    async (itemId: string, sourceId: string): Promise<void> => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const filteredSources = item.sources.filter((s) => s.sourceId !== sourceId);

      if (filteredSources.length === 0) {
        await GroceryRepository.delete(db, item.id);
        removeItem(item.id);
        return;
      }

      const totalQuantity = filteredSources.reduce((sum, s) => sum + s.quantity, 0);
      await GroceryRepository.update(db, item.id, { sources: filteredSources });
      updateItemInStore(item.id, { sources: filteredSources, totalQuantity });
    },
    [db, items, removeItem, updateItemInStore],
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
      await GroceryRepository.clearChecked(db);
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
    removeSingleSource,
    toggleChecked,
    remove,
    clearChecked,
  };
}
