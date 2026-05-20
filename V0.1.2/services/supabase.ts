import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://lvxvmubvvlujjmhdqzrk.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eHZtdWJ2dmx1amptaGRxenJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDg3MDAsImV4cCI6MjA5Mjk4NDcwMH0.-vm6TdTidNo5irAQyDxR41btMjQv3Nqdh7H46d631zI';

function createSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
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
