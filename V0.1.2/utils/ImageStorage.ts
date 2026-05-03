import * as FileSystem from 'expo-file-system';
import { generateId } from './id';

const RECIPES_IMAGE_DIR = `${FileSystem.documentDirectory}recipes_images/`;

export async function initImageDirectory(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(RECIPES_IMAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECIPES_IMAGE_DIR, { intermediates: true });
  }
}

export async function saveRecipeImage(imageUri: string): Promise<string> {
  try {
    await initImageDirectory();
    const filename = `${generateId()}.jpg`;
    const targetPath = RECIPES_IMAGE_DIR + filename;
    await FileSystem.copyAsync({ from: imageUri, to: targetPath });
    return targetPath;
  } catch (err) {
    console.error('[saveRecipeImage]', err);
    throw err;
  }
}

export async function deleteRecipeImage(imageUri: string): Promise<void> {
  try {
    if (imageUri && imageUri.startsWith(RECIPES_IMAGE_DIR)) {
      await FileSystem.deleteAsync(imageUri);
    }
  } catch (err) {
    console.error('[deleteRecipeImage]', err);
  }
}

export async function recipeImageExists(imageUri: string): Promise<boolean> {
  try {
    if (!imageUri) return false;
    const info = await FileSystem.getInfoAsync(imageUri);
    return info.exists;
  } catch {
    return false;
  }
}
