import { useState } from 'react';
import { Ingredient, RecipeCategory } from '../../../types/recipe';
import { generateId } from '../../../utils/id';

export function emptyIngredient(): Ingredient {
  return { id: generateId(), name: '', quantity: 1, unit: '' };
}

export interface RecipeFormState {
  title: string;
  category: RecipeCategory;
  ingredients: Ingredient[];
  steps: string[];
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

  const reset = (values: RecipeFormState) => {
    setTitle(values.title);
    setCategory(values.category);
    setIngredients(values.ingredients.length > 0 ? values.ingredients : [emptyIngredient()]);
    setSteps(values.steps.length > 0 ? values.steps : ['']);
  };

  const validIngredients = ingredients.filter((i) => i.name.trim());
  const validSteps = steps.filter((s) => s.trim());

  return {
    title, setTitle,
    category, setCategory,
    ingredients, steps,
    updateIngredient, removeIngredient, addIngredient,
    updateStep, removeStep, addStep,
    reset,
    validIngredients,
    validSteps,
  };
}
