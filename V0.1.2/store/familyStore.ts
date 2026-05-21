import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateId } from '../utils/id';

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
  active: boolean;
  allergies?: string[];
}

export const FAMILY_COLORS = [
  '#C2492A', // terracotta
  '#5A6B3A', // olive
  '#3A5A6B', // blue
  '#D49A3A', // saffron
  '#B56B3F', // warm brown
  '#7C3F8A', // plum
];

const PREF_MEMBERS = 'family_members';
const PREF_NAME = 'family_name';
const PREF_ONBOARDING = 'onboarding_complete';

interface FamilyState {
  members: FamilyMember[];
  familyName: string;
  onboardingComplete: boolean;
  hydrated: boolean;

  setMembersInternal: (members: FamilyMember[]) => void;
  setFamilyNameInternal: (name: string) => void;
  setOnboardingCompleteInternal: (v: boolean) => void;
  setHydrated: () => void;
}

export const useFamilyStore = create<FamilyState>()(
  immer((set) => ({
    members: [],
    familyName: '',
    onboardingComplete: false,
    hydrated: false,

    setMembersInternal: (members) => set({ members }),
    setFamilyNameInternal: (familyName) => set({ familyName }),
    setOnboardingCompleteInternal: (onboardingComplete) => set({ onboardingComplete }),
    setHydrated: () => set({ hydrated: true }),
  })),
);

async function writePref(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function loadFamilyPrefs(db: SQLiteDatabase): Promise<void> {
  try {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_prefs WHERE key IN (?, ?, ?)',
      [PREF_MEMBERS, PREF_NAME, PREF_ONBOARDING],
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const membersRaw = map.get(PREF_MEMBERS);
    if (membersRaw) {
      try {
        const parsed = JSON.parse(membersRaw);
        if (Array.isArray(parsed)) {
          useFamilyStore.getState().setMembersInternal(parsed as FamilyMember[]);
        }
      } catch {
        /* corrupted JSON — keep empty default */
      }
    }

    const name = map.get(PREF_NAME);
    if (typeof name === 'string') {
      useFamilyStore.getState().setFamilyNameInternal(name);
    }

    if (map.get(PREF_ONBOARDING) === '1') {
      useFamilyStore.getState().setOnboardingCompleteInternal(true);
    }
  } catch (err) {
    console.warn('[family] loadFamilyPrefs skipped:', err);
  } finally {
    useFamilyStore.getState().setHydrated();
  }
}

export function useHydrateFamily(): void {
  const db = useSQLiteContext();
  const hydrated = useFamilyStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) return;
    loadFamilyPrefs(db);
  }, [db, hydrated]);
}

/**
 * Replace the persisted members blob with the current store state.
 * Errors are logged but never thrown — UI feedback is the caller's job.
 */
async function persistMembers(db: SQLiteDatabase): Promise<void> {
  const members = useFamilyStore.getState().members;
  try {
    await writePref(db, PREF_MEMBERS, JSON.stringify(members));
  } catch (err) {
    console.error('[family] persistMembers failed:', err);
  }
}

/**
 * Hook exposing all mutating actions. Components in the rendered tree have
 * access to a SQLite context so this can always reach the database.
 */
export function useFamilyActions() {
  const db = useSQLiteContext();
  const store = useFamilyStore;

  const addMember = (name = '', color?: string): FamilyMember => {
    const existing = store.getState().members;
    const used = new Set(existing.map((m) => m.color));
    const nextColor = color ?? FAMILY_COLORS.find((c) => !used.has(c)) ?? FAMILY_COLORS[0];
    const member: FamilyMember = {
      id: generateId(),
      name,
      color: nextColor,
      active: true,
    };
    store.getState().setMembersInternal([...existing, member]);
    persistMembers(db);
    return member;
  };

  const removeMember = (id: string): void => {
    store.getState().setMembersInternal(store.getState().members.filter((m) => m.id !== id));
    persistMembers(db);
  };

  const toggleActive = (id: string): void => {
    store.getState().setMembersInternal(
      store.getState().members.map((m) => (m.id === id ? { ...m, active: !m.active } : m)),
    );
    persistMembers(db);
  };

  const updateName = (id: string, name: string): void => {
    store.getState().setMembersInternal(
      store.getState().members.map((m) => (m.id === id ? { ...m, name } : m)),
    );
    persistMembers(db);
  };

  const updateColor = (id: string, color: string): void => {
    store.getState().setMembersInternal(
      store.getState().members.map((m) => (m.id === id ? { ...m, color } : m)),
    );
    persistMembers(db);
  };

  const updateAllergies = (id: string, allergies: string[]): void => {
    store.getState().setMembersInternal(
      store.getState().members.map((m) => (m.id === id ? { ...m, allergies } : m)),
    );
    persistMembers(db);
  };

  const setFamilyName = (name: string): void => {
    store.getState().setFamilyNameInternal(name);
    writePref(db, PREF_NAME, name).catch((err) =>
      console.error('[family] persistFamilyName failed:', err),
    );
  };

  const completeOnboarding = (): void => {
    store.getState().setOnboardingCompleteInternal(true);
    writePref(db, PREF_ONBOARDING, '1').catch((err) =>
      console.error('[family] persistOnboarding failed:', err),
    );
  };

  /** Overwrite the entire members list (used by import). */
  const replaceMembers = (members: FamilyMember[]): void => {
    store.getState().setMembersInternal(members);
    persistMembers(db);
  };

  return {
    addMember,
    removeMember,
    toggleActive,
    updateName,
    updateColor,
    updateAllergies,
    setFamilyName,
    completeOnboarding,
    replaceMembers,
  };
}
