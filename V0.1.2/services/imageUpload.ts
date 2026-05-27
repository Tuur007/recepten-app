import * as ImageManipulator from 'expo-image-manipulator';
import type { SupabaseClient } from '@supabase/supabase-js';
import { warn } from '../utils/logger';
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

/** Pad-conventie in de Storage-bucket: {family_id}/{recipe_id}.jpg */
export function recipeImagePath(familyId: string, recipeId: string): string {
  return `${familyId}/${recipeId}.jpg`;
}

export type PrepareJpeg = (localUri: string) => Promise<ArrayBuffer>;

// Resize → JPEG → ArrayBuffer. Geïsoleerd zodat tests de native bits (manipulator
// + fetch) kunnen injecteren.
async function defaultPrepareJpeg(localUri: string): Promise<ArrayBuffer> {
  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  const response = await fetch(resized.uri);
  return response.arrayBuffer();
}

/**
 * Resize → JPEG → upload naar Supabase Storage onder {familyId}/{recipeId}.jpg.
 * Returnt de publieke URL bij succes, of null bij elke fout (de caller behoudt
 * dan het lokale pad en probeert later opnieuw).
 */
export async function uploadRecipeImage(
  localUri: string,
  recipeId: string,
  client: SupabaseClient | null = supabase,
  prepareJpeg: PrepareJpeg = defaultPrepareJpeg,
): Promise<string | null> {
  if (!client) return null;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return null;

  try {
    const buffer = await prepareJpeg(localUri);
    const path = recipeImagePath(familyId, recipeId);
    const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) {
      console.error('[imageUpload] upload failed:', error.message);
      return null;
    }
    return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error('[imageUpload] error:', err);
    return null;
  }
}

/**
 * Verwijdert de cloud-kopie van een recept. Faalt stil — bij het verwijderen
 * van een recept mag een mislukte storage-delete de flow niet blokkeren.
 */
export async function deleteRecipeImage(
  recipeId: string,
  client: SupabaseClient | null = supabase,
): Promise<void> {
  if (!client) return;
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return;
  try {
    await client.storage.from(BUCKET).remove([recipeImagePath(familyId, recipeId)]);
  } catch (err) {
    warn('[imageUpload] delete failed:', err);
  }
}
