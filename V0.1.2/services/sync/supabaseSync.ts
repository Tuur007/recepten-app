import { supabase } from '../supabase';
import { useRecipeStore } from '../../store/recipeStore';
import { useGroceryStore } from '../../store/groceryStore';
import { useAuthStore } from '../../store/authStore';
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
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;
  await supabase.from('recipes').upsert(recipeToRow(recipe, familyId));
}

export async function deleteRecipeRemote(id: string): Promise<void> {
  await supabase
    .from('recipes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
}

export async function pushGroceryItem(item: GroceryItem): Promise<void> {
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;
  await supabase.from('grocery_items').upsert(groceryToRow(item, familyId));
}

export async function deleteGroceryItemRemote(id: string): Promise<void> {
  await supabase
    .from('grocery_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
}

// ─── Pull (Supabase → lokaal) ─────────────────────────────────────────────────

export async function pullAll(): Promise<void> {
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;

  const [recipesRes, groceryRes] = await Promise.all([
    supabase
      .from('recipes')
      .select('*')
      .eq('family_id', familyId)
      .is('deleted_at', null),
    supabase
      .from('grocery_items')
      .select('*')
      .eq('family_id', familyId)
      .is('deleted_at', null),
  ]);

  if (recipesRes.data) {
    const recipes = recipesRes.data.map(rowToRecipe);
    useRecipeStore.getState().setRecipes(recipes);
  }

  if (groceryRes.data) {
    const items = groceryRes.data.map(rowToGrocery);
    useGroceryStore.getState().setItems(items);
  }
}

// ─── Realtime subscriptions ───────────────────────────────────────────────────

export function subscribeToFamily(familyId: string): () => void {
  const recipeChannel = supabase
    .channel(`recipes:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'recipes', filter: `family_id=eq.${familyId}` },
      (payload) => {
        const store = useRecipeStore.getState();
        const newRow = payload.new as Record<string, unknown> | undefined;
        const oldRow = payload.old as Record<string, unknown> | undefined;
        if (payload.eventType === 'DELETE' || newRow?.deleted_at) {
          store.removeRecipe(((oldRow?.id ?? newRow?.id) as string));
        } else if (payload.eventType === 'INSERT' && newRow) {
          store.addRecipe(rowToRecipe(newRow));
        } else if (payload.eventType === 'UPDATE' && newRow) {
          store.updateRecipeInStore(
            newRow.id as string,
            rowToRecipe(newRow),
          );
        }
      },
    )
    .subscribe();

  const groceryChannel = supabase
    .channel(`grocery:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'grocery_items', filter: `family_id=eq.${familyId}` },
      (payload) => {
        const store = useGroceryStore.getState();
        const newRow = payload.new as Record<string, unknown> | undefined;
        const oldRow = payload.old as Record<string, unknown> | undefined;
        if (payload.eventType === 'DELETE' || newRow?.deleted_at) {
          store.deleteItem(((oldRow?.id ?? newRow?.id) as string));
        } else if (payload.eventType === 'INSERT' && newRow) {
          store.addItem(rowToGrocery(newRow));
        } else if (payload.eventType === 'UPDATE' && newRow) {
          store.updateItemInStore(
            newRow.id as string,
            rowToGrocery(newRow),
          );
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(recipeChannel);
    supabase.removeChannel(groceryChannel);
  };
}
