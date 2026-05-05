import { generateId } from './id';

// expo-file-system is a native module unavailable in environments like Expo Snack.
// We load it dynamically so the rest of the app still boots when it's absent.
let FS: typeof import('expo-file-system') | null = null;
try {
  FS = require('expo-file-system');
} catch {
  // Native module not available (e.g. Expo Snack) — image features disabled.
}

const RECIPES_IMAGE_DIR: string = FS?.documentDirectory
  ? `${FS.documentDirectory}recipes_images/`
  : '';

export async function initImageDirectory(): Promise<void> {
  if (!FS || !RECIPES_IMAGE_DIR) return;
  const dirInfo = await FS.getInfoAsync(RECIPES_IMAGE_DIR);
  if (!dirInfo.exists) {
    await FS.makeDirectoryAsync(RECIPES_IMAGE_DIR, { intermediates: true });
  }
}

export async function saveRecipeImage(imageUri: string): Promise<string> {
  if (!FS || !RECIPES_IMAGE_DIR) return imageUri;
  try {
    await initImageDirectory();
    const filename = `${generateId()}.jpg`;
    const targetPath = RECIPES_IMAGE_DIR + filename;
    await FS.copyAsync({ from: imageUri, to: targetPath });
    return targetPath;
  } catch (err) {
    console.error('[saveRecipeImage]', err);
    throw err;
  }
}

export async function deleteRecipeImage(imageUri: string): Promise<void> {
  if (!FS || !RECIPES_IMAGE_DIR) return;
  try {
    if (imageUri && imageUri.startsWith(RECIPES_IMAGE_DIR)) {
      await FS.deleteAsync(imageUri);
    }
  } catch (err) {
    console.error('[deleteRecipeImage]', err);
  }
}

export async function recipeImageExists(imageUri: string): Promise<boolean> {
  if (!FS) return false;
  try {
    if (!imageUri) return false;
    const info = await FS.getInfoAsync(imageUri);
    return info.exists;
  } catch {
    return false;
  }
}
