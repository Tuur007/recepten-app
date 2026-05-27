import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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
  waitForUser: (timeoutMs?: number) => Promise<User>;
}

export const useAuthStore = create<AuthState>()(
  immer((set, get, store) => ({
    session: null,
    user: null,
    familyId: null,
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
      if (!supabase) {
        set({ isInitialized: true });
        return;
      }
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
          } catch {
            // Network/RLS may block this; safe to continue
          }
        }

        set({ isInitialized: true });

        supabase.auth.onAuthStateChange(async (_event, session) => {
          set({ session, user: session?.user ?? null });
          if (!session?.user || !supabase) {
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
          } catch {
            // ignore
          }
        });
      } catch {
        set({ isInitialized: true });
      }
    },

    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase niet geconfigureerd.');
      set({ isLoading: true });
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    signUp: async (email, password) => {
      if (!supabase) throw new Error('Supabase niet geconfigureerd.');
      set({ isLoading: true });
      try {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    signOut: async () => {
      if (supabase) await supabase.auth.signOut();
      set({ session: null, user: null, familyId: null });
    },

    setFamilyId: (familyId) => set({ familyId }),

    // Resolvet zodra de auth-listener een user heeft gezet, of rejectet na de
    // time-out. Vervangt de broze vaste setTimeout in de registratie-flow.
    waitForUser: (timeoutMs = 5000): Promise<User> => {
      const current = get().user;
      if (current) return Promise.resolve(current);
      return new Promise<User>((resolve, reject) => {
        const timer = setTimeout(() => {
          unsubscribe();
          reject(new Error('Registratie duurde te lang. Probeer opnieuw.'));
        }, timeoutMs);
        const unsubscribe = store.subscribe((state) => {
          if (state.user) {
            clearTimeout(timer);
            unsubscribe();
            resolve(state.user);
          }
        });
      });
    },
  })),
);
