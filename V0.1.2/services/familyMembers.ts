import { type SQLiteDatabase } from 'expo-sqlite';
import { warn } from '../utils/logger';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { FAMILY_COLORS, type CloudFamilyMember, type LegacyFamilyMember } from '../types/family';

export type { CloudFamilyMember } from '../types/family';

const PREF_PENDING_PROFILE = 'pending_profile';
const PREF_MIGRATION_DONE = 'family_migration_v1_done';
const PREF_LEGACY_MEMBERS = 'family_members';

export interface ProfileUpdate {
  displayName?: string;
  color?: string;
  allergies?: string[];
  active?: boolean;
}

/** Mapt een rauwe Supabase-rij naar een CloudFamilyMember met veilige defaults. */
export function rowToCloudMember(row: Record<string, unknown>): CloudFamilyMember {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    displayName: typeof row.display_name === 'string' ? row.display_name : '',
    color: typeof row.color === 'string' && row.color ? row.color : FAMILY_COLORS[0],
    allergies: Array.isArray(row.allergies) ? (row.allergies as string[]) : [],
    active: row.active !== false,
    role: row.role === 'owner' ? 'owner' : 'member',
  };
}

export async function listFamilyMembers(): Promise<CloudFamilyMember[]> {
  if (!supabase) return [];
  const familyId = useAuthStore.getState().familyId;
  if (!familyId) return [];

  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_id', familyId)
    .order('joined_at', { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToCloudMember);
}

/** Werkt het profiel van de huidige user bij (RLS: enkel de eigen rij). */
export async function updateMyProfile(updates: ProfileUpdate): Promise<void> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd.');
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('Niet ingelogd.');

  const patch: Record<string, unknown> = {};
  if (updates.displayName !== undefined) patch.display_name = updates.displayName;
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.allergies !== undefined) patch.allergies = updates.allergies;
  if (updates.active !== undefined) patch.active = updates.active;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('family_members').update(patch).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Realtime channel: bij elke wijziging op family_members van dit gezin halen
 * we de volledige ledenlijst opnieuw op en geven die door aan de callback.
 */
export function subscribeToFamilyMembers(
  familyId: string,
  onUpdate: (members: CloudFamilyMember[]) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`family_members:${familyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` },
      () => {
        listFamilyMembers().then(onUpdate).catch((err) =>
          warn('[family] realtime refresh failed:', err),
        );
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// ─── Pending profile (onboarding vóór family-setup) ──────────────────────────

/**
 * Bewaart het in onboarding opgegeven profiel zolang de user nog geen familyId
 * heeft. Wordt na family-setup toegepast via applyPendingProfile().
 */
export async function savePendingProfile(db: SQLiteDatabase, profile: ProfileUpdate): Promise<void> {
  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [PREF_PENDING_PROFILE, JSON.stringify(profile)],
  );
}

/**
 * Past een eerder bewaard profiel toe op de zojuist aangemaakte family_members
 * rij en ruimt de pending-blob op. No-op als er niets in de wacht staat.
 */
export async function applyPendingProfile(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_prefs WHERE key = ?',
    [PREF_PENDING_PROFILE],
  );
  if (!row?.value) return;
  try {
    const profile = JSON.parse(row.value) as ProfileUpdate;
    await updateMyProfile(profile);
  } catch (err) {
    warn('[family] applyPendingProfile failed:', err);
    return;
  }
  await db.runAsync('DELETE FROM app_prefs WHERE key = ?', [PREF_PENDING_PROFILE]);
}

// ─── Eenmalige migratie van lokale family naar cloud ─────────────────────────

/**
 * Zoekt in de lokale legacy-blob de rij die het best bij de huidige user past
 * (naam-substring tegen het e-mail local-part, anders eerste actieve, anders de
 * eerste) en uploadt die als profiel. Markeert daarna de migratie als gedaan en
 * verwijdert de lokale blob. Niet-ingelogde leden worden bewust niet gemigreerd.
 */
export async function migrateLocalFamilyToCloud(
  db: SQLiteDatabase,
  legacyMembers: LegacyFamilyMember[],
): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (userId && legacyMembers.length > 0) {
    const emailLocal = (useAuthStore.getState().user?.email ?? '').split('@')[0].toLowerCase();
    const match =
      legacyMembers.find(
        (m) => m.name.trim().length > 0 && emailLocal.includes(m.name.trim().toLowerCase()),
      ) ??
      legacyMembers.find((m) => m.active) ??
      legacyMembers[0];

    if (match) {
      await updateMyProfile({
        displayName: match.name?.trim() ?? '',
        color: match.color,
        allergies: match.allergies ?? [],
        active: match.active ?? true,
      });
    }
  }

  await db.runAsync(
    'INSERT INTO app_prefs (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [PREF_MIGRATION_DONE, '1'],
  );
  await db.runAsync('DELETE FROM app_prefs WHERE key = ?', [PREF_LEGACY_MEMBERS]);
}
