import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

const BUCKET = 'recipe-images';

/**
 * True voor lokale paden (file://, content://, of absolute fs-paden). Een
 * https-URL is al een cloud-URL en hoeft niet (her)geüpload te worden.
 */
export function isLocalImageUri(uri: string): boolean {
  if (!uri) return false;
  return !/^https?:\/\//i.test(uri);
}

function storagePath(familyId: string, recipeId: string): string {
  return `${familyId}/${recipeId}.jpg`;
}

/**
 * Resize → JPEG → upload naar Supabase Storage onder {familyId}/{recipeId}.jpg.
 * Returnt de publieke URL bij succes, of null bij elke fout (de caller behoudt
 * dan het lokale pad en probeert later opnieuw).
 */
export async function uploadRecipeImage(
  localUri: string,
  recipeId: string,
): Promise<string | null> {
  if (!supabase) return null;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return null;

  try {
    const resized = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );

    const response = await fetch(resized.uri);
    const buffer = await response.arrayBuffer();

    const path = storagePath(familyId, recipeId);
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) {
      console.error('[imageUpload] upload failed:', error.message);
      return null;
    }

    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error('[imageUpload] error:', err);
    return null;
  }
}

/**
 * Verwijdert de cloud-kopie van een recept. Faalt stil — bij het verwijderen
 * van een recept mag een mislukte storage-delete de flow niet blokkeren.
 */
export async function deleteRecipeImage(recipeId: string): Promise<void> {
  if (!supabase) return;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;
  try {
    await supabase.storage.from(BUCKET).remove([storagePath(familyId, recipeId)]);
  } catch (err) {
    console.warn('[imageUpload] delete failed:', err);
  }
}
