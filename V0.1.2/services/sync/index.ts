// services/sync/index.ts
//
// Export/import fundament voor de recepten-app. Geen cloud-sync — alleen een
// volledige snapshot van de lokale staat, te delen via iCloud Drive / Google
// Drive / e-mail. De import-strategie is "nieuwste wint op updatedAt": een
// receptenrij wordt alleen vervangen als de import-versie strict nieuwer is.

import { type SQLiteDatabase } from 'expo-sqlite';
import { RecipeRepository } from '../../features/recipes/repository';
import { GroceryRepository } from '../../features/grocery/repository';
import {
  useWeekPlannerStore,
  getISOWeek,
  type MealPlan,
  type WeeksMap,
} from '../../store/weekPlannerStore';
import { useFamilyStore, type FamilyMember } from '../../store/familyStore';
import { cancelAllNotifications } from '../notifications';
import type { Recipe } from '../../types/recipe';
import type { GroceryItem } from '../../types/grocery';
import { generateId } from '../../utils/id';

export const APP_EXPORT_VERSION = 2;
const PREF_LAST_EXPORT = 'last_export_at';
const PREF_WEEK_PLAN = 'week_plan_v2';

export interface AppExport {
  version: number;
  exportedAt: string;
  familyName: string;
  familyMembers: FamilyMember[];
  recipes: Recipe[];
  groceryItems: GroceryItem[];
  /** Multi-week vanaf v2; in v1 was dit een enkele week (Record<DayKey, DayPlan>). */
  weekPlan: WeeksMap | MealPlan;
}

export interface ImportResult {
  recipesAdded: number;
  recipesUpdated: number;
  conflictsSkipped: number;
  errors: string[];
}

export interface ImportPreview {
  recipesIncoming: number;
  recipesExisting: number;
  exportedAt: string | null;
  familyName: string;
}

// ─── file-system bindings ───────────────────────────────────────────────────
// Match the approach used in utils/imageStorage.ts: SDK 54 split the legacy
// API into expo-file-system/legacy; fall back when running on environments
// that only expose the modern surface.
type FsModule = typeof import('expo-file-system/legacy');
let FS: FsModule | null = null;
try {
  FS = require('expo-file-system/legacy');
} catch {
  try {
    FS = require('expo-file-system');
  } catch {
    FS = null;
  }
}

// expo-sharing / expo-document-picker are loaded lazily so the codebase keeps
// type-checking on environments that don't yet have them installed.
type SharingModule = typeof import('expo-sharing');
type DocumentPickerModule = typeof import('expo-document-picker');

function loadSharing(): SharingModule | null {
  try {
    return require('expo-sharing');
  } catch {
    return null;
  }
}

function loadDocumentPicker(): DocumentPickerModule | null {
  try {
    return require('expo-document-picker');
  } catch {
    return null;
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────
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

function isNewer(incoming: string | undefined, existing: string | undefined): boolean {
  if (!incoming) return false;
  if (!existing) return true;
  return new Date(incoming).getTime() > new Date(existing).getTime();
}

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── export ─────────────────────────────────────────────────────────────────
export async function exportAppData(db: SQLiteDatabase): Promise<AppExport> {
  const [recipes, groceryItems] = await Promise.all([
    RecipeRepository.getAll(db),
    GroceryRepository.getAll(db),
  ]);
  const family = useFamilyStore.getState();
  const weekPlan = useWeekPlannerStore.getState().weeks;
  return {
    version: APP_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    familyName: family.familyName,
    familyMembers: family.members,
    recipes,
    groceryItems,
    weekPlan,
  };
}

/**
 * Writes the export to a temp file and opens the OS share sheet so the user
 * can park it in iCloud Drive / Google Drive / mail / etc.
 */
export async function shareExport(db: SQLiteDatabase, data: AppExport): Promise<void> {
  if (!FS || !FS.documentDirectory) {
    throw new Error('Bestandsopslag is niet beschikbaar in deze omgeving.');
  }
  const sharing = loadSharing();
  if (!sharing) {
    throw new Error('Deelfunctie ontbreekt — installeer expo-sharing.');
  }

  const filename = `recepten-backup-${todayStamp()}.json`;
  const fileUri = `${FS.cacheDirectory ?? FS.documentDirectory}${filename}`;
  await FS.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));

  const available = await sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Delen wordt niet ondersteund op dit toestel.');
  }
  await sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Bewaar je recepten-back-up',
    UTI: 'public.json',
  });
  await writePref(db, PREF_LAST_EXPORT, data.exportedAt);
}

