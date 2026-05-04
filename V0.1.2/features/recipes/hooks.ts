import { useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Recipe, RecipeInput, RecipeUpdate } from '../../types/recipe';
import { RecipeRepository } from './repository';
import { useRecipeStore } from '../../store/recipeStore';

export function useRecipes() {
  const db = useSQLiteContext();
  const {
    recipes,
    isLoading,
    hasLoaded,
    setRecipes,
    setLoading,
    setLoaded,
    addRecipe,
    updateRecipeInStore,
    removeRecipe,
  } = useRecipeStore();

  useEffect(() => {
    if (hasLoaded) return;
    setLoading(true);
    RecipeRepository.getAll(db)
      .then((data) => {
        setRecipes(data);
        setLoaded(true);
      })
      .catch((err) => {
        console.error('[useRecipes] Load error:', err);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [db, hasLoaded, setLoading, setRecipes, setLoaded]);

  const create = useCallback(
    async (input: RecipeInput): Promise<Recipe> => {
      const recipe = await RecipeRepository.create(db, input);
      addRecipe(recipe);
      return recipe;
    },
    [db, addRecipe],
  );

  const update = useCallback(
    async (id: string, changes: RecipeUpdate): Promise<void> => {
      await RecipeRepository.update(db, id, changes);
      updateRecipeInStore(id, changes);
    },
    [db, updateRecipeInStore],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await RecipeRepository.delete(db, id);
      removeRecipe(id);
    },
    [db, removeRecipe],
  );

  const getById = useCallback(
    (id: string): Recipe | undefined => recipes.find((r) => r.id === id),
    [recipes],
  );

  return { recipes, isLoading, hasLoaded, create, update, remove, getById };
}
