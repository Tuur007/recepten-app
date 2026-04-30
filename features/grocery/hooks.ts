import { useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { GroceryItem, GroceryItemInput, GroceryItemUpdate } from '../../types/grocery';
import { Ingredient } from '../../types/recipe';
import { GroceryRepository } from './repository';
import { useGroceryStore } from '../../store/groceryStore';
import { mergeIngredientsIntoGrocery } from '../../utils/merge';

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
      .catch(console.error)
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
    async (ingredients: Ingredient[], recipeTitle: string): Promise<void> => {
      const merged = mergeIngredientsIntoGrocery(items, ingredients, recipeTitle);
      // Persist only the newly added/updated items by resetting and reinserting
      await db.runAsync('DELETE FROM grocery_items');
      const saved: GroceryItem[] = [];
      for (const item of merged) {
        await GroceryRepository.create(db, item);
        saved.push(item);
      }
      setItems(saved);
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
    await GroceryRepository.clearChecked(db);
    setItems(items.filter((i) => !i.checked));
  }, [db, items, setItems]);

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  return {
    items,
    uncheckedItems,
    checkedItems,
    isLoading,
    hasLoaded,
    addManual,
    addFromRecipe,
    toggleChecked,
    remove,
    clearChecked,
  };
}
