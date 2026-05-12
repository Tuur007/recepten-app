import { generateId } from './id';

// v19 moved documentDirectory / EncodingType / writeAsStringAsync etc.
// under the legacy subpath; import that to keep types & runtime aligned.
let FS: typeof import('expo-file-system/legacy') | null = null;
try {
  FS = require('expo-file-system/legacy');
} catch {
  try {
    FS = require('expo-file-system');
  } catch {
    // expo-file-system unavailable (e.g. Expo Snack) — image features disabled
  }
}

const RECIPES_IMAGE_DIR: string = FS?.documentDirectory
  ? `${FS.documentDirectory}recipes_images`
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
  if (imageUri.startsWith(RECIPES_IMAGE_DIR)) return imageUri;
  try {
    await initImageDirectory();
    const ext = imageUri.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i)?.[1]?.toLowerCase() ?? 'jpg';
    const filename = `${generateId()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const targetPath = `${RECIPES_IMAGE_DIR}/${filename}`;
    await FS.copyAsync({ from: imageUri, to: targetPath });
    return targetPath;
  } catch (err) {
    console.error('[saveRecipeImage]', err);
    throw err;
  }
}

export async function deleteRecipeImage(imageUri: string): Promise<void> {
  if (!FS || !RECIPES_IMAGE_DIR || !imageUri) return;
  try {
    if (imageUri.startsWith(RECIPES_IMAGE_DIR)) {
      await FS.deleteAsync(imageUri, { idempotent: true });
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

// ─── Blob → local file ────────────────────────────────────────────────────────
// Converts a Blob to base64 and writes it to documentDirectory/recipes_images/.
// Returns the local file:// path, or null on failure.

export async function saveImageLocally(blob: Blob): Promise<string | null> {
  if (!FS || !RECIPES_IMAGE_DIR) return null;
  try {
    const filename = `recipe-${generateId()}.jpg`;
    await initImageDirectory();
    const base64 = await blobToBase64(blob);
    const filePath = `${RECIPES_IMAGE_DIR}/${filename}`;
    await FS.writeAsStringAsync(filePath, base64, { encoding: FS.EncodingType.Base64 });
    const info = await FS.getInfoAsync(filePath);
    const size = (info as { size?: number }).size ?? 0;
    if (!info.exists || size === 0) {
      console.warn('[saveImageLocally] file missing or empty after write');
      return null;
    }
    console.log(`[saveImageLocally] ✅ Saved: ${filePath} (${size} bytes)`);
    return filePath;
  } catch (e) {
    console.error('[saveImageLocally] ❌ Failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Checks that a path points to an existing non-empty file.
export async function validateImageUri(path: string): Promise<boolean> {
  if (!path || !FS) return false;
  try {
    // Strip file:// prefix for getInfoAsync if needed on some platforms
    const cleanPath = path.startsWith('file://') ? path : path;
    const info = await FS.getInfoAsync(cleanPath);
    return info.exists && ((info as { size?: number }).size ?? 0) > 0;
  } catch {
    return false;
  }
}
