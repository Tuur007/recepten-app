import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/**
 * Toegangscode om de app te ontgrendelen. Stel deze in via de env-variabele
 * EXPO_PUBLIC_ACCESS_CODE (zie .env.example). Is hij leeg, dan staat het slot
 * uit en gedraagt de app zich zoals voorheen — handig in dev.
 *
 * Het slot wordt per toestel maar één keer gevraagd: na een juiste code
 * onthouden we de ontgrendeling in app_prefs.
 */
export const ACCESS_CODE = (process.env.EXPO_PUBLIC_ACCESS_CODE ?? '').trim();
export const LOCK_ENABLED = ACCESS_CODE.length > 0;

const PREF_UNLOCKED = 'access_unlocked';

interface LockState {
  unlocked: boolean;
  hydrated: boolean;
  setUnlocked: (unlocked: boolean) => void;
  setHydrated: () => void;
}

export const useLockStore = create<LockState>()(
  immer((set) => ({
    unlocked: false,
    hydrated: false,
    setUnlocked: (unlocked) => set({ unlocked }),
    setHydrated: () => set({ hydrated: true }),
  })),
);

export function useHydrateLock(): void {
  const db = useSQLiteContext();
  const hydrated = useLockStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) return;
    // Geen code geconfigureerd → meteen ontgrendeld.
    if (!LOCK_ENABLED) {
      useLockStore.getState().setUnlocked(true);
      useLockStore.getState().setHydrated();
      return;
    }
    db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_prefs WHERE key = ?',
      [PREF_UNLOCKED],
    )
      .then((rows) => {
        if (rows.length > 0 && rows[0].value === 'true') {
          useLockStore.getState().setUnlocked(true);
        }
      })
      .catch(() => {})
      .finally(() => useLockStore.getState().setHydrated());
  }, [db, hydrated]);
}

export function useLockActions() {
  const db = useSQLiteContext();

  const unlock = (): void => {
    useLockStore.getState().setUnlocked(true);
    db.runAsync(
      'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [PREF_UNLOCKED, 'true'],
    ).catch(console.error);
  };

  return { unlock };
}
