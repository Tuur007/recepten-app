-- my_family_id() gebruikte LIMIT 1 zonder ORDER BY → non-deterministisch
-- bij meerdere lidmaatschappen. Het oudste lidmaatschap (= primaire gezin)
-- moet altijd winnen.

CREATE OR REPLACE FUNCTION public.my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM public.family_members
  WHERE user_id = auth.uid()
  ORDER BY joined_at ASC
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;
