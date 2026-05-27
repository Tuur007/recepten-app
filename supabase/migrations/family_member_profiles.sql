-- Family member profielen als cloud-resource.
-- family_members wordt de bron van waarheid voor naam, kleur, allergieën en
-- of een lid actief is. De lokale familyStore-blob wordt hierna uitgefaseerd.
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS allergies JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Realtime nodig zodat profielwijzigingen tussen toestellen live doorkomen.
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;

-- Bestaande "family members only" policies (via my_family_id()) dekken al
-- SELECT/UPDATE op de hele rij. Een lid mag enkel zijn eigen rij wijzigen:
CREATE POLICY "update own profile" ON family_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
