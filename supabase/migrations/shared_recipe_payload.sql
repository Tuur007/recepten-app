-- fetchSharedRecipe() las shared_recipes rechtstreeks (geen SELECT-policy →
-- altijd 0 rijen) en daarna recipes van een ÁNDER gezin (RLS blokkeert dat per
-- definitie). De share-feature kon dus nooit werken. Fix: één SECURITY DEFINER
-- functie die token → recept server-side joint, met expiry-check.

CREATE OR REPLACE FUNCTION public.get_shared_recipe_payload(token TEXT)
RETURNS SETOF recipes AS $$
  SELECT r.*
  FROM public.recipes r
  JOIN public.shared_recipes s ON s.recipe_id = r.id
  WHERE s.share_token = token
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND r.deleted_at IS NULL
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_shared_recipe_payload(TEXT) TO anon, authenticated;
