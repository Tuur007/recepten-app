-- Release hardening (sprint-37).
-- Dicht twee RLS-gaten vóór TestFlight/Play:
--   1. invite_codes SELECT-leak: elke ingelogde user kon alle actieve codes +
--      family_id lezen. Verzilveren gaat al via de redeem_invite_code RPC
--      (SECURITY DEFINER, omzeilt RLS), dus de SELECT-policy mag weg.
--   2. owner kon door elk lid gekickt worden.
-- Idempotent: DROP IF EXISTS / CREATE.

-- ── 1. invite_codes SELECT-leak sluiten ──────────────────────────────────────
DROP POLICY IF EXISTS "redeem invite codes" ON invite_codes;

-- redeem_invite_code is al SECURITY DEFINER + GRANT EXECUTE TO authenticated
-- (zie redeem_invite_atomic.sql). We her-asserteren het hier zodat deze
-- migratie ook op een ouder project zonder die definer-flag veilig is.
ALTER FUNCTION public.redeem_invite_code(TEXT) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.redeem_invite_code(TEXT) TO authenticated;

-- ── 2. owner beschermen tegen kicken ─────────────────────────────────────────
DROP POLICY IF EXISTS "remove family members" ON family_members;
CREATE POLICY "remove family members" ON family_members
  FOR DELETE USING (
    family_id = public.my_family_id()
    AND (
      -- jezelf eruit halen mag altijd (ook als owner)
      user_id = auth.uid()
      -- of: enkel een owner mag andere leden verwijderen, nooit een owner
      OR (
        role <> 'owner'
        AND EXISTS (
          SELECT 1 FROM family_members fm
          WHERE fm.family_id = family_members.family_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'owner'
        )
      )
    )
  );
