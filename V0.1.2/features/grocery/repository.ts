import { type SQLiteDatabase } from 'expo-sqlite';
import { GroceryItem, GroceryItemInput, GroceryItemUpdate, computeTotalQuantity } from '../../types/grocery';
import { generateId } from '../../utils/id';

interface GroceryRow {
  id: string;
  name: string;
  unit: string;
  sources: string;
  total_quantity: number;
  checked: number;
  created_at: string;
}

function rowToItem(row: GroceryRow): GroceryItem {
  const sources = JSON.parse(row.sources ?? '[]');
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    sources,
    totalQuantity: row.total_quantity ?? computeTotalQuantity(sources),
    checked: row.checked === 1,
    createdAt: row.created_at,
  };
}

export const GroceryRepository = {
  async getAll(db: SQLiteDatabase): Promise<GroceryItem[]> {
    const rows = await db.getAllAsync<GroceryRow>(
      'SELECT id, name, unit, sources, total_quantity, checked, created_at FROM grocery_items ORDER BY checked ASC, created_at DESC',
    );
    return rows.map(rowToItem);
  },

  async create(db: SQLiteDatabase, input: GroceryItemInput): Promise<GroceryItem> {
    const id = generateId();
    const now = new Date().toISOString();
    const totalQuantity = computeTotalQuantity(input.sources);
    await db.runAsync(
      `INSERT INTO grocery_items (id, name, unit, sources, total_quantity, checked, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.unit, JSON.stringify(input.sources), totalQuantity, input.checked ? 1 : 0, now],
    );
    return { id, ...input, totalQuantity, createdAt: now };
  },

  async update(db: SQLiteDatabase, id: string, changes: GroceryItemUpdate): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (changes.name !== undefined) { fields.push('name = ?'); values.push(changes.name); }
    if (changes.unit !== undefined) { fields.push('unit = ?'); values.push(changes.unit); }
    if (changes.checked !== undefined) { fields.push('checked = ?'); values.push(changes.checked ? 1 : 0); }
    if (changes.sources !== undefined) {
      fields.push('sources = ?');
      values.push(JSON.stringify(changes.sources));
      fields.push('total_quantity = ?');
      values.push(computeTotalQuantity(changes.sources));
    }

    if (fields.length === 0) return;
    values.push(id);

    await db.runAsync(
      `UPDATE grocery_items SET ${fields.join(', ')} WHERE id = ?`,
      values as string[],
    );
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM grocery_items WHERE id = ?', [id]);
  },

  async clearChecked(db: SQLiteDatabase): Promise<void> {
    await db.runAsync('DELETE FROM grocery_items WHERE checked = 1');
  },
};
