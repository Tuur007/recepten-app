import { create } from 'zustand';

export interface MealPlan {
  [day: string]: string[];
}

interface WeekPlannerState {
  mealPlan: MealPlan;
  setMealPlan: (plan: MealPlan) => void;
  addMeal: (day: string, recipeId: string) => void;
  removeMeal: (day: string, recipeId: string) => void;
  clearDay: (day: string) => void;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const initialMealPlan: MealPlan = {
  MON: [],
  TUE: [],
  WED: [],
  THU: [],
  FRI: [],
  SAT: [],
  SUN: [],
};

export const useWeekPlannerStore = create<WeekPlannerState>((set) => ({
  mealPlan: initialMealPlan,

  setMealPlan: (plan) => set({ mealPlan: plan }),

  addMeal: (day, recipeId) =>
    set((state) => ({
      mealPlan: {
        ...state.mealPlan,
        [day]: [...(state.mealPlan[day] || []), recipeId],
      },
    })),

  removeMeal: (day, recipeId) =>
    set((state) => ({
      mealPlan: {
        ...state.mealPlan,
        [day]: (state.mealPlan[day] || []).filter((id) => id !== recipeId),
      },
    })),

  clearDay: (day) =>
    set((state) => ({
      mealPlan: {
        ...state.mealPlan,
        [day]: [],
      },
    })),
}));
