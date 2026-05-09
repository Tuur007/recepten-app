import { create } from 'zustand';
import { Recipe } from '../types/recipe';

type SortOption = 'recent' | 'alphabetical' | 'duration';

interface RecipeState {
  recipes: Recipe[];
  isLoading: boolean;
  hasLoaded: boolean;
  sortBy: SortOption;

  setRecipes: (recipes: Recipe[]) => void;
  setLoading: (loading: boolean) => void;
  setLoaded: (loaded: boolean) => void;
  addRecipe: (recipe: Recipe) => void;
  updateRecipeInStore: (id: string, updates: Partial<Recipe>) => void;
  removeRecipe: (id: string) => void;
  setSortBy: (sort: SortOption) => void;
  recipeExists: (title: string, sourceUrl?: string) => boolean;
  toggleFavorite: (id: string) => void;
  incrementTimesCooked: (id: string) => void;
  updateRating: (id: string, rating: number) => void;
  updateNotes: (id: string, notes: string) => void;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  isLoading: false,
  hasLoaded: false,
  sortBy: 'recent',

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

  setSortBy: (sort) => set({ sortBy: sort }),

  toggleFavorite: (id) =>
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id ? { ...r, isFavorite: !r.isFavorite, updatedAt: new Date().toISOString() } : r,
      ),
    })),

  incrementTimesCooked: (id) =>
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id
          ? { ...r, timesCooked: (r.timesCooked ?? 0) + 1, lastCooked: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : r,
      ),
    })),

  updateRating: (id, rating) =>
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id ? { ...r, rating, updatedAt: new Date().toISOString() } : r,
      ),
    })),

  updateNotes: (id, notes) =>
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id ? { ...r, notes, updatedAt: new Date().toISOString() } : r,
      ),
    })),

  recipeExists: (title, sourceUrl) => {
    const state = get();
    const normalizedTitle = title.toLowerCase().trim();
    return state.recipes.some(
      (r) =>
        r.title.toLowerCase().trim() === normalizedTitle ||
        (sourceUrl && r.sourceUrl === sourceUrl)
    );
  },
}));
