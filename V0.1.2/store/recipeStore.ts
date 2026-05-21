import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Recipe } from '../types/recipe';
import { normalizeUrl } from '../utils/normalize';

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

export const useRecipeStore = create<RecipeState>()(
  immer((set, get) => ({
    recipes: [],
    isLoading: false,
    hasLoaded: false,
    sortBy: 'recent',

    setRecipes: (recipes) => set({ recipes }),
    setLoading: (isLoading) => set({ isLoading }),
    setLoaded: (hasLoaded) => set({ hasLoaded }),

    addRecipe: (recipe) =>
      set((s) => { s.recipes.unshift(recipe); }),

    updateRecipeInStore: (id, updates) =>
      set((s) => {
        const r = s.recipes.find((r) => r.id === id);
        if (r) Object.assign(r, updates, { updatedAt: new Date().toISOString() });
      }),

    removeRecipe: (id) =>
      set((s) => { s.recipes = s.recipes.filter((r) => r.id !== id); }),

    setSortBy: (sort) => set({ sortBy: sort }),

    toggleFavorite: (id) =>
      set((s) => {
        const r = s.recipes.find((r) => r.id === id);
        if (r) { r.isFavorite = !r.isFavorite; r.updatedAt = new Date().toISOString(); }
      }),

    incrementTimesCooked: (id) =>
      set((s) => {
        const r = s.recipes.find((r) => r.id === id);
        if (r) {
          r.timesCooked = (r.timesCooked ?? 0) + 1;
          r.lastCooked = new Date().toISOString();
          r.updatedAt = new Date().toISOString();
        }
      }),

    updateRating: (id, rating) =>
      set((s) => {
        const r = s.recipes.find((r) => r.id === id);
        if (r) { r.rating = rating; r.updatedAt = new Date().toISOString(); }
      }),

    updateNotes: (id, notes) =>
      set((s) => {
        const r = s.recipes.find((r) => r.id === id);
        if (r) { r.notes = notes; r.updatedAt = new Date().toISOString(); }
      }),

    recipeExists: (title, sourceUrl) => {
      const state = get();
      const normalizedTitle = title.toLowerCase().trim();
      const normalizedUrl = sourceUrl ? normalizeUrl(sourceUrl) : '';
      return state.recipes.some(
        (r) =>
          r.title.toLowerCase().trim() === normalizedTitle ||
          (normalizedUrl !== '' && normalizeUrl(r.sourceUrl ?? '') === normalizedUrl),
      );
    },
  })),
);
