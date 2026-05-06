import { create } from 'zustand';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect } from 'react';
import { Category, CategoryRepository } from '../features/categories/repository';

interface CategoriesState {
  recipeCategories: Category[];
  groceryCategories: Category[];
  isLoading: boolean;
  hasLoaded: boolean;
  setRecipeCategories: (cats: Category[]) => void;
  setGroceryCategories: (cats: Category[]) => void;
  setLoading: (v: boolean) => void;
  setLoaded: (v: boolean) => void;
  addCategory: (cat: Category) => void;
  updateCategoryInStore: (id: string, name: string) => void;
  removeCategoryFromStore: (id: string) => void;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
  recipeCategories: [],
  groceryCategories: [],
  isLoading: false,
  hasLoaded: false,
  setRecipeCategories: (cats) => set({ recipeCategories: cats }),
  setGroceryCategories: (cats) => set({ groceryCategories: cats }),
  setLoading: (v) => set({ isLoading: v }),
  setLoaded: (v) => set({ hasLoaded: v }),
  addCategory: (cat) =>
    set((s) =>
      cat.type === 'recipe'
        ? { recipeCategories: [...s.recipeCategories, cat] }
        : { groceryCategories: [...s.groceryCategories, cat] },
    ),
  updateCategoryInStore: (id, name) =>
    set((s) => ({
      recipeCategories: s.recipeCategories.map((c) => (c.id === id ? { ...c, name } : c)),
      groceryCategories: s.groceryCategories.map((c) => (c.id === id ? { ...c, name } : c)),
    })),
  removeCategoryFromStore: (id) =>
    set((s) => ({
      recipeCategories: s.recipeCategories.filter((c) => c.id !== id),
      groceryCategories: s.groceryCategories.filter((c) => c.id !== id),
    })),
}));

export function useCategories() {
  const db = useSQLiteContext();
  const repo = new CategoryRepository(db);
  const {
    recipeCategories,
    groceryCategories,
    isLoading,
    hasLoaded,
    setRecipeCategories,
    setGroceryCategories,
    setLoading,
    setLoaded,
    addCategory,
    updateCategoryInStore,
    removeCategoryFromStore,
  } = useCategoriesStore();

  useEffect(() => {
    if (hasLoaded) return;
    setLoading(true);
    repo.getByType('recipe').then((cats) => setRecipeCategories(cats));
    repo.getByType('grocery').then((cats) => {
      setGroceryCategories(cats);
      setLoading(false);
      setLoaded(true);
    });
  }, [hasLoaded]);

  const addRecipeCategory = useCallback(
    async (name: string) => {
      const cat = await repo.create(name, 'recipe');
      addCategory(cat);
    },
    [db],
  );

  const addGroceryCategory = useCallback(
    async (name: string) => {
      const cat = await repo.create(name, 'grocery');
      addCategory(cat);
    },
    [db],
  );

  const updateCategory = useCallback(
    async (id: string, name: string) => {
      await repo.update(id, name);
      updateCategoryInStore(id, name);
    },
    [db],
  );

  const removeCategory = useCallback(
    async (id: string) => {
      await repo.delete(id);
      removeCategoryFromStore(id);
    },
    [db],
  );

  return {
    recipeCategories,
    groceryCategories,
    isLoading,
    hasLoaded,
    addRecipeCategory,
    addGroceryCategory,
    updateCategory,
    removeCategory,
  };
}
