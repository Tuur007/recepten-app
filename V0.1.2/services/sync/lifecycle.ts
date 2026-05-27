import { useEffect } from 'react';
import { warn } from '../../utils/logger';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../../store/authStore';
import { pullAll, subscribeToFamily } from './supabaseSync';
import { flushQueue } from './queue';
import { runBackfill } from './imageBackfill';
import { supabase } from '../supabase';

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
 * voor realtime updates. Werkt bij sign-in én sign-out (cleanup).
 */
export function useFamilySync(): void {
  const db = useSQLiteContext();
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    if (!supabase || !familyId) return;

    let cancelled = false;
    pullAll(db).catch((err) => {
      if (!cancelled) warn('[sync] pullAll failed:', err);
    });
    const unsubscribe = subscribeToFamily(familyId, db);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [db, familyId]);
}

/**
 * Drains de outbox: één keer bij mount én elke keer als NetInfo "online"
 * meldt. De queue is reentrant-safe dus dubbele triggers schaden niet.
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
      }
    });

    return unsubscribe;
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
  useImageBackfill();
}

/** Test-helper: trigger één flush nu, los van NetInfo. */
export function flushNow(db: SQLiteDatabase): Promise<unknown> {
  return flushQueue(db);
}