export async function loadLastExportAt(db: SQLiteDatabase): Promise<string | null> {
  return readPref(db, PREF_LAST_EXPORT);
}

// ─── import ─────────────────────────────────────────────────────────────────
function validateExport(raw: unknown): asserts raw is AppExport {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Bestand is leeg of geen geldig JSON object.');
  }
  const obj = raw as Partial<AppExport>;
  if (typeof obj.version !== 'number') {
    throw new Error('Versienummer ontbreekt in de back-up.');
  }
  if (obj.version > APP_EXPORT_VERSION) {
    throw new Error(
      `Back-up is versie ${obj.version}, deze app ondersteunt versie ${APP_EXPORT_VERSION}.`,
    );
  }
  if (!Array.isArray(obj.recipes)) {
    throw new Error('Receptenlijst ontbreekt of is ongeldig.');
  }
}

export async function previewImport(
  db: SQLiteDatabase,
  data: AppExport,
): Promise<ImportPreview> {
  const existing = await RecipeRepository.getAll(db);
  const existingIds = new Set(existing.map((r) => r.id));
  const recipesExisting = data.recipes.filter((r) => existingIds.has(r.id)).length;
  return {
    recipesIncoming: data.recipes.length,
    recipesExisting,
    exportedAt: data.exportedAt ?? null,
    familyName: data.familyName ?? '',
  };
}

/**
 * Imports an export blob. Merge strategy:
 *  • recipes: insert if id is new, replace if incoming.updatedAt > existing.updatedAt,
 *    otherwise count as conflictsSkipped
 *  • grocery items: upsert (delegated to the repo)
 *  • weekPlan: replaces in-memory store + persists to app_prefs for future hydration
 *  • family name: caller decides whether to merge — this function does not touch it
 */
export async function importAppData(
  db: SQLiteDatabase,
  data: AppExport,
): Promise<ImportResult> {
  validateExport(data);

  const result: ImportResult = {
    recipesAdded: 0,
    recipesUpdated: 0,
    conflictsSkipped: 0,
    errors: [],
  };

  const existing = await RecipeRepository.getAll(db);
  const existingMap = new Map(existing.map((r) => [r.id, r]));

  for (const recipe of data.recipes) {
    try {
      const current = existingMap.get(recipe.id);
      if (!current) {
        await upsertRecipe(db, recipe);
        result.recipesAdded++;
      } else if (isNewer(recipe.updatedAt, current.updatedAt)) {
        await upsertRecipe(db, recipe);
        result.recipesUpdated++;
      } else {
        result.conflictsSkipped++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`recept "${recipe.title}": ${msg}`);
    }
  }

  if (Array.isArray(data.groceryItems) && data.groceryItems.length > 0) {
    try {
      await GroceryRepository.upsertMany(db, data.groceryItems);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`boodschappen: ${msg}`);
    }
  }

  if (data.weekPlan && typeof data.weekPlan === 'object') {
    try {
      // Bestaande herinneringen zijn niet meer geldig na het binnenhalen van
      // een andere planner — eerst alles cancellen, weekplanner-events zullen
      // ze opnieuw inplannen waar nodig.
      await cancelAllNotifications();
      const weeks = normalizeWeekPlan(data);
      useWeekPlannerStore.getState().setWeeks(weeks);
      await writePref(db, PREF_WEEK_PLAN, JSON.stringify(weeks));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`weekplanner: ${msg}`);
    }
  }

  return result;
}

