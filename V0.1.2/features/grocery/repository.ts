import { type SQLiteDatabase } from 'expo-sqlite';
import { GroceryItem, GroceryItemInput, GroceryItemUpdate } from '../../types/grocery';
import { generateId } from '../../utils/id';

interface GroceryRow {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  recipes: string;
  checked: number;
  created_at: string;
}

function rowToItem(row: GroceryRow): GroceryItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    recipes: JSON.parse(row.recipes),
    checked: row.checked === 1,
    createdAt: row.created_at,
  };
}

export const GroceryRepository = {
  async getAll(db: SQLiteDatabase): Promise<GroceryItem[]> {
    const rows = await db.getAllAsync<GroceryRow>(
      'SELECT * FROM grocery_items ORDER BY checked ASC, created_at DESC',
    );
    return rows.map(rowToItem);
  },

  async create(db: SQLiteDatabase, input: GroceryItemInput): Promise<GroceryItem> {
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO grocery_items (id, name, quantity, unit, recipes, checked, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.quantity,
        input.unit,
        JSON.stringify(input.recipes),
        input.checked ? 1 : 0,
        now,
      ],
    );
    return { id, ...input, createdAt: now };
  },

  async createMany(db: SQLiteDatabase, inputs: GroceryItemInput[]): Promise<GroceryItem[]> {
    const created: GroceryItem[] = [];
    for (const input of inputs) {
      const item = await GroceryRepository.create(db, input);
      created.push(item);
    }
    return created;
  },

  async update(db: SQLiteDatabase, id: string, changes: GroceryItemUpdate): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (changes.name !== undefined) { fields.push('name = ?'); values.push(changes.name); }
    if (changes.quantity !== undefined) { fields.push('quantity = ?'); values.push(changes.quantity); }
    if (changes.unit !== undefined) { fields.push('unit = ?'); values.push(changes.unit); }
    if (changes.recipes !== undefined) { fields.push('recipes = ?'); values.push(JSON.stringify(changes.recipes)); }
    if (changes.checked !== undefined) { fields.push('checked = ?'); values.push(changes.checked ? 1 : 0); }

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
