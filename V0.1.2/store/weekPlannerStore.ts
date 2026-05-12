import { create } from 'zustand';

export type MealType = 'lunch' | 'dinner';

export interface DayPlan {
  lunch: string | null;
  dinner: string | null;
}

export interface MealPlan {
  [day: string]: DayPlan;
}

interface WeekPlannerState {
  mealPlan: MealPlan;
  setMealPlan: (plan: MealPlan) => void;
  setMeal: (day: string, mealType: MealType, recipeId: string) => void;
  removeMeal: (day: string, mealType: MealType) => void;
  clearDay: (day: string) => void;
  clearAll: () => void;
}

function emptyDay(): DayPlan {
  return { lunch: null, dinner: null };
}

const initialMealPlan: MealPlan = {
  MON: emptyDay(),
  TUE: emptyDay(),
  WED: emptyDay(),
  THU: emptyDay(),
  FRI: emptyDay(),
  SAT: emptyDay(),
  SUN: emptyDay(),
};

export const useWeekPlannerStore = create<WeekPlannerState>((set) => ({
  mealPlan: initialMealPlan,

  setMealPlan: (plan) => set({ mealPlan: plan }),

  setMeal: (day, mealType, recipeId) =>
    set((state) => ({
      mealPlan: {
        ...state.mealPlan,
        [day]: {
          ...(state.mealPlan[day] ?? emptyDay()),
          [mealType]: recipeId,
        },
      },
    })),

  removeMeal: (day, mealType) =>
    set((state) => ({
      mealPlan: {
        ...state.mealPlan,
        [day]: {
          ...(state.mealPlan[day] ?? emptyDay()),
          [mealType]: null,
        },
      },
    })),

  clearDay: (day) =>
    set((state) => ({
      mealPlan: {
        ...state.mealPlan,
        [day]: emptyDay(),
      },
    })),

  clearAll: () =>
    set({
      mealPlan: {
        MON: emptyDay(),
        TUE: emptyDay(),
        WED: emptyDay(),
        THU: emptyDay(),
        FRI: emptyDay(),
        SAT: emptyDay(),
        SUN: emptyDay(),
      },
    }),
}));
