// Volledige no-op stub — geen imports van supabase tot de Expo Go
// versie-mismatch is opgelost. Alle functies doen niets en falen niet.

import type { Recipe } from '../../types/recipe';
import type { GroceryItem } from '../../types/grocery';

export async function pushRecipe(_recipe: Recipe): Promise<void> {}
export async function deleteRecipeRemote(_id: string): Promise<void> {}
export async function pushGroceryItem(_item: GroceryItem): Promise<void> {}
export async function deleteGroceryItemRemote(_id: string): Promise<void> {}
export async function pullAll(): Promise<void> {}
export function subscribeToFamily(_familyId: string): () => void {
  return () => {};
}
