/**
 * Recipe Sharing Service
 * Enables sharing recipes via the native Share API (React Native built-in).
 * Geen extra packages nodig — werkt op iOS en Android out of the box.
 */

import { Share } from 'react-native';
import { Recipe } from '../../types/recipe';

export interface ShareResult {
  success: boolean;
  cancelled: boolean;
}

export class RecipeSharingService {
  private static instance: RecipeSharingService;

  private constructor() {}

  static getInstance(): RecipeSharingService {
    if (!RecipeSharingService.instance) {
      RecipeSharingService.instance = new RecipeSharingService();
    }
    return RecipeSharingService.instance;
  }

  /**
   * Generate a formatted recipe text for sharing
   */
  generateRecipeText(recipe: Recipe): string {
    const lines: string[] = [];

    lines.push(`👨‍🍳 ${recipe.title}`);

    if (recipe.category) {
      lines.push(`Categorie: ${recipe.category}`);
    }

    if (recipe.ingredients.length > 0) {
      lines.push('');
      lines.push('📝 Ingrediënten:');
      for (const ing of recipe.ingredients) {
        const qty = ing.quantity > 0 && ing.quantity !== 1 ? `${ing.quantity} ` : '';
        const unit = ing.unit ? `${ing.unit} ` : '';
        lines.push(`• ${qty}${unit}${ing.name}`);
      }
    }

    if (recipe.steps.length > 0) {
      lines.push('');
      lines.push('👇 Bereidingswijze:');
      recipe.steps.forEach((step, i) => {
        lines.push(`${i + 1}. ${step}`);
      });
    }

    lines.push('');
    lines.push('Gedeeld via Recepten App 📱');

    return lines.join('\n');
  }

  /**
   * Share recipe via the native React Native Share sheet.
   * No extra packages needed — works on iOS and Android.
   */
  async shareRecipe(recipe: Recipe): Promise<ShareResult> {
    try {
      const message = this.generateRecipeText(recipe);

      const result = await Share.share(
        {
          title: recipe.title,
          message,
        },
        {
          dialogTitle: `Recept delen: ${recipe.title}`,
        },
      );

      if (result.action === Share.sharedAction) {
        return { success: true, cancelled: false };
      } else if (result.action === Share.dismissedAction) {
        return { success: false, cancelled: true };
      }

      return { success: false, cancelled: false };
    } catch (error) {
      console.error('[RecipeSharingService] Share failed:', error);
      throw new Error('Kon recept niet delen. Probeer opnieuw.');
    }
  }

  /**
   * Get a readable summary of the recipe stats
   */
  getRecipeSummary(recipe: Recipe): string {
    const parts: string[] = [];

    if (recipe.category) parts.push(recipe.category);
    parts.push(`${recipe.ingredients.length} ingrediënten`);
    parts.push(`${recipe.steps.length} stappen`);

    return parts.join(' · ');
  }
}

export const recipeShareService = RecipeSharingService.getInstance();
