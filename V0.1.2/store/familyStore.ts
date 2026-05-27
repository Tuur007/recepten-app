import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { warn } from '../utils/logger';
import { useEffect } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { supabase } from '../services/supabase';
import { useAuthStore } from './authStore';
import {
  listFamilyMembers,
  subscribeToFamilyMembers,
  migrateLocalFamilyToCloud,
  updateMyProfile as cloudUpdateMyProfile,
  type ProfileUpdate,
} from '../services/familyMembers';
import type { CloudFamilyMember, LegacyFamilyMember } from '../types/family';

export { FAMILY_COLORS } from '../types/family';
export type { CloudFamilyMember } from '../types/family';

const PREF_MEMBERS_CACHE = 'family_members_cache';
const PREF_LEGACY_MEMBERS = 'family_members';
const PREF_NAME = 'family_name';
const PREF_ONBOARDING = 'onboarding_complete';
const PREF_MIGRATION_DONE = 'family_migration_v1_done';

interface FamilyState {
  // Bron van waarheid is Supabase; dit is een in-memory spiegel + offline cache.
  members: CloudFamilyMember[];
  familyName: string;
  // Lokale flags (geen cloud-resource).
  onboardingComplete: boolean;
  hydrated: boolean;

  setMembersInternal: (members: CloudFamilyMember[]) => void;
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

async function readPref(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_prefs WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

/**
 * Eenmalige lokale hydratatie: onboarding-flag, gecachte familienaam en de
 * read-only members-cache (offline fallback — er wordt nooit user-data lokaal
 * geschreven als bron van waarheid).
 */
async function hydrateLocal(db: SQLiteDatabase): Promise<void> {
  try {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_prefs WHERE key IN (?, ?, ?)',
      [PREF_NAME, PREF_ONBOARDING, PREF_MEMBERS_CACHE],
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const cache = map.get(PREF_MEMBERS_CACHE);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed)) {
          useFamilyStore.getState().setMembersInternal(parsed as CloudFamilyMember[]);
        }
      } catch {
        /* corrupted cache — keep empty default */
      }
    }

    const name = map.get(PREF_NAME);
    if (typeof name === 'string') useFamilyStore.getState().setFamilyNameInternal(name);

    if (map.get(PREF_ONBOARDING) === '1') {
      useFamilyStore.getState().setOnboardingCompleteInternal(true);
    }
  } catch (err) {
    warn('[family] hydrateLocal skipped:', err);
  } finally {
    useFamilyStore.getState().setHydrated();
  }
}

async function cacheMembers(db: SQLiteDatabase, members: CloudFamilyMember[]): Promise<void> {
  try {
    await writePref(db, PREF_MEMBERS_CACHE, JSON.stringify(members));
  } catch (err) {
    console.error('[family] cacheMembers failed:', err);
  }
}

async function fetchFamilyName(familyId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('families').select('name').eq('id', familyId).single();
  const name = (data as { name?: string } | null)?.name;
  return typeof name === 'string' ? name : null;
}

async function runMigrationIfNeeded(db: SQLiteDatabase): Promise<void> {
  try {
    if ((await readPref(db, PREF_MIGRATION_DONE)) === '1') return;
    const raw = await readPref(db, PREF_LEGACY_MEMBERS);
    let legacy: LegacyFamilyMember[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) legacy = parsed as LegacyFamilyMember[];
      } catch {
        /* corrupted legacy blob — migrate as empty (still marks done + cleans up) */
      }
    }
    await migrateLocalFamilyToCloud(db, legacy);
  } catch (err) {
    warn('[family] migration skipped:', err);
  }
}

function withoutUndefined(updates: ProfileUpdate): Partial<CloudFamilyMember> {
  const out: Partial<CloudFamilyMember> = {};
  if (updates.displayName !== undefined) out.displayName = updates.displayName;
  if (updates.color !== undefined) out.color = updates.color;
  if (updates.allergies !== undefined) out.allergies = updates.allergies;
  if (updates.active !== undefined) out.active = updates.active;
  return out;
}

export function useHydrateFamily(): void {
  const db = useSQLiteContext();
  const hydrated = useFamilyStore((s) => s.hydrated);
  const familyId = useAuthStore((s) => s.familyId);

  // Lokale flags + offline cache, eenmalig.
  useEffect(() => {
    if (hydrated) return;
    hydrateLocal(db);
  }, [db, hydrated]);

  // Cloud-sync zodra familyId bekend is.
  useEffect(() => {
    if (!supabase || !familyId) return;

    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      await runMigrationIfNeeded(db);

      const members = await listFamilyMembers();
      if (cancelled) return;
      useFamilyStore.getState().setMembersInternal(members);
      cacheMembers(db, members);

      const name = await fetchFamilyName(familyId);
      if (!cancelled && name != null) {
        useFamilyStore.getState().setFamilyNameInternal(name);
        writePref(db, PREF_NAME, name).catch(() => {});
      }

      if (cancelled) return;
      unsubscribe = subscribeToFamilyMembers(familyId, (next) => {
        useFamilyStore.getState().setMembersInternal(next);
        cacheMembers(db, next);
      });
    })().catch((err) => warn('[family] cloud hydrate failed:', err));

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, familyId]);
}

/**
 * Mutaties. Profielwijzigingen gaan via updateMyProfile naar de cloud — alleen
 * de eigen rij is bewerkbaar. familyName en onboarding zijn lokale flags.
 */
export function useFamilyActions() {
  const db = useSQLiteContext();

  const updateMyProfile = async (updates: ProfileUpdate): Promise<void> => {
    // Optimistisch: eigen rij in de store bijwerken voor directe UI-feedback.
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      const patch = withoutUndefined(updates);
      const next = useFamilyStore
        .getState()
        .members.map((m) => (m.userId === userId ? { ...m, ...patch } : m));
      useFamilyStore.getState().setMembersInternal(next);
      cacheMembers(db, next);
    }
    await cloudUpdateMyProfile(updates);
  };

  const setActive = (active: boolean): Promise<void> => updateMyProfile({ active });

  const setFamilyName = (name: string): void => {
    useFamilyStore.getState().setFamilyNameInternal(name);
    writePref(db, PREF_NAME, name).catch((err) =>
      console.error('[family] persistFamilyName failed:', err),
    );
  };

  const completeOnboarding = (): void => {
    useFamilyStore.getState().setOnboardingCompleteInternal(true);
    writePref(db, PREF_ONBOARDING, '1').catch((err) =>
      console.error('[family] persistOnboarding failed:', err),
    );
  };

  return { updateMyProfile, setActive, setFamilyName, completeOnboarding };
}
