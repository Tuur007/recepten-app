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

  // Laad boodschappenlijst bij eerste gebruik
  useEffect(() => {
    if (hasLoaded) return;

    setLoading(true);
    GroceryRepository.getAll(db)
      .then((data) => {
        setItems(data);
        setLoaded(true);
      })
      .catch((fout) => {
        console.error('[useGrocery] Fout bij laden van boodschappenlijst:', fout);
      })
      .finally(() => setLoading(false));
  }, [db, hasLoaded, setLoading, setItems, setLoaded]);

  /**
   * Voeg een enkel item handmatig toe aan de boodschappenlijst.
   */
  const addManual = useCallback(
    async (input: GroceryItemInput): Promise<GroceryItem> => {
      const item = await GroceryRepository.create(db, input);
      addItem(item);
      return item;
    },
    [db, addItem],
  );

  /**
   * Voeg ingrediënten van een recept toe aan de boodschappenlijst.
   *
   * Gebruikt een SQLite-transactie zodat de boodschappenlijst nooit
   * in een half-bijgewerkte staat achterblijft als er iets misgaat.
   * Bij een fout blijft de vorige lijst volledig intact.
   */
  const addFromRecipe = useCallback(
    async (ingredients: Ingredient[], receptNaam: string): Promise<void> => {
      // Bereken de samengevoegde lijst op basis van de huidige items
      const samengevoegd = mergeIngredientsIntoGrocery(
        items,
        ingredients,
        receptNaam,
      );

      // Voer alles uit binnen één transactie:
      // als één stap faalt, wordt alles teruggedraaid (rollback)
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM grocery_items');

        for (const item of samengevoegd) {
          await db.runAsync(
            `INSERT INTO grocery_items
               (id, name, quantity, unit, recipes, checked, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.name,
              item.quantity,
              item.unit,
              JSON.stringify(item.recipes),
              item.checked ? 1 : 0,
              item.createdAt,
            ],
          );
        }
      });

      // Pas de store pas aan nadat de transactie succesvol was
      setItems(samengevoegd);
    },
    [db, items, setItems],
  );

  /**
   * Schakel het afgevinkte-status van een item om.
   */
  const toggleChecked = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const afgevinkt = !item.checked;
      await GroceryRepository.update(db, id, { checked: afgevinkt });
      updateItemInStore(id, { checked: afgevinkt });
    },
    [db, items, updateItemInStore],
  );

  /**
   * Verwijder een enkel item uit de boodschappenlijst.
   */
  const remove = useCallback(
    async (id: string): Promise<void> => {
      await GroceryRepository.delete(db, id);
      removeItem(id);
    },
    [db, removeItem],
  );

  /**
   * Verwijder alle afgevinkte items.
   *
   * Gebruikt withTransactionAsync voor consistentie,
   * en haalt daarna de actuele lijst opnieuw op uit de database
   * om stale-state te vermijden.
   */
  const clearChecked = useCallback(async (): Promise<void> => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM grocery_items WHERE checked = 1');
    });

    // Haal de actuele lijst opnieuw op in plaats van de closure-waarde te gebruiken
    // Dit voorkomt stale-state als er ondertussen wijzigingen waren
    const bijgewerkt = await GroceryRepository.getAll(db);
    setItems(bijgewerkt);
  }, [db, setItems]);

  // Gesplitste lijsten voor gemakkelijk gebruik in de UI
  const nietAfgevinkt = items.filter((i) => !i.checked);
  const afgevinkt = items.filter((i) => i.checked);

  return {
    items,
    uncheckedItems: nietAfgevinkt,
    checkedItems: afgevinkt,
    isLoading,
    hasLoaded,
    addManual,
    addFromRecipe,
    toggleChecked,
    remove,
    clearChecked,
  };
}
