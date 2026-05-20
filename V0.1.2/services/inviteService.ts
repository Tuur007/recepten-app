import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = [4, 4, 4].map(() =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return parts.join('-');
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

export async function redeemInviteCode(code: string, userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd.');
  const { data: invite, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !invite) throw new Error('Ongeldige of verlopen uitnodigingscode.');

  const { error: memberError } = await supabase.from('family_members').insert({
    family_id: invite.family_id,
    user_id: userId,
    role: 'member',
  });

  if (memberError) throw memberError;

  await supabase
    .from('invite_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('id', invite.id);

  return invite.family_id as string;
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
