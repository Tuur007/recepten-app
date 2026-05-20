-- Fix RLS policies: FOR ALL USING (...) blokkeert ook INSERT voor nieuwe users
-- Reden: bij INSERT wordt USING gebruikt als WITH CHECK, en my_family_id()
-- geeft NULL terug voor gebruikers die nog geen gezinslid zijn.

-- families: verwijder oude policy, voeg aparte INSERT policy toe
DROP POLICY IF EXISTS "own family" ON families;
CREATE POLICY "view own family" ON families
  FOR SELECT USING (id = public.my_family_id());
CREATE POLICY "create family" ON families
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own family" ON families
  FOR UPDATE USING (id = public.my_family_id());
CREATE POLICY "delete own family" ON families
  FOR DELETE USING (id = public.my_family_id());

-- family_members: verwijder oude policy, voeg aparte INSERT policy toe
DROP POLICY IF EXISTS "own family members" ON family_members;
CREATE POLICY "view family members" ON family_members
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "join family" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "update family members" ON family_members
  FOR UPDATE USING (family_id = public.my_family_id());
CREATE POLICY "remove family members" ON family_members
  FOR DELETE USING (family_id = public.my_family_id());

-- invite_codes: voeg SELECT policy toe voor verzilveren door niet-leden
-- (de code zelf is geheim genoeg: 32^12 combinaties)
CREATE POLICY "redeem invite codes" ON invite_codes
  FOR SELECT USING (used_by IS NULL AND expires_at > now());
