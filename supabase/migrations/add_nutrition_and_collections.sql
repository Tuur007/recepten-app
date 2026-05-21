-- Migratie voor bestaande Supabase-deployments na de roadmap-sprint.
-- Voegt:
--   1. `nutrition` JSONB-kolom aan de recipes-tabel (matched de lokale v24)
--   2. `collections` en `collection_recipes` tabellen (lokale v25)
--
-- Idempotent: gebruikt IF NOT EXISTS waar mogelijk. Veilig om meerdere keren
-- te draaien.

-- 1. Nutritie-kolom toevoegen aan recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS nutrition JSONB;

-- 2. Recipe collections
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_recipes (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (collection_id, recipe_id)
);

-- RLS-policies — gezinsleden hebben alleen toegang tot hun eigen collecties.
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family members only" ON collections;
CREATE POLICY "family members only" ON collections
  FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "family members only" ON collection_recipes;
CREATE POLICY "family members only" ON collection_recipes
  FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM collections
      WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
      )
    )
  );
