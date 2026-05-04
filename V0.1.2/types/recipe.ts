export const RECIPE_CATEGORIES = [
  'Ontbijt',
  'Lunch',
  'Diner',
  'Snack',
  'Dessert',
  'Soep',
  'Salade',
  'Bakken',
  'Dranken',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number] | '';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  steps: string[];
  sourceUrl?: string;
  duration?: number;
  category: RecipeCategory;
  isFavorite: boolean;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecipeInput = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
export type RecipeUpdate = Partial<RecipeInput>;
