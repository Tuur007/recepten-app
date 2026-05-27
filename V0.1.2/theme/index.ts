import { useColorScheme } from 'react-native';
import { warn } from '../utils/logger';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { create } from 'zustand';
import {
  DARK_PALETTE,
  LIGHT_PALETTE,
  type Palette,
} from '../constants/Designsystem';

export type ThemeMode = 'system' | 'light' | 'dark';

const PREF_KEY = 'theme_mode';

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  setHydrated: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  hydrated: false,
  setMode: (mode) => set({ mode }),
  setHydrated: () => set({ hydrated: true }),
}));

export async function loadThemePref(db: SQLiteDatabase): Promise<void> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_prefs WHERE key = ?',
      [PREF_KEY],
    );
    const value = row?.value as ThemeMode | undefined;
    if (value === 'light' || value === 'dark' || value === 'system') {
      useThemeStore.getState().setMode(value);
    }
  } catch (err) {
    // Table may not exist yet on first run; harmless — fall through to system default.
    warn('[theme] loadThemePref skipped:', err);
  } finally {
    useThemeStore.getState().setHydrated();
  }
}

export async function persistThemePref(db: SQLiteDatabase, mode: ThemeMode): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [PREF_KEY, mode],
  );
}

/** Resolves the active scheme by combining the user pref with the OS scheme. */
export function useResolvedScheme(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}

/** Returns the active palette. Re-renders the caller when mode or OS scheme changes. */
export function useThemeColors(): Palette {
  return useResolvedScheme() === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

/**
 * Hook for screens/components that want the user to be able to flip the
 * theme. Returns the current mode + a setter that also persists to SQLite.
 */
export function useThemeMode() {
  const db = useSQLiteContext();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const setAndPersist = (next: ThemeMode) => {
    setMode(next);
    persistThemePref(db, next).catch((err) => {
      console.error('[theme] persistThemePref failed:', err);
    });
  };

  return { mode, setMode: setAndPersist };
}

/**
 * One-shot hydration hook for the root layout. Loads the persisted theme mode
 * from SQLite the first time it mounts (after the database is ready).
 */
export function useHydrateTheme() {
  const db = useSQLiteContext();
  const hydrated = useThemeStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) return;
    loadThemePref(db);
  }, [db, hydrated]);
}
