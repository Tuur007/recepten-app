export interface ParsedIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface ParsedRecipe {
  title: string;
  ingredients: ParsedIngredient[];
  steps: string[];
  sourceUrl: string;
  duration?: number;
  /** Raw remote image URL extracted from the page (og:image etc.) */
  imageUrl?: string;
}
