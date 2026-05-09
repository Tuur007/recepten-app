import { useMemo } from 'react';
import { Recipe } from '../../../types/recipe';
import { useFiltersStore } from '../../../store/filtersStore';
import { filterRecipes, sortRecipes } from '../../../utils/filterRecipes';

/**
 * Apply the global filter + sort state to a pre-filtered recipe list.
 * Returns { filtered, sorted, featured, grid } so screens only need one hook call.
 */
export function useFilteredRecipes(recipes: Recipe[]) {
  const { selectedDifficulty, selectedTimeRange, favoritesOnly, sortBy } =
    useFiltersStore();

  const filtered = useMemo(
    () =>
      filterRecipes(recipes, {
        difficulty: selectedDifficulty ?? undefined,
        timeRange: selectedTimeRange ?? undefined,
        favoritesOnly,
      }),
    [recipes, selectedDifficulty, selectedTimeRange, favoritesOnly],
  );

  const sorted = useMemo(() => sortRecipes(filtered, sortBy), [filtered, sortBy]);

  const featured = sorted[0] as Recipe | undefined;
  const grid = useMemo(() => sorted.slice(1), [sorted]);

  return { filtered, sorted, featured, grid };
}
