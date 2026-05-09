import { Recipe } from '../types/recipe';

interface FilterCriteria {
  difficulty?: 'easy' | 'medium' | 'hard';
  timeRange?: 'under15' | '15to30' | 'over30';
  favoritesOnly?: boolean;
  category?: string;
}

export function filterRecipes(recipes: Recipe[], criteria: FilterCriteria): Recipe[] {
  return recipes.filter((recipe) => {
    if (criteria.favoritesOnly && !recipe.isFavorite) return false;
    if (criteria.difficulty && recipe.difficulty !== criteria.difficulty) return false;

    if (criteria.timeRange) {
      const totalTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0);
      const inRange =
        criteria.timeRange === 'under15' ? totalTime < 15 :
        criteria.timeRange === '15to30' ? totalTime >= 15 && totalTime <= 30 :
        criteria.timeRange === 'over30' ? totalTime > 30 : true;
      if (!inRange) return false;
    }

    if (criteria.category && recipe.category !== criteria.category) return false;
    return true;
  });
}

export function sortRecipes(
  recipes: Recipe[],
  sortBy: 'recent' | 'alphabetical' | 'mostCooked' | 'difficulty',
): Recipe[] {
  const copy = [...recipes];

  switch (sortBy) {
    case 'recent':
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case 'alphabetical':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'mostCooked':
      return copy.sort((a, b) => (b.timesCooked ?? 0) - (a.timesCooked ?? 0));
    case 'difficulty': {
      const diffOrder = { easy: 1, medium: 2, hard: 3 };
      return copy.sort(
        (a, b) =>
          (diffOrder[a.difficulty ?? 'easy'] ?? 1) - (diffOrder[b.difficulty ?? 'easy'] ?? 1),
      );
    }
    default:
      return copy;
  }
}

export function getTotalCookingTime(preparationTime?: number, cookingTime?: number): number {
  return (preparationTime ?? 0) + (cookingTime ?? 0);
}

export function formatCookingTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}
