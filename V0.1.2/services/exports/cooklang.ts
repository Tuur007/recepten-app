// services/exports/cooklang.ts
//
// Schrijft een Cooklang-document naar een tijdelijk bestand en opent de OS-
// share sheet, zodat de gebruiker het kan opslaan in Files, e-mailen, of in
// een Cooklang-app importeren.

import type { Recipe } from '../../types/recipe';
import { recipeToCooklang, recipeToCooklangFilename } from '../../utils/cooklang';

type FileSystemModule = typeof import('expo-file-system/legacy');
type SharingModule = typeof import('expo-sharing');

function getFs(): FileSystemModule | null {
  try {
    return require('expo-file-system/legacy');
  } catch {
    try {
      return require('expo-file-system');
    } catch {
      return null;
    }
  }
}

function getSharing(): SharingModule | null {
  try {
    return require('expo-sharing');
  } catch {
    return null;
  }
}

export async function exportRecipeAsCooklang(recipe: Recipe): Promise<void> {
  const fs = getFs();
  const sharing = getSharing();
  if (!fs || !sharing) {
    throw new Error('Bestandshulpmiddelen niet beschikbaar.');
  }

  const filename = recipeToCooklangFilename(recipe);
  const content = recipeToCooklang(recipe);
  const cacheDir = fs.cacheDirectory ?? fs.documentDirectory;
  if (!cacheDir) {
    throw new Error('Kon geen tijdelijke map vinden voor de export.');
  }
  const fileUri = `${cacheDir}${filename}`;
  await fs.writeAsStringAsync(fileUri, content, { encoding: fs.EncodingType.UTF8 });

  const available = await sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Delen wordt niet ondersteund op dit toestel.');
  }
  await sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle: filename,
    UTI: 'public.plain-text',
  });
}