function normalizeWeekPlan(data: AppExport): WeeksMap {
  const raw = data.weekPlan as unknown;
  if (!raw || typeof raw !== 'object') return {};
  // v2+ : weekKey → MealPlan
  if (data.version >= 2) return raw as WeeksMap;
  // v1: één MealPlan ({MON: DayPlan, ...}). Plaats hem onder de huidige week.
  const weekKey = getISOWeek(new Date());
  return { [weekKey]: raw as MealPlan };
}

async function upsertRecipe(db: SQLiteDatabase, recipe: Recipe): Promise<void> {
  await db.runAsync(
    `INSERT INTO recipes (
       id, title, ingredients, steps, source_url, duration, category, is_favorite,
       image_uri, allergens, created_at, updated_at, difficulty, preparation_time,
       cooking_time, servings, rating, times_cooked, last_cooked, notes, equipment
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       ingredients = excluded.ingredients,
       steps = excluded.steps,
       source_url = excluded.source_url,
       duration = excluded.duration,
       category = excluded.category,
       is_favorite = excluded.is_favorite,
       image_uri = excluded.image_uri,
       allergens = excluded.allergens,
       updated_at = excluded.updated_at,
       difficulty = excluded.difficulty,
       preparation_time = excluded.preparation_time,
       cooking_time = excluded.cooking_time,
       servings = excluded.servings,
       rating = excluded.rating,
       times_cooked = excluded.times_cooked,
       last_cooked = excluded.last_cooked,
       notes = excluded.notes,
       equipment = excluded.equipment`,
    [
      recipe.id || generateId(),
      recipe.title,
      JSON.stringify(recipe.ingredients ?? []),
      JSON.stringify(recipe.steps ?? []),
      recipe.sourceUrl ?? null,
      recipe.duration ?? null,
      recipe.category ?? '',
      recipe.isFavorite ? 1 : 0,
      recipe.imageUri ?? null,
      JSON.stringify(recipe.allergens ?? []),
      recipe.createdAt ?? new Date().toISOString(),
      recipe.updatedAt ?? new Date().toISOString(),
      recipe.difficulty ?? null,
      recipe.preparationTime ?? null,
      recipe.cookingTime ?? null,
      recipe.servings ?? null,
      recipe.rating ?? null,
      recipe.timesCooked ?? 0,
      recipe.lastCooked ?? null,
      recipe.notes ?? null,
      recipe.equipment ? JSON.stringify(recipe.equipment) : null,
    ],
  );
}

// ─── document picker convenience ────────────────────────────────────────────
/**
 * Opens the OS document picker, reads the chosen JSON file, validates it, and
 * returns the parsed export together with a preview summary. Returns null if
 * the user cancels.
 */
export async function pickAndPreviewImport(
  db: SQLiteDatabase,
): Promise<{ data: AppExport; preview: ImportPreview } | null> {
  if (!FS) {
    throw new Error('Bestandsopslag is niet beschikbaar in deze omgeving.');
  }
  const picker = loadDocumentPicker();
  if (!picker) {
    throw new Error('Bestandskiezer ontbreekt — installeer expo-document-picker.');
  }

  const res = await picker.getDocumentAsync({
    type: ['application/json', 'public.json'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  // expo-document-picker has two result shapes across versions; handle both.
  if ((res as { canceled?: boolean }).canceled) return null;
  if ((res as { type?: string }).type === 'cancel') return null;

  const assets = (res as { assets?: Array<{ uri: string }> }).assets;
  const fileUri =
    (Array.isArray(assets) && assets[0]?.uri) ||
    (res as { uri?: string }).uri ||
    null;
  if (!fileUri) {
    throw new Error('Geen bestand gekozen.');
  }

  const contents = await FS.readAsStringAsync(fileUri);
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('Bestand is geen geldige JSON.');
  }
  validateExport(parsed);
  const preview = await previewImport(db, parsed as AppExport);
  return { data: parsed as AppExport, preview };
}
