import { useCallback } from 'react';
import { Share } from 'react-native';
import { useGroceryStore } from '../../../store/groceryStore';
import { useGrocery } from '../hooks';
import type { GroceryItem } from '../../../types/grocery';

/**
 * Encapsulates the three bulk-action operations on the grocery list:
 *   selectAll   – check every unchecked item in the store
 *   clearChecked – delete checked items from DB + store
 *   share        – format list as plain text and invoke OS share sheet
 */
export function useBulkActions() {
  const { clearChecked } = useGrocery();
  const items = useGroceryStore((s) => s.items);

  const selectAll = useCallback(() => {
    useGroceryStore.getState().selectAll(true);
  }, []);

  const handleClearChecked = useCallback(async () => {
    await clearChecked();
  }, [clearChecked]);

  const handleShare = useCallback(async (itemsToShare?: GroceryItem[]) => {
    const list = itemsToShare ?? items;
    const text = list
      .map(
        (item) =>
          `${item.checked ? '✓' : '○'} ${item.name}` +
          (item.totalQuantity > 0
            ? ` (${item.totalQuantity}${item.unit ? ` ${item.unit}` : ''})`
            : ''),
      )
      .join('\n');
    await Share.share({ message: text, title: 'Boodschappenlijst' });
  }, [items]);

  return {
    selectAll,
    clearChecked: handleClearChecked,
    share: handleShare,
  };
}
