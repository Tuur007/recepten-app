// Family member profielen. Bron van waarheid is de Supabase `family_members`
// tabel (zie services/familyMembers.ts). De lokale store is enkel nog een
// in-memory spiegel + offline cache.

export const FAMILY_COLORS = [
  '#C2492A', // terracotta
  '#5A6B3A', // olive
  '#3A5A6B', // blue
  '#D49A3A', // saffron
  '#B56B3F', // warm brown
  '#7C3F8A', // plum
];

export interface CloudFamilyMember {
  id: string;
  userId: string;
  displayName: string;
  color: string;
  allergies: string[];
  active: boolean;
  role: 'owner' | 'member';
}

/**
 * Vorm van het oude lokale familyStore-blob (app_prefs key 'family_members').
 * Alleen nog gebruikt voor de eenmalige migratie naar de cloud en als shape
 * van de family-sectie in een back-up export.
 */
export interface LegacyFamilyMember {
  id: string;
  name: string;
  color: string;
  active: boolean;
  allergies?: string[];
}
