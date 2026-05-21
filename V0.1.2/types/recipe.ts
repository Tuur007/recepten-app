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

/**
 * Nutritie-waardes per portie. Velden zijn optioneel zodat we deelresultaten
 * (bv. enkel kcal + eiwit) ook kunnen tonen wanneer Open Food Facts niet
 * elke ingrediënt heeft kunnen matchen.
 */
export interface NutritionInfo {
  calories?: number;        // kcal per portie
  protein?: number;         // g
  carbs?: number;           // g
  fat?: number;             // g
  fiber?: number;           // g
  sugar?: number;           // g
  salt?: number;            // g
  /** ISO-timestamp van de laatste berekening. Triggert recompute na > 30 dagen. */
  computedAt?: string;
  /** Aantal ingrediënten dat in OFF gevonden werd (transparantie naar de gebruiker). */
  matchedIngredients?: number;
  /** Totaal aantal ingrediënten in het recept op het moment van berekenen. */
  totalIngredients?: number;
}

/** Een gebruikersgemaakte collectie ("BBQ", "snel doordeweeks"). */
export interface RecipeCollection {
  id: string;
  name: string;
  description?: string;
  /** Volgorde-onafhankelijke set; gesorteerd op insert-time door de repository. */
  recipeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type RecipeCollectionInput = Omit<RecipeCollection, 'id' | 'createdAt' | 'updatedAt' | 'recipeIds'> & {
  recipeIds?: string[];
};

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
  nutrition?: NutritionInfo;
}

export type RecipeInput = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
export type RecipeUpdate = Partial<RecipeInput>;
