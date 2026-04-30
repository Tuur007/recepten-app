import { create } from 'zustand';
import { Recipe } from '../types/recipe';

interface RecipeState {
  recipes: Recipe[];
  isLoading: boolean;
  hasLoaded: boolean;

  setRecipes: (recipes: Recipe[]) => void;
  setLoading: (loading: boolean) => void;
  setLoaded: (loaded: boolean) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipeInStore: (id: string, updates: Partial<Recipe>) => void;
  removeRecipe: (id: string) => void;
}

export const useRecipeStore = create<RecipeState>((set) => ({
  recipes: [],
  isLoading: false,
  hasLoaded: false,

  setRecipes: (recipes) => set({ recipes }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoaded: (hasLoaded) => set({ hasLoaded }),

  addRecipe: (recipe) =>
    set((state) => ({ recipes: [recipe, ...state.recipes] })),

  updateRecipeInStore: (id, updates) =>
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r,
      ),
    })),

  removeRecipe: (id) =>
    set((state) => ({ recipes: state.recipes.filter((r) => r.id !== id) })),
}));
