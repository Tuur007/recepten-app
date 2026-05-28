// services/cookbookScanner.ts
//
// Stuurt een foto van een kookboekpagina naar de `scan-recipe` edge function,
// die Claude Vision gebruikt om titel, ingrediënten en stappen te herkennen.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FS: typeof import('expo-file-system/legacy') = require('expo-file-system/legacy');
import { supabase } from './supabase';
import type { Ingredient } from '../types/recipe';
import { generateId } from '../utils/id';
import { warn } from '../utils/logger';

export type ScannedRecipe = {
  title: string;
  ingredients: Ingredient[];
  steps: string[];
  duration?: number;
  servings?: number;
};

type RawScanned = {
  title?: string;
  ingredients?: { name?: string; quantity?: string | number; unit?: string }[];
  steps?: string[];
  duration?: number;
  servings?: number;
};

export async function scanCookbookPage(imageUri: string): Promise<ScannedRecipe> {
  if (!supabase) {
    throw new Error('Supabase is niet geconfigureerd. Voeg EXPO_PUBLIC_SUPABASE_URL en EXPO_PUBLIC_SUPABASE_ANON_KEY toe aan .env.');
  }

  const base64 = await FS.readAsStringAsync(imageUri, { encoding: 'base64' });

  const { data, error } = await supabase.functions.invoke('scan-recipe', {
    body: { image: base64, mimeType: 'image/jpeg' },
  });

  if (error) {
    warn('[cookbookScanner] edge function fout:', error.message);
    throw new Error('Kon recept niet herkennen. Probeer een duidelijkere foto.');
  }

  return normalise(data as RawScanned);
}

function normalise(raw: RawScanned): ScannedRecipe {
  const ingredients: Ingredient[] = (raw.ingredients ?? [])
    .filter((i) => i.name?.trim())
    .map((i) => ({
      id: generateId(),
      name: i.name!.trim(),
      quantity: typeof i.quantity === 'number' ? i.quantity : parseFloat(String(i.quantity ?? '')) || 1,
      unit: i.unit?.trim() ?? '',
    }));

  const steps = (raw.steps ?? []).map((s) => s.trim()).filter(Boolean);

  return {
    title: (raw.title ?? '').trim() || 'Onbenoemd recept',
    ingredients: ingredients.length > 0 ? ingredients : [],
    steps,
    duration: raw.duration,
    servings: raw.servings,
  };
}
