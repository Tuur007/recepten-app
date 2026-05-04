import { type SQLiteDatabase } from 'expo-sqlite';
import { Recipe, RecipeInput, RecipeUpdate } from '../../types/recipe';
import { generateId } from '../../utils/id';
import { deleteRecipeImage } from '../../utils/imageStorage';

interface RecipeRow {
  id: string;
  title: string;
  ingredients: string;
  steps: string;
  source_url: string | null;
  category: string;
  is_favorite: number;
  image_uri: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    sourceUrl: row.source_url ?? undefined,
    category: (row.category ?? '') as Recipe['category'],
    isFavorite: row.is_favorite === 1,
    imageUri: row.image_uri ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const RecipeRepository = {
  async getAll(db: SQLiteDatabase): Promise<Recipe[]> {
    const rows = await db.getAllAsync<RecipeRow>(
      'SELECT * FROM recipes ORDER BY created_at DESC',
    );
    return rows.map(rowToRecipe);
  },

  async getById(db: SQLiteDatabase, id: string): Promise<Recipe | null> {
    const row = await db.getFirstAsync<RecipeRow>(
      'SELECT * FROM recipes WHERE id = ?',
      [id],
    );
    return row ? rowToRecipe(row) : null;
  },

  async create(db: SQLiteDatabase, input: RecipeInput): Promise<Recipe> {
    if (!input.title?.trim()) throw new Error('Recipe title is required');
    
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO recipes (id, title, ingredients, steps, source_url, category, is_favorite, image_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        JSON.stringify(input.ingredients),
        JSON.stringify(input.steps),
        input.sourceUrl ?? null,
        input.category ?? '',
        input.isFavorite ? 1 : 0,
        input.imageUri ?? null,
        now,
        now,
      ],
    );
    return { id, ...input, category: input.category ?? '', isFavorite: input.isFavorite ?? false, createdAt: now, updatedAt: now };
  },

  async update(db: SQLiteDatabase, id: string, changes: RecipeUpdate): Promise<void> {
    const current = await RecipeRepository.getById(db, id);
    if (!current) throw new Error(`Recipe not found: ${id}`);

    const merged = { ...current, ...changes };
    const now = new Date().toISOString();

    // FIX: Handle image changes (new image, remove image)
    if (changes.imageUri !== undefined) {
      // Image changed to new one: delete old
      if (changes.imageUri && current.imageUri !== changes.imageUri && current.imageUri) {
        await deleteRecipeImage(current.imageUri);
      }
      // Image removed (set to undefined): delete old
      if (changes.imageUri === undefined && current.imageUri) {
        await deleteRecipeImage(current.imageUri);
      }
    }

    await db.runAsync(
      `UPDATE recipes
         SET title = ?, ingredients = ?, steps = ?, source_url = ?, category = ?, is_favorite = ?, image_uri = ?, updated_at = ?
       WHERE id = ?`,
      [
        merged.title,
        JSON.stringify(merged.ingredients),
        JSON.stringify(merged.steps),
        merged.sourceUrl ?? null,
        merged.category ?? '',
        merged.isFavorite ? 1 : 0,
        merged.imageUri ?? null,
        now,
        id,
      ],
    );
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    const recipe = await RecipeRepository.getById(db, id);
    if (recipe?.imageUri) {
      await deleteRecipeImage(recipe.imageUri);
    }
    await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
  },
};
