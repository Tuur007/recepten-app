import { type SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../supabase';
import { useRecipeStore } from '../../store/recipeStore';
import { useGroceryStore } from '../../store/groceryStore';
import { useWeekPlannerStore, type MealPlan, type WeeksMap } from '../../store/weekPlannerStore';
import { useAuthStore } from '../../store/authStore';
import { RecipeRepository } from '../../features/recipes/repository';
import { GroceryRepository } from '../../features/grocery/repository';
import type { Recipe } from '../../types/recipe';
import type { GroceryItem } from '../../types/grocery';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recipeToRow(recipe: Recipe, familyId: string) {
  return {
    id: recipe.id,
    family_id: familyId,
    title: recipe.title,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    source_url: recipe.sourceUrl ?? null,
    duration: recipe.duration ?? null,
    category: recipe.category,
    is_favorite: recipe.isFavorite,
    image_uri: recipe.imageUri ?? null,
    allergens: recipe.allergens,
    difficulty: recipe.difficulty ?? null,
    preparation_time: recipe.preparationTime ?? null,
    cooking_time: recipe.cookingTime ?? null,
    servings: recipe.servings ?? null,
    rating: recipe.rating ?? null,
    times_cooked: recipe.timesCooked ?? 0,
    last_cooked: recipe.lastCooked ?? null,
    notes: recipe.notes ?? null,
    equipment: recipe.equipment ?? null,
    created_at: recipe.createdAt,
    updated_at: recipe.updatedAt,
  };
}

function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    title: row.title as string,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients as Recipe['ingredients'] : [],
    steps: Array.isArray(row.steps) ? row.steps as string[] : [],
    sourceUrl: row.source_url as string | undefined,
    duration: row.duration as number | undefined,
    category: row.category as string,
    isFavorite: Boolean(row.is_favorite),
    imageUri: row.image_uri as string | undefined,
    allergens: Array.isArray(row.allergens) ? row.allergens as string[] : [],
    difficulty: row.difficulty as Recipe['difficulty'],
    preparationTime: row.preparation_time as number | undefined,
    cookingTime: row.cooking_time as number | undefined,
    servings: row.servings as number | undefined,
    rating: row.rating as number | undefined,
    timesCooked: (row.times_cooked as number) ?? 0,
    lastCooked: row.last_cooked as string | undefined,
    notes: row.notes as string | undefined,
    equipment: Array.isArray(row.equipment) ? row.equipment as string[] : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function groceryToRow(item: GroceryItem, familyId: string) {
  return {
    id: item.id,
    family_id: familyId,
    name: item.name,
    unit: item.unit,
    sources: item.sources,
    total_quantity: item.totalQuantity,
    checked: item.checked,
    category: item.category ?? '',
    aisle: item.aisle ?? null,
    price: item.price ?? null,
    store_id: item.storeId ?? null,
    created_at: item.createdAt,
  };
}

function rowToGrocery(row: Record<string, unknown>): GroceryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    unit: row.unit as string,
    sources: Array.isArray(row.sources) ? row.sources as GroceryItem['sources'] : [],
    totalQuantity: row.total_quantity as number,
    checked: Boolean(row.checked),
    category: row.category as string,
    aisle: row.aisle as string | undefined,
    price: row.price as number | undefined,
    storeId: row.store_id as string | undefined,
    createdAt: row.created_at as string,
  };
}

// ─── Push (lokaal → Supabase) ─────────────────────────────────────────────────

export async function pushRecipe(recipe: Recipe): Promise<void> {
  if (!defaultSupabase) return;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;
  await defaultSupabase.from('recipes').upsert(recipeToRow(recipe, familyId));
}

