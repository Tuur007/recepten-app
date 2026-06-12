import { type SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { error as logError, warn } from '../../utils/logger';
import { supabase as defaultSupabase } from '../supabase';
import { useRecipeStore } from '../../store/recipeStore';
import { useGroceryStore } from '../../store/groceryStore';
import {
  useWeekPlannerStore,
  applyRemoteWeeks,
  type MealPlan,
  type WeeksMap,
} from '../../store/weekPlannerStore';
import { useAuthStore } from '../../store/authStore';
import { RecipeRepository } from '../../features/recipes/repository';
import { GroceryRepository } from '../../features/grocery/repository';
import type { Recipe } from '../../types/recipe';
import type { GroceryItem } from '../../types/grocery';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    nutrition: (row.nutrition && typeof row.nutrition === 'object')
      ? (row.nutrition as Recipe['nutrition'])
      : undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
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

// Push gebeurt via de outbox-queue (services/sync/queue.ts) zodat offline writes
// niet verloren gaan. Deze module zorgt enkel voor pull + realtime.

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
 * Mergt remote rijen in de bestaande store-lijst op id. Lokaal-only items
 * (offline aangemaakt, zitten nog in de outbox) blijven staan — een pull mag
 * die niet uit de UI laten verdwijnen. Tombstoned ids verdwijnen wél.
 */
function mergeIntoList<T extends { id: string; }>(
  current: T[],
  incoming: T[],
  deletedIds: Set<string>,
): T[] {
  const incomingById = new Map(incoming.map((r) => [r.id, r]));
  const merged: T[] = [];
  for (const item of current) {
    if (deletedIds.has(item.id)) continue;
    const remote = incomingById.get(item.id);
    if (remote) {
      merged.push(remote);
      incomingById.delete(item.id);
    } else {
      merged.push(item);
    }
  }
  // Nieuwe remote rijen die lokaal nog niet bestonden.
  for (const remote of incomingById.values()) {
    if (!deletedIds.has(remote.id)) merged.push(remote);
  }
  return merged;
}

/**
 * Haalt alle gezins-data uit Supabase en schrijft die door naar SQLite én
 * naar de in-memory stores. Tombstones (deleted_at gezet) worden lokaal
 * verwijderd — zonder dat resurrecten remote verwijderde recepten op
 * toestellen die het realtime-event gemist hebben. Het `client`-argument is
 * overridebaar voor tests.
 */
export async function pullAll(
  db: SQLiteDatabase,
  client: SupabaseClient | null = defaultSupabase,
): Promise<void> {
  if (!client) return;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;

  const [recipesRes, groceryRes, weeksRes] = await Promise.all([
    client.from('recipes').select('*').eq('family_id', familyId),
    client.from('grocery_items').select('*').eq('family_id', familyId),
    client.from('week_plans').select('*').eq('family_id', familyId),
  ]);

  if (recipesRes.error) warn('[sync] pull recipes failed:', recipesRes.error.message);
  if (groceryRes.error) warn('[sync] pull grocery failed:', groceryRes.error.message);
  if (weeksRes.error) warn('[sync] pull week_plans failed:', weeksRes.error.message);

  if (recipesRes.data && Array.isArray(recipesRes.data)) {
    const live = recipesRes.data.filter((row) => !row.deleted_at).map(rowToRecipe);
    const deletedIds = new Set<string>(
      recipesRes.data.filter((row) => row.deleted_at).map((row) => row.id as string),
    );
    await RecipeRepository.upsertMany(db, live);
    for (const id of deletedIds) {
      await RecipeRepository.deleteLocal(db, id).catch((err) =>
        warn('[sync] local tombstone delete failed:', err),
      );
    }
    const store = useRecipeStore.getState();
    store.setRecipes(mergeIntoList(store.recipes, live, deletedIds));
  }

  if (groceryRes.data && Array.isArray(groceryRes.data)) {
    const live = groceryRes.data.filter((row) => !row.deleted_at).map(rowToGrocery);
    const deletedIds = new Set<string>(
      groceryRes.data.filter((row) => row.deleted_at).map((row) => row.id as string),
    );
    await GroceryRepository.upsertMany(db, live);
    for (const id of deletedIds) {
      await GroceryRepository.deleteLocal(db, id).catch((err) =>
        warn('[sync] local tombstone delete failed:', err),
      );
    }
    const store = useGroceryStore.getState();
    store.setItems(mergeIntoList(store.items, live, deletedIds));
  }

  if (weeksRes.data && Array.isArray(weeksRes.data)) {
    const merged = mergeIncomingWeeks(
      useWeekPlannerStore.getState().weeks,
      weeksRes.data as WeekPlanRow[],
    );
    // Via applyRemoteWeeks zodat de outbox-subscriber dit niet terug omhoog
    // duwt (zie weekPlannerStore).
    applyRemoteWeeks(merged);
  }
}

// ─── Realtime subscriptions ───────────────────────────────────────────────────

// Een kanaal dat stilletjes wegvalt betekent gemiste events tot de volgende
// pull (app-start of foreground). Minstens loggen zodat Sentry het ziet.
function logChannelStatus(name: string): (status: string, err?: Error) => void {
  return (status, err) => {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      warn(`[sync] realtime channel ${name}: ${status}`, err?.message ?? '');
    }
  };
}

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
          // deleteLocal: een remote delete mag nooit terug de outbox in,
          // anders kaatsen toestellen de delete eindeloos naar elkaar.
          RecipeRepository.deleteLocal(db, id).catch(logError);
        } else if (newRow && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
          const recipe = rowToRecipe(newRow);
          // Eigen pushes echoën ook terug — bestaat de rij al, dan is dit een
          // update (replaceFromRemote bewaakt LWW), anders een insert.
          const exists = store.recipes.some((r) => r.id === recipe.id);
          if (exists) {
            store.replaceFromRemote(recipe.id, recipe);
          } else {
            store.addRecipe(recipe);
          }
          RecipeRepository.upsertMany(db, [recipe]).catch(logError);
        }
      },
    )
    .subscribe(logChannelStatus(`recipes:${familyId}`));

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
          GroceryRepository.deleteLocal(db, id).catch(logError);
        } else if (newRow && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
          const item = rowToGrocery(newRow);
          const exists = store.items.some((i) => i.id === item.id);
          if (exists) {
            store.replaceFromRemote(item.id, item);
          } else {
            store.addItem(item);
          }
          GroceryRepository.upsertMany(db, [item]).catch(logError);
        }
      },
    )
    .subscribe(logChannelStatus(`grocery:${familyId}`));

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
        applyRemoteWeeks(merged);
      },
    )
    .subscribe(logChannelStatus(`weekplans:${familyId}`));

  return () => {
    client.removeChannel(recipeChannel);
    client.removeChannel(groceryChannel);
    client.removeChannel(weekPlanChannel);
  };
}
