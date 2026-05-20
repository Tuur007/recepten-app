import { type SQLiteDatabase } from 'expo-sqlite';
import { Recipe, RecipeInput, RecipeUpdate } from '../../types/recipe';
import { generateId } from '../../utils/id';
import { deleteRecipeImage } from '../../utils/imageStorage';
import { pushRecipe, deleteRecipeRemote } from '../../services/sync/supabaseSync';

interface RecipeRow {
  id: string;
  title: string;
  ingredients: string;
  steps: string;
  source_url: string | null;
  duration: number | null;
  category: string;
  is_favorite: number;
  image_uri: string | null;
  allergens: string | null;
  created_at: string;
  updated_at: string;
  difficulty: string | null;
  preparation_time: number | null;
  cooking_time: number | null;
  servings: number | null;
  rating: number | null;
  times_cooked: number | null;
  last_cooked: string | null;
  notes: string | null;
  equipment: string | null;
}

function rowToRecipe(row: RecipeRow): Recipe {
  let allergens: string[] = [];
  try { allergens = JSON.parse(row.allergens ?? '[]'); } catch { allergens = []; }
  let equipment: string[] | undefined;
  try { equipment = row.equipment ? JSON.parse(row.equipment) : undefined; } catch { equipment = undefined; }

  // Derive duration from prep + cook when not set explicitly so the detail
  // stat reflects total time even before migration v21 has touched the row.
  const derivedDuration =
    row.duration ??
    (row.preparation_time != null || row.cooking_time != null
      ? (row.preparation_time ?? 0) + (row.cooking_time ?? 0)
      : undefined);

  return {
    id: row.id,
    title: row.title,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    sourceUrl: row.source_url ?? undefined,
    duration: derivedDuration,
    category: (row.category ?? '') as Recipe['category'],
    isFavorite: row.is_favorite === 1,
    imageUri: row.image_uri ?? undefined,
    allergens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    difficulty: (row.difficulty ?? undefined) as Recipe['difficulty'],
    preparationTime: row.preparation_time ?? undefined,
    cookingTime: row.cooking_time ?? undefined,
    servings: row.servings ?? undefined,
    rating: row.rating ?? undefined,
    timesCooked: row.times_cooked ?? 0,
    lastCooked: row.last_cooked ?? undefined,
    notes: row.notes ?? undefined,
    equipment,
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
    const id = generateId();
    const now = new Date().toISOString();
    console.log(`[RecipeRepository.create] Storing imageUri: ${input.imageUri ?? 'null'}`);
    await db.runAsync(
      `INSERT INTO recipes (id, title, ingredients, steps, source_url, duration, category, is_favorite, image_uri, allergens, created_at, updated_at, difficulty, preparation_time, cooking_time, servings, rating, times_cooked, last_cooked, notes, equipment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        JSON.stringify(input.ingredients),
        JSON.stringify(input.steps),
        input.sourceUrl ?? null,
        input.duration ?? null,
        input.category ?? '',
        input.isFavorite ? 1 : 0,
        input.imageUri ?? null,
        JSON.stringify(input.allergens ?? []),
        now,
        now,
        input.difficulty ?? null,
        input.preparationTime ?? null,
        input.cookingTime ?? null,
        input.servings ?? null,
        input.rating ?? null,
        input.timesCooked ?? 0,
        input.lastCooked ?? null,
        input.notes ?? null,
        input.equipment ? JSON.stringify(input.equipment) : null,
      ],
    );
    const recipe = {
      id,
      ...input,
      category: input.category ?? '',
      isFavorite: input.isFavorite ?? false,
      allergens: input.allergens ?? [],
      timesCooked: input.timesCooked ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    pushRecipe(recipe).catch(console.error);
    return recipe;
  },

  async update(db: SQLiteDatabase, id: string, changes: RecipeUpdate): Promise<void> {
    const current = await RecipeRepository.getById(db, id);
    if (!current) throw new Error(`Recipe not found: ${id}`);

    const merged = { ...current, ...changes };
    const now = new Date().toISOString();

    // Delete old image file when image is replaced or removed
    if ('imageUri' in changes && current.imageUri) {
      if (changes.imageUri !== current.imageUri) {
        await deleteRecipeImage(current.imageUri);
      }
    }

    await db.runAsync(
      `UPDATE recipes
         SET title = ?, ingredients = ?, steps = ?, source_url = ?, duration = ?, category = ?, is_favorite = ?, image_uri = ?, allergens = ?, updated_at = ?,
             difficulty = ?, preparation_time = ?, cooking_time = ?, servings = ?, rating = ?, times_cooked = ?, last_cooked = ?, notes = ?, equipment = ?
       WHERE id = ?`,
      [
        merged.title,
        JSON.stringify(merged.ingredients),
        JSON.stringify(merged.steps),
        merged.sourceUrl ?? null,
        merged.duration ?? null,
        merged.category ?? '',
        merged.isFavorite ? 1 : 0,
        merged.imageUri ?? null,
        JSON.stringify(merged.allergens ?? []),
        now,
        merged.difficulty ?? null,
        merged.preparationTime ?? null,
        merged.cookingTime ?? null,
        merged.servings ?? null,
        merged.rating ?? null,
        merged.timesCooked ?? 0,
        merged.lastCooked ?? null,
        merged.notes ?? null,
        merged.equipment ? JSON.stringify(merged.equipment) : null,
        id,
      ],
    );
    pushRecipe({ ...merged, updatedAt: now }).catch(console.error);
  },

  async delete(db: SQLiteDatabase, id: string): Promise<void> {
    const recipe = await RecipeRepository.getById(db, id);
    if (recipe?.imageUri) {
      await deleteRecipeImage(recipe.imageUri);
    }
    await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
    deleteRecipeRemote(id).catch(console.error);
  },
};
