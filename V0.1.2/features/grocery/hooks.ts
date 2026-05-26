import { useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { GroceryItem, GroceryItemInput, GroceryItemUpdate } from '../../types/grocery';
import { Ingredient } from '../../types/recipe';
import { GroceryRepository } from './repository';
import { useGroceryStore } from '../../store/groceryStore';
import { mergeIngredientsIntoGrocery, removeSourceFromGrocery } from '../../utils/merge';
import { haptics, toast } from '../../utils/feedback';

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
    deleteItem,
    clearChecked: clearCheckedInStore,
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
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [db, hasLoaded, setLoading, setItems, setLoaded]);

  const addManual = useCallback(
    async (input: GroceryItemInput): Promise<GroceryItem> => {
      try {
        const item = await GroceryRepository.create(db, input);
        addItem(item);
        haptics.success();
        toast.success('Toegevoegd', input.name);
        return item;
      } catch (err) {
        console.error('[useGrocery.addManual] Failed:', err);
        haptics.error();
        toast.error('Niet opgeslagen', 'Kon item niet toevoegen.');
        throw err;
      }
    },
    [db, addItem],
  );

  const addFromRecipe = useCallback(
    async (ingredients: Ingredient[], recipeId: string, recipeName: string): Promise<void> => {
      try {
        const merged = mergeIngredientsIntoGrocery(items, ingredients, recipeId, recipeName);

        await db.withTransactionAsync(async () => {
          await GroceryRepository.upsertMany(db, merged);
        });

        setItems(merged);
        haptics.success();
        toast.success(
          `${ingredients.length} ${ingredients.length === 1 ? 'ingrediënt' : 'ingrediënten'} toegevoegd`,
          recipeName,
        );
      } catch (err) {
        console.error('[useGrocery.addFromRecipe] Failed:', err);
        haptics.error();
        toast.error('Niet opgeslagen', 'Kon ingrediënten niet toevoegen.');
        throw err;
      }
    },
    [db, items, setItems],
  );

  const removeSource = useCallback(
    async (sourceId: string): Promise<void> => {
      const updated = removeSourceFromGrocery(items, sourceId);

      await db.withTransactionAsync(async () => {
        const toDelete = items.filter(item => 
          !updated.find(u => u.id === item.id)
        );
        for (const item of toDelete) {
          await GroceryRepository.delete(db, item.id);
        }
        
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
      const totalQuantity = filteredSources.reduce((sum, s) => sum + s.quantity, 0);

      if (filteredSources.length === 0) {
        // Optimistic: remove immediately
        deleteItem(item.id);
        try {
          await GroceryRepository.delete(db, item.id);
        } catch (err) {
          console.error('[removeSingleSource] Delete error:', err);
          // Rollback: re-add item
          addItem(item);
          throw err;
        }
      } else {
        // Optimistic: update immediately
        updateItemInStore(item.id, { sources: filteredSources, totalQuantity });
        try {
          await GroceryRepository.update(db, item.id, { sources: filteredSources });
        } catch (err) {
          console.error('[removeSingleSource] Update error:', err);
          // Rollback: restore old value
          updateItemInStore(item.id, { sources: item.sources, totalQuantity: item.totalQuantity });
          throw err;
        }
      }
    },
    [db, items, deleteItem, updateItemInStore, addItem],
  );

  const toggleChecked = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const checked = !item.checked;
      // Optimistic: update UI immediately, fire haptic, then persist.
      updateItemInStore(id, { checked });
      haptics.light();
      try {
        await GroceryRepository.update(db, id, { checked });
      } catch (err) {
        console.error('[useGrocery.toggleChecked] Failed:', err);
        // Rollback
        updateItemInStore(id, { checked: !checked });
        toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.');
        throw err;
      }
    },
    [db, items, updateItemInStore],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((i) => i.id === id);
      // Optimistic
      deleteItem(id);
      try {
        await GroceryRepository.delete(db, id);
        haptics.medium();
      } catch (err) {
        console.error('[useGrocery.remove] Failed:', err);
        if (item) addItem(item);
        toast.error('Niet verwijderd', 'Probeer opnieuw.');
        throw err;
      }
    },
    [db, items, deleteItem, addItem],
  );

  const clearChecked = useCallback(async (): Promise<void> => {
    const count = items.filter((i) => i.checked).length;
    try {
      await GroceryRepository.clearChecked(db);
      clearCheckedInStore();
      haptics.success();
      if (count > 0) {
        toast.success(`${count} ${count === 1 ? 'item' : 'items'} opgeruimd`);
      }
    } catch (err) {
      console.error('[useGrocery.clearChecked] Failed:', err);
      toast.error('Niet opgeruimd', 'Probeer opnieuw.');
      throw err;
    }
  }, [db, items, clearCheckedInStore]);

  const updateItem = useCallback(
    async (id: string, changes: GroceryItemUpdate): Promise<void> => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      updateItemInStore(id, changes as Partial<GroceryItem>);
      try {
        await GroceryRepository.update(db, id, changes);
        haptics.light();
      } catch (err) {
        console.error('[useGrocery.updateItem] Failed:', err);
        updateItemInStore(id, item);
        toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.');
        throw err;
      }
    },
    [db, items, updateItemInStore],
  );

  const removeMany = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const removed = items.filter((i) => idSet.has(i.id));
    if (removed.length === 0) return;
    try {
      await db.withTransactionAsync(async () => {
        for (const id of ids) {
          await GroceryRepository.delete(db, id);
        }
      });
      setItems(items.filter((i) => !idSet.has(i.id)));
      haptics.success();
      toast.success(`${removed.length} ${removed.length === 1 ? 'item' : 'items'} opgeruimd`);
    } catch (err) {
      console.error('[useGrocery.removeMany] Failed:', err);
      toast.error('Niet opgeruimd', 'Probeer opnieuw.');
      throw err;
    }
  }, [db, items, setItems]);

  const clearAll = useCallback(async (): Promise<void> => {
    if (items.length === 0) return;
    try {
      await db.withTransactionAsync(async () => {
        for (const item of items) {
          await GroceryRepository.delete(db, item.id);
        }
      });
      setItems([]);
      haptics.warning();
      toast.success('Lijst geleegd');
    } catch (err) {
      console.error('[useGrocery.clearAll] Failed:', err);
      toast.error('Niet geleegd', 'Probeer opnieuw.');
      throw err;
    }
  }, [db, items, setItems]);

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
    updateItem,
    remove,
    removeMany,
    clearChecked,
    clearAll,
  };
}
