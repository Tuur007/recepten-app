/**
 * Vercel Serverless Function
 * 
 * Deploy to Vercel (gratis):
 * 1. git push naar GitHub
 * 2. Connect repo op vercel.com
 * 3. Deploy automatisch
 * 
 * Locatie: api/parseRecipe.ts
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body as { url?: string };

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  if (!url.includes('marleyspoon')) {
    return res.status(400).json({ error: 'Only Marley Spoon URLs supported' });
  }

  try {
    const recipe = await parseMarleySpoon(url);
    return res.status(200).json(recipe);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parse failed';
    return res.status(400).json({ error: message });
  }
}

async function parseMarleySpoon(url: string): Promise<{
  title: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  steps: string[];
}> {
  // Extract recipe slug
  const slugMatch = url.match(/\/menu\/\d+-(.+?)(?:\?|$)/);
  if (!slugMatch) {
    throw new Error('Invalid Marley Spoon URL');
  }

  const recipeSlug = slugMatch[1];

  const query = `
    query MenuItemBySlug($slug: String!) {
      menuItem(slug: $slug) {
        name
        servings
        prepTime
        cookTime
        ingredients {
          name
          amount
          unit
        }
        instructions {
          text
        }
      }
    }
  `;

  const response = await fetch('https://api.marleyspoon.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({
      operationName: 'MenuItemBySlug',
      query,
      variables: { slug: recipeSlug },
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json() as {
    data?: { menuItem?: Record<string, unknown> };
    errors?: Array<{ message: string }>;
  };

  if (data.errors?.length) {
    throw new Error(`GraphQL error: ${data.errors[0].message}`);
  }

  if (!data.data?.menuItem) {
    throw new Error('Recipe not found');
  }

  const menuItem = data.data.menuItem as Record<string, unknown>;

  const title = String(menuItem.name || 'Recept');

  const ingredients = Array.isArray(menuItem.ingredients)
    ? (menuItem.ingredients as unknown[]).map((ing: unknown) => {
        if (!ing || typeof ing !== 'object') return null;
        const o = ing as Record<string, unknown>;
        return {
          name: String(o.name || ''),
          quantity: typeof o.amount === 'number' ? o.amount : 1,
          unit: String(o.unit || ''),
        };
      }).filter((ing): ing is { name: string; quantity: number; unit: string } => {
        return ing !== null && ing.name.length > 0;
      })
    : [];

  const steps = Array.isArray(menuItem.instructions)
    ? (menuItem.instructions as unknown[])
      .map((instr: unknown) => {
        if (!instr || typeof instr !== 'object') return '';
        const o = instr as Record<string, unknown>;
        return String(o.text || '');
      })
      .filter((s) => s.length > 5)
    : [];

  return { title, ingredients, steps };
}
