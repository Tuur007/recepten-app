import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  familyId: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setFamilyId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  familyId: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null });

      if (session?.user) {
        try {
          const { data } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', session.user.id)
            .single();
          set({ familyId: data?.family_id ?? null });
        } catch (err) {
          console.warn('Failed to load family_id:', err);
        }
      }

      set({ isInitialized: true });

      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ session, user: session?.user ?? null });
        if (!session?.user) {
          set({ familyId: null });
          return;
        }
        try {
          const { data } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('user_id', session.user.id)
            .single();
          set({ familyId: data?.family_id ?? null });
        } catch (err) {
          console.warn('Failed to load family_id on auth change:', err);
        }
      });
    } catch (err) {
      console.warn('Auth initialize failed:', err);
      set({ isInitialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, familyId: null });
  },

  setFamilyId: (familyId) => set({ familyId }),
}));
