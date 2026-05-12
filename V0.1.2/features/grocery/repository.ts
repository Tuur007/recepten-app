import { type SQLiteDatabase } from 'expo-sqlite';
import { GroceryItem, GroceryItemInput, GroceryItemUpdate, SourceLineage, computeTotalQuantity } from '../../types/grocery';
import type { SQLiteBindValue } from 'expo-sqlite';
import { generateId } from '../../utils/id';

interface GroceryRow {
  id: string;
  name: string;
  unit: string;
  category: string;
  sources: string;
  total_quantity: number;
  checked: number;
  created_at: string;
  aisle: string | null;
  price: number | null;
}

function rowToItem(row: GroceryRow): GroceryItem {
  let sources: SourceLineage[];
  try {
    sources = JSON.parse(row.sources ?? '[]') as SourceLineage[];
  } catch {
    sources = [];
  }
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    category: row.category ?? '',
    sources,
    totalQuantity: row.total_quantity ?? computeTotalQuantity(sources),
    checked: row.checked === 1,
    createdAt: row.created_at,
    aisle: row.aisle ?? undefined,
    price: row.price ?? undefined,
  };
}

export const GroceryRepository = {
  async getAll(db: SQLiteDatabase): Promise<GroceryItem[]> {
    const rows = await db.getAllAsync<GroceryRow>(
      'SELECT id, name, unit, category, sources, total_quantity, checked, created_at, aisle, price FROM grocery_items ORDER BY checked ASC, created_at DESC',
    );
    return rows.map(rowToItem);
  },

  async create(db: SQLiteDatabase, input: GroceryItemInput): Promise<GroceryItem> {
    if (!input.name?.trim()) throw new Error('Item name is required');

    const id = generateId();
    const now = new Date().toISOString();
    const totalQuantity = computeTotalQuantity(input.sources);

    await db.runAsync(
      `INSERT INTO grocery_items (id, name, unit, category, sources, total_quantity, checked, created_at, aisle, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.unit, input.category ?? '', JSON.stringify(input.sources), totalQuantity, input.checked ? 1 : 0, now, input.aisle ?? null, input.price ?? null],
    );
    return { id, ...input, category: input.category ?? '', totalQuantity, createdAt: now };
  },

  async upsertMany(db: SQLiteDatabase, items: GroceryItem[]): Promise<void> {
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO grocery_items (id, name, unit, category, sources, total_quantity, checked, created_at, aisle, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           unit = excluded.unit,
           category = excluded.category,
           sources = excluded.sources,
           total_quantity = excluded.total_quantity,
           checked = excluded.checked,
           aisle = excluded.aisle,
           price = excluded.price`,
        [
          item.id,
          item.name,
          item.unit,
          item.category ?? '',
          JSON.stringify(item.sources),
          item.totalQuantity,
          item.checked ? 1 : 0,
          item.createdAt,
          item.aisle ?? null,
          item.price ?? null,
        ],
      );
    }
  },

  async update(db: SQLiteDatabase, id: string, changes: GroceryItemUpdate): Promise<void> {
    const fields: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (changes.name !== undefined) { fields.push('name = ?'); values.push(changes.name); }
    if (changes.unit !== undefined) { fields.push('unit = ?'); values.push(changes.unit); }
    if (changes.category !== undefined) { fields.push('category = ?'); values.push(changes.category); }
    if (changes.checked !== undefined) { fields.push('checked = ?'); values.push(changes.checked ? 1 : 0); }
    if (changes.aisle !== undefined) { fields.push('aisle = ?'); values.push(changes.aisle ?? null); }
    if (changes.price !== undefined) { fields.push('price = ?'); values.push(changes.price ?? null); }
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
      values,
    );
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    await db.runAsync('DELETE FROM grocery_items WHERE id = ?', [id]);
  },

  async clearChecked(db: SQLiteDatabase): Promise<void> {
    await db.runAsync('DELETE FROM grocery_items WHERE checked = 1');
  },
};
