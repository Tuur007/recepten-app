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

// User-customisable: the categoriesStore lets users add/rename/remove
// categories at runtime, so the persisted value is a free-form string.
// RECIPE_CATEGORIES above is kept as a convenience constant for the
// built-in starter set used by category-picker UI and detection helpers.
export type RecipeCategory = string;

export const ALLERGENS = [
  'Gluten',
  'Schaaldieren',
  'Eieren',
  'Vis',
  'Pinda\'s',
  'Soja',
  'Melk',
  'Noten',
  'Selderij',
  'Mosterd',
  'Sesamzaad',
  'Sulfiet',
  'Lupine',
  'Weekdieren',
] as const;

export type Allergen = (typeof ALLERGENS)[number];

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
  allergens: string[];
  createdAt: string;
  updatedAt: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  preparationTime?: number;
  cookingTime?: number;
  servings?: number;
  rating?: number;
  timesCooked?: number;
  lastCooked?: string;
  notes?: string;
  equipment?: string[];
}

export type RecipeInput = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
export type RecipeUpdate = Partial<RecipeInput>;