export async function deleteRecipeRemote(id: string): Promise<void> {
  if (!defaultSupabase) return;
  await defaultSupabase
    .from('recipes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
}

export async function pushGroceryItem(item: GroceryItem): Promise<void> {
  if (!defaultSupabase) return;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;
  await defaultSupabase.from('grocery_items').upsert(groceryToRow(item, familyId));
}

export async function deleteGroceryItemRemote(id: string): Promise<void> {
  if (!defaultSupabase) return;
  await defaultSupabase
    .from('grocery_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
}

export async function pushWeekPlan(weekKey: string, plan: MealPlan): Promise<void> {
  if (!defaultSupabase) return;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;
  await defaultSupabase
    .from('week_plans')
    .upsert(
      {
        family_id: familyId,
        week_key: weekKey,
        plan_data: plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'family_id,week_key' },
    );
}

// ─── Pull (Supabase → lokaal) ─────────────────────────────────────────────────

interface WeekPlanRow {
  week_key: string;
  plan_data: MealPlan;
}

function mergeIncomingWeeks(existing: WeeksMap, rows: WeekPlanRow[]): WeeksMap {
  const merged: WeeksMap = { ...existing };
  for (const row of rows) {
    if (row?.week_key && row?.plan_data && typeof row.plan_data === 'object') {
      merged[row.week_key] = row.plan_data;
    }
  }
  return merged;
}

/**
 * Haalt alle gezins-data uit Supabase en schrijft die door naar SQLite én
 * naar de in-memory stores. Het `client`-argument is overridebaar voor tests;
 * in productie wordt de default Supabase-client gebruikt.
 */
export async function pullAll(
  db: SQLiteDatabase,
  client: SupabaseClient | null = defaultSupabase,
): Promise<void> {
  if (!client) return;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;

  const [recipesRes, groceryRes, weeksRes] = await Promise.all([
    client
      .from('recipes')
      .select('*')
      .eq('family_id', familyId)
      .is('deleted_at', null),
    client
      .from('grocery_items')
      .select('*')
      .eq('family_id', familyId)
      .is('deleted_at', null),
    client
      .from('week_plans')
      .select('*')
      .eq('family_id', familyId),
  ]);

  if (recipesRes.data && Array.isArray(recipesRes.data)) {
    const recipes = recipesRes.data.map(rowToRecipe);
    await RecipeRepository.upsertMany(db, recipes);
    useRecipeStore.getState().setRecipes(recipes);
  }

  if (groceryRes.data && Array.isArray(groceryRes.data)) {
    const items = groceryRes.data.map(rowToGrocery);
    await GroceryRepository.upsertMany(db, items);
    useGroceryStore.getState().setItems(items);
  }

  if (weeksRes.data && Array.isArray(weeksRes.data)) {
    const merged = mergeIncomingWeeks(
      useWeekPlannerStore.getState().weeks,
      weeksRes.data as WeekPlanRow[],
    );
    useWeekPlannerStore.getState().setWeeks(merged);
  }
}

// ─── Realtime subscriptions ───────────────────────────────────────────────────

export function subscribeToFamily(
  familyId: string,
  db: SQLiteDatabase,
  client: SupabaseClient | null = defaultSupabase,
): () => void {
  if (!client) return () => {};

  const recipeChannel = client
    .channel(`recipes:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recipes', filter: `family_id=eq.${familyId}` },
      (payload) => {
        const store = useRecipeStore.getState();
        const newRow = payload.new as Record<string, unknown> | undefined;
        const oldRow = payload.old as Record<string, unknown> | undefined;
        if (payload.eventType === 'DELETE' || newRow?.deleted_at) {
          const id = (oldRow?.id ?? newRow?.id) as string;
          store.removeRecipe(id);
          RecipeRepository.delete(db, id).catch(console.error);
        } else if (payload.eventType === 'INSERT' && newRow) {
          const recipe = rowToRecipe(newRow);
          store.addRecipe(recipe);
          RecipeRepository.upsertMany(db, [recipe]).catch(console.error);
        } else if (payload.eventType === 'UPDATE' && newRow) {
          const recipe = rowToRecipe(newRow);
          store.updateRecipeInStore(recipe.id, recipe);
          RecipeRepository.upsertMany(db, [recipe]).catch(console.error);
        }
      },
    )
    .subscribe();

  const groceryChannel = client
    .channel(`grocery:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'grocery_items', filter: `family_id=eq.${familyId}` },
      (payload) => {
        const store = useGroceryStore.getState();
        const newRow = payload.new as Record<string, unknown> | undefined;
        const oldRow = payload.old as Record<string, unknown> | undefined;
        if (payload.eventType === 'DELETE' || newRow?.deleted_at) {
          const id = (oldRow?.id ?? newRow?.id) as string;
          store.deleteItem(id);
          GroceryRepository.delete(db, id).catch(console.error);
        } else if (payload.eventType === 'INSERT' && newRow) {
          const item = rowToGrocery(newRow);
          store.addItem(item);
          GroceryRepository.upsertMany(db, [item]).catch(console.error);
        } else if (payload.eventType === 'UPDATE' && newRow) {
          const item = rowToGrocery(newRow);
          store.updateItemInStore(item.id, item);
          GroceryRepository.upsertMany(db, [item]).catch(console.error);
        }
      },
    )
    .subscribe();

  const weekPlanChannel = client
    .channel(`weekplans:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'week_plans', filter: `family_id=eq.${familyId}` },
      (payload) => {
        const newRow = payload.new as Record<string, unknown> | undefined;
        if (!newRow) return;
        const weekKey = newRow.week_key as string;
        const planData = newRow.plan_data as MealPlan;
        if (!weekKey || !planData) return;
        const merged = mergeIncomingWeeks(
          useWeekPlannerStore.getState().weeks,
          [{ week_key: weekKey, plan_data: planData }],
        );
        useWeekPlannerStore.getState().setWeeks(merged);
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(recipeChannel);
    client.removeChannel(groceryChannel);
    client.removeChannel(weekPlanChannel);
  };
}
