# Supabase — multi-device sync

De app gebruikt Supabase voor:
- auth (e-mail + wachtwoord)
- gedeelde `family` data (recepten, grocery items, weekplans)
- realtime updates tussen toestellen van dezelfde gezinsleden

Lokaal blijft SQLite de source-of-truth. Supabase is een **outbox-mirror**:
elke schrijfactie gaat door de queue in `services/sync/queue.ts` zodat
offline mutaties bewaard blijven en automatisch uploaden zodra het toestel
weer online is (`NetInfo` listener in `services/sync/lifecycle.ts`).

## Eenmalige setup

1. **Env vars zetten** in `V0.1.2/.env` (zie `.env.example`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project_ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
   Voor EAS builds: `eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value ...`
   (idem voor de anon key).

2. **Schema + RLS migrations toepassen** op het Supabase project.
   In het Supabase dashboard → SQL Editor — voer de bestanden in deze
   volgorde uit als je het project nog niet hebt:

   - `supabase/schema.sql` (basis)
   - `supabase/migrations/add_nutrition_and_collections.sql`
   - `supabase/migrations/fix_my_family_id.sql`
   - `supabase/migrations/fix_rls_policies.sql`
   - `supabase/migrations/fix_shared_recipes_rls.sql`

   Voor een bestaand project: alleen de `fix_*` migrations als die nog niet
   draaiden. Ze zijn idempotent (DROP IF EXISTS / CREATE OR REPLACE).

3. **`deleted_at` kolommen.** De queue stuurt soft-deletes als
   `UPDATE … SET deleted_at = …`. Zorg dat de Supabase tabellen `recipes`
   en `grocery_items` een nullable `deleted_at TIMESTAMPTZ` kolom hebben.
   De pull-side filtert daar al op (`.is('deleted_at', null)`).

4. **Anon key roteren.** De vorige key stond in commit-historie en is publiek
   bekend. Roteer via Supabase dashboard → Project Settings → API → Reset
   anon key. Vervang daarna de waarde in `.env` en EAS env vars. Alle
   actieve sessies worden ongeldig — gebruikers loggen opnieuw in.

## Wat draait waar in de code

| Onderdeel | Bestand |
|---|---|
| Client-factory (zonder secrets fallback) | `services/supabase.ts` |
| `pullAll`, `subscribeToFamily` (incoming) | `services/sync/supabaseSync.ts` |
| Outbox queue + flush (outgoing) | `services/sync/queue.ts` |
| Lifecycle hooks (mount in `_layout`) | `services/sync/lifecycle.ts` |
| Auth state | `store/authStore.ts` |
| Family koppeling + invite codes | `services/inviteService.ts`, `app/auth/family-setup.tsx` |

`useSupabaseSync()` mountet alles in één keer vanuit `app/_layout.tsx`:
- `useAuthBootstrap` — `useAuthStore.initialize()` één keer
- `useFamilySync` — `pullAll(db)` + `subscribeToFamily` bij `familyId` change
- `useSyncQueueProcessor` — flush bij mount + bij elke `NetInfo` reconnect

## Multi-device test-scenario

Twee toestellen met dezelfde Supabase-account, beide met `family_id` gevuld:

1. Toestel A: maak nieuw recept. Verwacht: rij in `recipes` op Supabase + queue leeg op A.
2. Toestel B (online, app open): recept verschijnt binnen ~1s via realtime.
3. Toestel B: bewerk titel. Verwacht: update zichtbaar op A.
4. Toestel A: zet vliegtuigmodus aan. Bewerk recept opnieuw.
5. Toestel A: zet vliegtuigmodus uit. Verwacht: queue flushed, B krijgt update.
6. Toestel A: verwijder recept terwijl B offline is. Toestel B online → krijgt delete.

In de app debug overlay (bij `__DEV__`) kun je `getQueueDepth(db)` aanroepen
om te verifiëren dat de queue leeg blijft tussen acties.

## Bekende caveats

- **Geen conflict resolution.** Last-write-wins op `updated_at`. Bij parallelle
  edits op twee offline toestellen wint degene die als laatste flushed.
  Acceptabel voor een familie-app met laag concurrent-write volume.
- **Retry is geen exponential backoff.** De queue retried bij elke nieuwe write
  én bij NetInfo reconnect. `attempts` kolom is informatief (geen cap, geen
  dead-letter). Voldoende voor de typische "WiFi viel even weg" use case.
- **Images zijn lokaal.** `imageUri` is een `file://` pad — Supabase ziet het,
  maar toestel B kan het niet openen. Image-sync via Supabase Storage is een
  aparte sprint.
