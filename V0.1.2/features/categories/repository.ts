import { type SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../../utils/id';

export interface Category {
  id: string;
  name: string;
  type: 'recipe' | 'grocery';
  createdAt: string;
}

interface CategoryRow {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type as 'recipe' | 'grocery',
    createdAt: row.created_at,
  };
}

export class CategoryRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAll(): Promise<Category[]> {
    const rows = await this.db.getAllAsync<CategoryRow>(
      'SELECT * FROM categories ORDER BY created_at ASC',
    );
    return rows.map(rowToCategory);
  }

  async getByType(type: 'recipe' | 'grocery'): Promise<Category[]> {
    const rows = await this.db.getAllAsync<CategoryRow>(
      'SELECT * FROM categories WHERE type = ? ORDER BY created_at ASC',
      [type],
    );
    return rows.map(rowToCategory);
  }

  async create(name: string, type: 'recipe' | 'grocery'): Promise<Category> {
    const id = generateId();
    const createdAt = new Date().toISOString();
    await this.db.runAsync(
      'INSERT INTO categories (id, name, type, created_at) VALUES (?, ?, ?, ?)',
      [id, name.trim(), type, createdAt],
    );
    return { id, name: name.trim(), type, createdAt };
  }

  async update(id: string, name: string): Promise<void> {
    await this.db.runAsync('UPDATE categories SET name = ? WHERE id = ?', [name.trim(), id]);
  }

  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }
}
