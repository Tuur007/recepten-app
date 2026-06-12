-- family-setup deed twee losse inserts (families, dan family_members). Faalde
-- de tweede, dan bestond er een gezin zonder leden en bleef de gebruiker in een
-- half-geconfigureerde staat hangen. Deze RPC doet beide in één transactie.

CREATE OR REPLACE FUNCTION public.create_family_with_owner(family_name TEXT)
RETURNS uuid AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF family_name IS NULL OR length(trim(family_name)) = 0 THEN
    RAISE EXCEPTION 'family name required';
  END IF;
  -- Eén gezin per gebruiker: wie al lid is mag geen tweede gezin aanmaken.
  IF EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'already a family member';
  END IF;

  INSERT INTO public.families (name, owner_id)
  VALUES (trim(family_name), auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_id, auth.uid(), 'owner');

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_family_with_owner(TEXT) TO authenticated;
