-- Families tabel
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Family members (koppelt auth users aan een family)
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id)
);

-- Invite codes (one-time, expire na 7 dagen)
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipes (cloud mirror van lokale SQLite)
CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  source_url TEXT,
  duration INTEGER,
  category TEXT NOT NULL DEFAULT '',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  image_uri TEXT,
  allergens JSONB NOT NULL DEFAULT '[]',
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  preparation_time INTEGER,
  cooking_time INTEGER,
  servings INTEGER,
  rating REAL,
  times_cooked INTEGER NOT NULL DEFAULT 0,
  last_cooked TIMESTAMPTZ,
  notes TEXT,
  equipment JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Grocery items (cloud mirror)
CREATE TABLE grocery_items (
  id TEXT PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  sources JSONB NOT NULL DEFAULT '[]',
  total_quantity REAL NOT NULL DEFAULT 0,
  checked BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT '',
  aisle TEXT,
  price REAL,
  store_id TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

-- Week planner (cloud mirror)
CREATE TABLE week_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, week_key)
);

-- Shared recipes (recepten delen tussen families)
CREATE TABLE shared_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id TEXT NOT NULL,
  from_family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync queue (offline changes die nog gesynchroniseerd moeten worden)
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'delete')),
  table_name TEXT NOT NULL CHECK (table_name IN ('recipes', 'grocery_items', 'week_plans')),
  record_id TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROW LEVEL SECURITY
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_recipes ENABLE ROW LEVEL SECURITY;

-- Helper functie: geeft family_id terug van ingelogde user
CREATE OR REPLACE FUNCTION public.my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM public.family_members
  WHERE user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies: users zien enkel hun eigen family data
CREATE POLICY "family members only" ON recipes
  FOR ALL USING (family_id = public.my_family_id());

CREATE POLICY "family members only" ON grocery_items
  FOR ALL USING (family_id = public.my_family_id());

CREATE POLICY "family members only" ON week_plans
  FOR ALL USING (family_id = public.my_family_id());

-- families: lees/wijzig alleen eigen gezin, maar maak aanmaken mogelijk voor ingelogde users
CREATE POLICY "view own family" ON families
  FOR SELECT USING (id = public.my_family_id());
CREATE POLICY "create family" ON families
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "update own family" ON families
  FOR UPDATE USING (id = public.my_family_id());
CREATE POLICY "delete own family" ON families
  FOR DELETE USING (id = public.my_family_id());

-- family_members: lees gezinsleden van eigen gezin, maar laat ingelogde users zichzelf toevoegen
CREATE POLICY "view family members" ON family_members
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "join family" ON family_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "update family members" ON family_members
  FOR UPDATE USING (family_id = public.my_family_id());
CREATE POLICY "remove family members" ON family_members
  FOR DELETE USING (family_id = public.my_family_id());

-- invite_codes: eigen gezin ziet alle codes; elke ingelogde user kan geldige codes lezen (voor verzilveren)
CREATE POLICY "own invite codes" ON invite_codes
  FOR ALL USING (family_id = public.my_family_id());
CREATE POLICY "redeem invite codes" ON invite_codes
  FOR SELECT USING (used_by IS NULL AND expires_at > now());

-- Shared recipes: iedereen met token kan lezen
CREATE POLICY "public read with token" ON shared_recipes
  FOR SELECT USING (true);
CREATE POLICY "own family shares" ON shared_recipes
  FOR INSERT WITH CHECK (from_family_id = public.my_family_id());

-- Realtime inschakelen
ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_items;
ALTER PUBLICATION supabase_realtime ADD TABLE week_plans;
