import { useEffect } from 'react';
import { AppState } from 'react-native';
import { warn } from '../../utils/logger';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../../store/authStore';
import { useRecipeStore } from '../../store/recipeStore';
import { useGroceryStore } from '../../store/groceryStore';
import { applyRemoteWeeks } from '../../store/weekPlannerStore';
import { pullAll, subscribeToFamily } from './supabaseSync';
import { flushQueue } from './queue';
import { runBackfill } from './imageBackfill';
import { runInitialBackfill } from './initialBackfill';
import { supabase } from '../supabase';

// Laatst gekoppelde gezin op dit toestel. Wisselt het (ander account op
// hetzelfde toestel), dan wordt de lokale synced data gewist — anders ziet
// gezin B de data van gezin A, en duwt elke edit die data B's cloud in.
const PREF_LAST_FAMILY = 'last_family_id';

async function readPref(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_prefs WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

async function writePref(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

/**
 * Wist alle gezins-gebonden lokale data (SQLite + in-memory stores) bij een
 * wissel naar een ander gezin. collection_recipes ruimt zichzelf op via de
 * FK-cascade op recipes.
 */
export async function resetLocalDataForFamilySwitch(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    DELETE FROM recipes;
    DELETE FROM grocery_items;
    DELETE FROM sync_queue;
  `);
  await db.runAsync(
    'DELETE FROM app_prefs WHERE key IN (?, ?, ?)',
    ['week_plan_v2', 'week_plan', 'family_members_cache'],
  );
  useRecipeStore.getState().setRecipes([]);
  useGroceryStore.getState().setItems([]);
  applyRemoteWeeks({});
}

/**
 * Roept éénmalig `useAuthStore.initialize()` aan zodra de SQLite-db klaar is.
 * Daarna draait de auth state-changed listener in authStore en vult familyId.
 */
export function useAuthBootstrap(): void {
  useEffect(() => {
    if (!supabase) return;
    const { isInitialized, initialize } = useAuthStore.getState();
    if (!isInitialized) initialize();
  }, []);
}

/**
 * Doet één `pullAll` zodra `familyId` bekend is en mountet `subscribeToFamily`
 * voor realtime updates. Detecteert een gezinswissel op dit toestel en wist
 * dan eerst de lokale data van het vorige gezin.
 */
export function useFamilySync(): void {
  const db = useSQLiteContext();
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    if (!supabase || !familyId) return;

    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      const last = await readPref(db, PREF_LAST_FAMILY);
      if (last && last !== familyId) {
        await resetLocalDataForFamilySwitch(db);
      }
      await writePref(db, PREF_LAST_FAMILY, familyId);
      if (cancelled) return;

      await pullAll(db).catch((err) => {
        if (!cancelled) warn('[sync] pullAll failed:', err);
      });
      // One-shot per gezin: push bestaande lokale data omhoog bij de eerste
      // koppeling. Leest uit SQLite, dus onafhankelijk van pullAll-volgorde.
      runInitialBackfill(db).catch((err) => warn('[sync] initial backfill failed:', err));
      if (cancelled) return;
      unsubscribe = subscribeToFamily(familyId, db);
    })().catch((err) => warn('[sync] family sync setup failed:', err));

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, familyId]);
}

/**
 * Drains de outbox: één keer bij mount én elke keer als NetInfo "online"
 * meldt. Bij reconnect doen we ook een pull — realtime-events die tijdens de
 * offline-periode gemist zijn komen anders nooit meer binnen.
 */
export function useSyncQueueProcessor(): void {
  const db = useSQLiteContext();
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    if (!supabase || !familyId) return;

    // Initial drain — picks up writes that werden gequeued voor de laatste
    // app-restart of voor de family koppeling.
    flushQueue(db).catch((err) => warn('[sync] initial flush failed:', err));

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushQueue(db).catch((err) =>
          warn('[sync] flush on reconnect failed:', err),
        );
        pullAll(db).catch((err) => warn('[sync] pull on reconnect failed:', err));
      }
    });

    return unsubscribe;
  }, [db, familyId]);
}

/**
 * Foreground-sync: bij terugkeer naar de voorgrond flushen + pullen we (de
 * realtime-verbinding kan in de achtergrond gemist hebben) en herstarten we
 * de auth-token-refresh zoals supabase-js voor React Native aanraadt.
 */
export function useForegroundSync(): void {
  const db = useSQLiteContext();
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    if (!supabase) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase?.auth.startAutoRefresh();
        if (familyId) {
          flushQueue(db).catch((err) => warn('[sync] foreground flush failed:', err));
          pullAll(db).catch((err) => warn('[sync] foreground pull failed:', err));
        }
      } else {
        supabase?.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, [db, familyId]);
}

/**
 * Eenmalige backfill van bestaande lokale file:// foto's naar Supabase Storage,
 * zodra supabase + familyId klaar zijn. Achtergrondtaak, geen UI-feedback.
 */
export function useImageBackfill(): void {
  const db = useSQLiteContext();
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    if (!supabase || !familyId) return;
    runBackfill(db).catch((err) => warn('[sync] image backfill failed:', err));
  }, [db, familyId]);
}

/** Convenience hook: mount alle sync-lifecycle in één call. */
export function useSupabaseSync(): void {
  useAuthBootstrap();
  useFamilySync();
  useSyncQueueProcessor();
  useForegroundSync();
  useImageBackfill();
}

/** Test-helper: trigger één flush nu, los van NetInfo. */
export function flushNow(db: SQLiteDatabase): Promise<unknown> {
  return flushQueue(db);
}
