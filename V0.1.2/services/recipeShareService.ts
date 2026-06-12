import { Share } from 'react-native';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import type { Recipe } from '../types/recipe';

const APP_DEEP_LINK = 'receptenapp://recipe/share/';

export async function shareRecipeViaWhatsApp(recipe: Recipe): Promise<void> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd.');
  const { familyId } = useAuthStore.getState();
  if (!familyId) throw new Error('Niet ingelogd');

  const { data, error } = await supabase
    .from('shared_recipes')
    .insert({
      recipe_id: recipe.id,
      from_family_id: familyId,
    })
    .select('share_token')
    .single();

  if (error || !data) throw new Error('Kon recept niet delen.');

  const shareUrl = `${APP_DEEP_LINK}${data.share_token}`;
  const message = `Recept: ${recipe.title}\n\nOpen in de recepten-app:\n${shareUrl}`;

  await Share.share({ message });
}

export async function fetchSharedRecipe(token: string): Promise<Recipe | null> {
  if (!supabase) return null;
  // Via de SECURITY DEFINER RPC: shared_recipes heeft bewust geen
  // SELECT-policy, en het recept zelf hoort bij een ander gezin — RLS staat
  // een rechtstreekse read dus nooit toe. De functie joint token → recept
  // server-side en checkt de expiry (zie
  // supabase/migrations/shared_recipe_payload.sql).
  const { data, error } = await supabase.rpc('get_shared_recipe_payload', {
    token: token.trim(),
  });
  if (error || !data) return null;

  const recipe = Array.isArray(data) ? data[0] : data;
  if (!recipe) return null;

  return {
    id: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    sourceUrl: recipe.source_url ?? undefined,
    duration: recipe.duration ?? undefined,
    category: recipe.category,
    isFavorite: false,
    imageUri: recipe.image_uri ?? undefined,
    allergens: recipe.allergens ?? [],
    difficulty: recipe.difficulty ?? undefined,
    preparationTime: recipe.preparation_time ?? undefined,
    cookingTime: recipe.cooking_time ?? undefined,
    servings: recipe.servings ?? undefined,
    rating: undefined,
    timesCooked: 0,
    lastCooked: undefined,
    notes: recipe.notes ?? undefined,
    equipment: recipe.equipment ?? undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
