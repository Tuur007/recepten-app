-- Atomic invite-code redemption.
-- Vervangt de SELECT → INSERT → UPDATE race in services/inviteService.ts:
-- de UPDATE ... WHERE used_by IS NULL claimt de code in één statement, zodat
-- twee toestellen niet tegelijk dezelfde code kunnen inwisselen.
CREATE OR REPLACE FUNCTION public.redeem_invite_code(p_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_family_id UUID;
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE invite_codes
  SET used_by = v_user, used_at = now()
  WHERE code = p_code AND used_by IS NULL AND expires_at > now()
  RETURNING family_id INTO v_family_id;

  IF v_family_id IS NULL THEN
    RAISE EXCEPTION 'invite code invalid or already used';
  END IF;

  INSERT INTO family_members (family_id, user_id, role)
  VALUES (v_family_id, v_user, 'member')
  ON CONFLICT (family_id, user_id) DO NOTHING;

  RETURN v_family_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT) TO authenticated;
