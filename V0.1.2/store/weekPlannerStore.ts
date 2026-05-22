import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useEffect } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { enqueue, flushQueue } from '../services/sync/queue';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface DayPlan {
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
}

export type MealPlan = Record<string, DayPlan>;
export type WeeksMap = Record<string, MealPlan>;

const PREF_KEY = 'week_plan_v2';
const LEGACY_PREF_KEY = 'week_plan';

function emptyDay(): DayPlan {
  return { breakfast: null, lunch: null, dinner: null };
}

function emptyWeek(): MealPlan {
  return {
    MON: emptyDay(),
    TUE: emptyDay(),
    WED: emptyDay(),
    THU: emptyDay(),
    FRI: emptyDay(),
    SAT: emptyDay(),
    SUN: emptyDay(),
  };
}

const EMPTY_WEEK_FROZEN: MealPlan = Object.freeze(emptyWeek()) as MealPlan;

/**
 * ISO-week key in het formaat YYYY-Www (week 1 = de week met 4 januari).
 * Eén bron van waarheid voor alle store-keys.
 */
export function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

interface WeekPlannerState {
  weeks: WeeksMap;
  hydrated: boolean;

  getMealPlan: (weekKey: string) => MealPlan;
  setMeal: (weekKey: string, day: string, mealType: MealType, recipeId: string) => void;
  removeMeal: (weekKey: string, day: string, mealType: MealType) => void;
  clearWeek: (weekKey: string) => void;
  clearAll: () => void;

  setWeeks: (weeks: WeeksMap) => void;
  setHydrated: () => void;
}

export const useWeekPlannerStore = create<WeekPlannerState>()(
  immer((set, get) => ({
    weeks: {},
    hydrated: false,

    getMealPlan: (weekKey) => get().weeks[weekKey] ?? EMPTY_WEEK_FROZEN,

    setMeal: (weekKey, day, mealType, recipeId) =>
      set((s) => {
        if (!s.weeks[weekKey]) s.weeks[weekKey] = emptyWeek();
        if (!s.weeks[weekKey][day]) s.weeks[weekKey][day] = emptyDay();
        s.weeks[weekKey][day][mealType] = recipeId;
      }),

    removeMeal: (weekKey, day, mealType) =>
      set((s) => {
        if (!s.weeks[weekKey]) s.weeks[weekKey] = emptyWeek();
        if (!s.weeks[weekKey][day]) s.weeks[weekKey][day] = emptyDay();
        s.weeks[weekKey][day][mealType] = null;
      }),

    clearWeek: (weekKey) =>
      set((s) => { s.weeks[weekKey] = emptyWeek(); }),

    clearAll: () => set({ weeks: {} }),

    setWeeks: (weeks) => set({ weeks }),
    setHydrated: () => set({ hydrated: true }),
  })),
);

/** Reactieve hook voor één week — gebruikt door de planner en home. */
export function useMealPlan(weekKey: string): MealPlan {
  return useWeekPlannerStore((s) => s.weeks[weekKey] ?? EMPTY_WEEK_FROZEN);
}

async function readPref(db: SQLiteDatabase, key: string): Promise<string | null> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_prefs WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function writePref(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function loadWeekPlannerPrefs(db: SQLiteDatabase): Promise<void> {
  try {
    const raw = await readPref(db, PREF_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          useWeekPlannerStore.getState().setWeeks(parsed as WeeksMap);
        }
      } catch {
        /* corrupted JSON — keep empty */
      }
    } else {
      // Migreer een oude single-week opslag naar het nieuwe multi-week formaat.
      const legacy = await readPref(db, LEGACY_PREF_KEY);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed && typeof parsed === 'object') {
            const weekKey = getISOWeek(new Date());
            const migrated: WeeksMap = { [weekKey]: parsed as MealPlan };
            useWeekPlannerStore.getState().setWeeks(migrated);
            await writePref(db, PREF_KEY, JSON.stringify(migrated));
          }
        } catch {
          /* leave empty */
        }
      }
    }
  } catch (err) {
    console.warn('[weekplanner] load skipped:', err);
  } finally {
    useWeekPlannerStore.getState().setHydrated();
  }
}

/**
 * Hook die de planner-staat één keer per app-start uit SQLite leest. Daarna
 * subscriben we op store-changes en schrijven het JSON-blob terug naar de
 * `app_prefs` tabel — vergelijkbaar met de theme-store.
 */
export function useHydrateWeekPlanner(): void {
  const db = useSQLiteContext();
  const hydrated = useWeekPlannerStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) return;
    loadWeekPlannerPrefs(db);
  }, [db, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const unsub = useWeekPlannerStore.subscribe((state, prev) => {
      if (state.weeks === prev.weeks) return;
      writePref(db, PREF_KEY, JSON.stringify(state.weeks)).catch((err) =>
        console.warn('[weekplanner] persist failed:', err),
      );
      // Queue per gewijzigde week — pullAll fan-out (setWeeks) is bulk, dus
      // diff per key i.p.v. één grote payload.
      const changed = changedWeekKeys(prev.weeks, state.weeks);
      for (const key of changed) {
        const plan = state.weeks[key];
        if (!plan) continue;
        enqueue(db, 'upsert', 'weekplan', key, { weekKey: key, plan }).catch((err) =>
          console.warn('[weekplanner] enqueue failed:', err),
        );
      }
      if (changed.length > 0) void flushQueue(db);
    });
    return unsub;
  }, [db, hydrated]);
}

function changedWeekKeys(prev: WeeksMap, next: WeeksMap): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const out: string[] = [];
  for (const k of keys) {
    if (prev[k] !== next[k]) out.push(k);
  }
  return out;
}
