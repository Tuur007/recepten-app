import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { randomToken } from '../utils/id';

function generateCode(): string {
  return [randomToken(4), randomToken(4), randomToken(4)].join('-');
}

export async function createInviteCode(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd.');
  const { familyId, user } = useAuthStore.getState();
  if (!familyId || !user) throw new Error('Niet ingelogd');

  const code = generateCode();
  const { error } = await supabase.from('invite_codes').insert({
    code,
    family_id: familyId,
    created_by: user.id,
  });

  if (error) throw error;
  return code;
}

export async function redeemInviteCode(code: string): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd.');

  // Server-side atomic claim (zie supabase/migrations/redeem_invite_atomic.sql):
  // SELECT + INSERT + UPDATE in één transactie voorkomt dat twee toestellen
  // dezelfde code tegelijk inwisselen.
  const { data, error } = await supabase.rpc('redeem_invite_code', {
    p_code: code.toUpperCase().trim(),
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('not authenticated')) {
      throw new Error('Je bent niet ingelogd. Log opnieuw in en probeer het nogmaals.');
    }
    if (msg.includes('invalid or already used')) {
      throw new Error('Ongeldige of verlopen uitnodigingscode.');
    }
    throw new Error('Kon de uitnodigingscode niet inwisselen. Probeer het later opnieuw.');
  }

  if (!data) throw new Error('Ongeldige of verlopen uitnodigingscode.');

  return data as string;
}

export async function listInviteCodes() {
  if (!supabase) return [];
  const { familyId } = useAuthStore.getState();
  if (!familyId) return [];

  const { data } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  return data ?? [];
}
