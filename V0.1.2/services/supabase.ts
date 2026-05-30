import { warn } from '../utils/logger';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseSecureStorage } from './secureStorage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function createSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      warn(
        '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ontbreken — ' +
          'cloud-sync en family-flows zijn uitgeschakeld. Zie V0.1.2/.env.example.',
      );
    }
    return null;
  }
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: supabaseSecureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}

export const supabase = createSupabaseClient();

export const isSupabaseConfigured = (): boolean => supabase !== null;
