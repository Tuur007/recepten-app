-- "public read with token" met USING (true) staat elke geauthenticeerde
-- client toe ALLE gedeelde recepten te lezen, ongeacht token-kennis.
--
-- Fix: verwijder de open policy en lees voortaan via een SECURITY DEFINER
-- functie die uitsluitend de rij teruggeeft die bij het meegestuurde token
-- hoort. De tabel zelf is dan niet meer rechtstreeks leesbaar.

DROP POLICY IF EXISTS "public read with token" ON shared_recipes;

CREATE OR REPLACE FUNCTION public.get_shared_recipe(token TEXT)
RETURNS SETOF shared_recipes AS $$
  SELECT * FROM public.shared_recipes
  WHERE share_token = token
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_shared_recipe(TEXT) TO anon, authenticated;
