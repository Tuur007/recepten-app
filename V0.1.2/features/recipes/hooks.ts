import { useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Recipe, RecipeInput, RecipeUpdate } from '../../types/recipe';
import { RecipeRepository } from './repository';
import { useRecipeStore } from '../../store/recipeStore';
import { haptics, toast } from '../../utils/feedback';

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
    applyLocalEdit,
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
        toast.error('Recepten niet geladen', 'Probeer de app opnieuw te openen.');
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [db, hasLoaded, setLoading, setRecipes, setLoaded]);

  const create = useCallback(
    async (input: RecipeInput): Promise<Recipe> => {
      try {
        const recipe = await RecipeRepository.create(db, input);
        addRecipe(recipe);
        haptics.success();
        toast.success('Recept opgeslagen', input.title);
        return recipe;
      } catch (err) {
        console.error('[useRecipes.create] Failed:', err);
        haptics.error();
        toast.error('Niet opgeslagen', 'Probeer opnieuw.');
        throw err;
      }
    },
    [db, addRecipe],
  );

  const update = useCallback(
    async (id: string, changes: RecipeUpdate): Promise<void> => {
      try {
        await RecipeRepository.update(db, id, changes);
        applyLocalEdit(id, changes);
      } catch (err) {
        console.error('[useRecipes.update] Failed:', err);
        toast.error('Niet opgeslagen', 'Wijziging is niet bewaard.');
        throw err;
      }
    },
    [db, applyLocalEdit],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        await RecipeRepository.delete(db, id);
        removeRecipe(id);
        haptics.medium();
        toast.success('Recept verwijderd');
      } catch (err) {
        console.error('[useRecipes.remove] Failed:', err);
        toast.error('Niet verwijderd', 'Probeer opnieuw.');
        throw err;
      }
    },
    [db, removeRecipe],
  );

  const getById = useCallback(
    (id: string): Recipe | undefined => recipes.find((r) => r.id === id),
    [recipes],
  );

  return { recipes, isLoading, hasLoaded, create, update, remove, getById };
}
