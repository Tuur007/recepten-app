import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type DifficultyLevel = 'easy' | 'medium' | 'hard';
type TimeRange = 'under15' | '15to30' | 'over30';
type SortOption = 'recent' | 'alphabetical' | 'mostCooked' | 'difficulty';

interface FiltersState {
  selectedDifficulty: DifficultyLevel | null;
  selectedTimeRange: TimeRange | null;
  favoritesOnly: boolean;
  selectedCategory: string | null;
  sortBy: SortOption;

  setDifficulty: (difficulty: DifficultyLevel | null) => void;
  setTimeRange: (range: TimeRange | null) => void;
  setFavoritesOnly: (favoritesOnly: boolean) => void;
  setCategory: (category: string | null) => void;
  setSortBy: (sort: SortOption) => void;
  clearAllFilters: () => void;
  hasActiveFilters: () => boolean;
}

export const useFiltersStore = create<FiltersState>()(
  immer((set, get) => ({
    selectedDifficulty: null,
    selectedTimeRange: null,
    favoritesOnly: false,
    selectedCategory: null,
    sortBy: 'recent',

    setDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
    setTimeRange: (range) => set({ selectedTimeRange: range }),
    setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly }),
    setCategory: (category) => set({ selectedCategory: category }),
    setSortBy: (sort) => set({ sortBy: sort }),

    clearAllFilters: () => set({
      selectedDifficulty: null,
      selectedTimeRange: null,
      favoritesOnly: false,
      selectedCategory: null,
      sortBy: 'recent',
    }),

    hasActiveFilters: () => {
      const state = get();
      return (
        state.selectedDifficulty !== null ||
        state.selectedTimeRange !== null ||
        state.favoritesOnly ||
        state.selectedCategory !== null
      );
    },
  })),
);
