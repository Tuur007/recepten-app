import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Session, User } from '@supabase/supabase-js';
import { warn } from '../utils/logger';
import { supabase } from '../services/supabase';

/**
 * Haalt het familyId van een user op. Onderscheidt "geen gezin" (null) van
 * "kon het niet bepalen" (undefined, bv. netwerkfout): in dat laatste geval
 * mag de caller het bestaande familyId NIET op null zetten — dat schakelt
 * heel de sync-laag uit terwijl de user gewoon een gezin heeft.
 */
async function resolveFamilyId(userId: string): Promise<string | null | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) {
    warn('[auth] familyId lookup failed:', error.message);
    return undefined;
  }
  return data?.family_id ?? null;
}

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
          const familyId = await resolveFamilyId(session.user.id);
          if (familyId !== undefined) set({ familyId });
        }

        set({ isInitialized: true });

        supabase.auth.onAuthStateChange(async (_event, session) => {
          set({ session, user: session?.user ?? null });
          if (!session?.user) {
            set({ familyId: null });
            return;
          }
          const familyId = await resolveFamilyId(session.user.id);
          // Bij een lookup-fout (undefined) behouden we het bekende familyId —
          // null zetten zou sync + outbox uitschakelen op een netwerkblip.
          if (familyId !== undefined) set({ familyId });
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
