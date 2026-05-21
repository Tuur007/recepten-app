// features/collections/repository.ts
//
// SQLite-laag voor recipe collections. Twee tabellen:
//   • collections          — naam + omschrijving + timestamps
//   • collection_recipes   — many-to-many koppeling met recipe-IDs
//
// We exposeren één hydratie-functie (`getAll`) die voor elke collectie de
// recipe-IDs ophaalt; de UI heeft die info nodig om counts en filtering te
// tonen zonder per-collectie nog een tweede query af te vuren.

import { type SQLiteDatabase } from 'expo-sqlite';
import type { RecipeCollection } from '../../types/recipe';
import { generateId } from '../../utils/id';

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface CollectionRecipeRow {
  collection_id: string;
  recipe_id: string;
  added_at: string;
}

export const CollectionRepository = {
  async getAll(db: SQLiteDatabase): Promise<RecipeCollection[]> {
    const collections = await db.getAllAsync<CollectionRow>(
      'SELECT * FROM collections ORDER BY created_at ASC',
    );
    const links = await db.getAllAsync<CollectionRecipeRow>(
      'SELECT * FROM collection_recipes ORDER BY added_at ASC',
    );

    const byCollection = new Map<string, string[]>();
    for (const link of links) {
      const arr = byCollection.get(link.collection_id) ?? [];
      arr.push(link.recipe_id);
      byCollection.set(link.collection_id, arr);
    }

    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      recipeIds: byCollection.get(c.id) ?? [],
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  },

  async create(
    db: SQLiteDatabase,
    name: string,
    description?: string,
  ): Promise<RecipeCollection> {
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO collections (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), description?.trim() ?? null, now, now],
    );
    return {
      id,
      name: name.trim(),
      description: description?.trim() || undefined,
      recipeIds: [],
      createdAt: now,
      updatedAt: now,
    };
  },

  async rename(
    db: SQLiteDatabase,
    id: string,
    name: string,
    description?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE collections SET name = ?, description = ?, updated_at = ? WHERE id = ?',
      [name.trim(), description?.trim() ?? null, now, id],
    );
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    // FK ON DELETE CASCADE neemt de koppelingen mee, maar we zetten ze hier
    // expliciet weg voor het geval iemand foreign_keys=OFF heeft staan.
    await db.runAsync('DELETE FROM collection_recipes WHERE collection_id = ?', [id]);
    await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
  },

  async addRecipe(db: SQLiteDatabase, collectionId: string, recipeId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT OR IGNORE INTO collection_recipes (collection_id, recipe_id, added_at) VALUES (?, ?, ?)',
      [collectionId, recipeId, now],
    );
    await db.runAsync('UPDATE collections SET updated_at = ? WHERE id = ?', [now, collectionId]);
  },

  async removeRecipe(db: SQLiteDatabase, collectionId: string, recipeId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      'DELETE FROM collection_recipes WHERE collection_id = ? AND recipe_id = ?',
      [collectionId, recipeId],
    );
    await db.runAsync('UPDATE collections SET updated_at = ? WHERE id = ?', [now, collectionId]);
  },
};
