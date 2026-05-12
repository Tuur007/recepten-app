import { useState } from 'react';
import { Ingredient, RecipeCategory } from '../../../types/recipe';
import { generateId } from '../../../utils/id';

export type Difficulty = 'easy' | 'medium' | 'hard';

export function emptyIngredient(): Ingredient {
  return { id: generateId(), name: '', quantity: 1, unit: '' };
}

export interface RecipeFormState {
  title: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  steps: string[];
  imageUri?: string;
  duration?: number;
  preparationTime?: number;
  cookingTime?: number;
  servings?: number;
  difficulty?: Difficulty;
  allergens: string[];
}

export function useRecipeForm(initial?: Partial<RecipeFormState>) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<RecipeCategory>(initial?.category ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients?.length ? initial.ingredients : [emptyIngredient()],
  );
  const [steps, setSteps] = useState<string[]>(
    initial?.steps?.length ? initial.steps : [''],
  );
  const [imageUri, setImageUri] = useState<string | undefined>(initial?.imageUri);
  const [duration, setDuration] = useState<number | undefined>(initial?.duration);
  const [preparationTime, setPreparationTime] = useState<number | undefined>(
    initial?.preparationTime,
  );
  const [cookingTime, setCookingTime] = useState<number | undefined>(initial?.cookingTime);
  const [servings, setServings] = useState<number | undefined>(initial?.servings);
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(initial?.difficulty);
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);

  const updateIngredient = (index: number, updated: Ingredient) =>
    setIngredients((prev) => prev.map((ing, i) => (i === index ? updated : ing)));

  const removeIngredient = (index: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== index));

  const addIngredient = () =>
    setIngredients((prev) => [...prev, emptyIngredient()]);

  const updateStep = (index: number, text: string) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? text : s)));

  const removeStep = (index: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== index));

  const addStep = () => setSteps((prev) => [...prev, '']);

  const toggleAllergen = (allergen: string) =>
    setAllergens((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen],
    );

  const reset = (values: Partial<RecipeFormState>) => {
    setTitle(values.title ?? '');
    setCategory(values.category ?? '');
    setIngredients(
      values.ingredients && values.ingredients.length > 0
        ? values.ingredients
        : [emptyIngredient()],
    );
    setSteps(values.steps && values.steps.length > 0 ? values.steps : ['']);
    setImageUri(values.imageUri);
    setDuration(values.duration);
    setPreparationTime(values.preparationTime);
    setCookingTime(values.cookingTime);
    setServings(values.servings);
    setDifficulty(values.difficulty);
    setAllergens(values.allergens ?? []);
  };

  const validIngredients = ingredients.filter((i) => i.name.trim());
  const validSteps = steps.filter((s) => s.trim());

  // Total duration is the sum of prep + cook when either is provided; falls back
  // to the manual `duration` field to preserve recipes that only set one value.
  const totalDuration =
    preparationTime != null || cookingTime != null
      ? (preparationTime ?? 0) + (cookingTime ?? 0)
      : duration;

  return {
    title, setTitle,
    category, setCategory,
    ingredients, steps,
    imageUri, setImageUri,
    duration, setDuration,
    preparationTime, setPreparationTime,
    cookingTime, setCookingTime,
    servings, setServings,
    difficulty, setDifficulty,
    allergens, setAllergens, toggleAllergen,
    updateIngredient, removeIngredient, addIngredient,
    updateStep, removeStep, addStep,
    reset,
    validIngredients,
    validSteps,
    totalDuration,
  };
}
