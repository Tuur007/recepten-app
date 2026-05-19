// utils/shareRecipe.ts
//
// Capture-en-deel pipeline voor de RecipeShareCard. Houdt de plumbing op één
// plek zodat zowel het detailscherm als de RecipeCard hetzelfde gedrag tonen.

import { captureRef } from 'react-native-view-shot';

type SharingModule = typeof import('expo-sharing');
let cachedSharing: SharingModule | null = null;
let cacheChecked = false;
function getSharing(): SharingModule | null {
  if (cacheChecked) return cachedSharing;
  cacheChecked = true;
  try {
    cachedSharing = require('expo-sharing');
  } catch {
    cachedSharing = null;
  }
  return cachedSharing;
}

/**
 * Captures the View referenced by `ref` as a PNG and opens the OS share
 * sheet. Throws on capture failure or when sharing is unavailable; callers
 * should surface a toast.
 */
export async function shareRecipeCard(
  ref: React.RefObject<unknown>,
  filename: string,
): Promise<void> {
  const sharing = getSharing();
  if (!sharing) {
    throw new Error('Delen is niet beschikbaar — installeer expo-sharing.');
  }
  const available = await sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Delen wordt niet ondersteund op dit toestel.');
  }
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    fileName: filename,
  });
  await sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Deel dit recept',
    UTI: 'public.png',
  });
}
