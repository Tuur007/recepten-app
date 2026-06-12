# Recepten App — Claude Code context

## Stack
Expo 54 + expo-router 6, React 18.3, RN 0.79, TS strict, expo-sqlite,
Zustand 5 + Immer, react-native-reanimated 4. Code leeft in /V0.1.2.

## Design system — NIET wijzigen zonder vragen
Zie V0.1.2/constants/Designsystem.ts en components/ui/EditorialBits.tsx.

Palette: paper #F6F1E7, ink #191613, ink55 rgba(25,22,19,0.55),
terracotta #C2492A, olive #5A6B3A, saffron #D49A3A.
Family: tuur=#C2492A, louise=#B56B3F, basiel=#5A6B3A, jules=#3A5A6B.

Type: Fraunces (display 300, italic accents in terracotta),
Inter (body 400/500/600), JetBrains Mono (folio 9px tracked 2px UPPERCASE).
Italic tail in terracotta voor titles (EditorialTitle).

Hard rules:
- Geen gradients, geen harde shadows, geen neon kleuren, geen emoji's in UI
- Behoud folio labels bij nieuwe schermen
- 8px spacing grid, min tap target 44px
- Copy in NL/VL, geen Engels in UI
- Hairline borders 0.5px met ink15 / ink08

## Code-conventies
- Functionele components + hooks, geen classes
- Zustand stores in V0.1.2/store/ (per feature) — gebruik Immer middleware
- Repository pattern: features/<feature>/repository.ts (SQLite I/O)
  + hooks.ts (read/write API) — NOOIT direct SQLite vanuit components
- Geen `any` in nieuwe code, geen inline styles — gebruik StyleSheet.create()
- Toast feedback via react-native-toast-message (zie ToastConfig)
- Haptics via expo-haptics op alle confirmaties
- Logging via utils/logger.ts: `log`/`warn` zijn no-ops in productie, `error`
  blijft altijd actief (Sentry pikt het op). Geen rauwe console.log/warn in
  productiecode, geen emoji's in log-strings.

## Architectuur (hoe de app gebouwd is)
- **Routing**: expo-router file-based in `app/`. Tabs in `app/(tabs)/`
  (home, weekplanner, grocery, settings/), overige schermen als stack-routes
  (recipes/, collections/, grocery/scanner, auth/, onboarding). Gating
  (onboarding) in `app/_layout.tsx`.
- **State**: Zustand stores in `store/` (Immer middleware), één per feature.
- **Datalaag**: repository pattern — `features/<feature>/repository.ts` doet
  alle SQLite I/O, `hooks.ts` is de read/write API voor components. Components
  raken nooit direct SQLite.
- **Local-first + cloud**: SQLite is de lokale source-of-truth. Supabase is een
  outbox-mirror: elke write gaat via de queue (`services/sync/queue.ts`,
  dead-letter + backoff) en wordt gepulld/realtime-gesynct in
  `services/sync/supabaseSync.ts`. Lifecycle-hooks in
  `services/sync/lifecycle.ts` (`useSupabaseSync`).
- **Family-profielen**: cloud source-of-truth (`family_members`), zie
  `services/familyMembers.ts` + `store/familyStore.ts`.
- **Receptfoto's**: lokaal `file://` → Supabase Storage bucket `recipe-images`
  (`services/imageUpload.ts`, pad `{familyId}/{recipeId}.jpg`); eenmalige
  backfill in `services/sync/imageBackfill.ts`.
- **Recept-import parser**: opgesplitst in `services/parsers/*` (fetch, jsonld,
  marleyspoon, dagelijksekost, heuristic, ingredients, duration, html);
  `services/recipeParser.ts` is een dunne re-export.
- **Crash reporting**: Sentry (`@sentry/react-native` + Expo config-plugin),
  init in `app/_layout.tsx` enkel als `EXPO_PUBLIC_SENTRY_DSN` gezet is. Zie
  `docs/SENTRY.md`. Supabase-setup: `docs/SUPABASE.md`.

## Wat al af is (niet opnieuw bouwen)
- Recepten CRUD, import vanuit URL (services/recipeParser.ts), image extractor
- Favorites, star rating, difficulty badge, servings scaler met smart rounding
- Filter bar, gefilterde recepten via useFilteredRecipes
- Weekplanner store + screen
- Grocery: bulk actions, quantity controls, category grouping, source tags,
  add-from-recipe modal, unit conversion
- Cook timer, cooking time display, recipe share card (view-shot)
- Sync service (services/sync/), notifications, onboarding flow
- Nutritie per recept via Open Food Facts (services/nutrition.ts +
  services/openFoodFacts.ts, NutritionPanel)
- Barcode scanner voor grocery (app/grocery/scanner.tsx,
  CameraView.onBarcodeScanned)
- Shops store met statische lijst (winkel-toggle in settings, geen externe
  integratie) (store/shopsStore.ts)
- Recipe collections (features/collections/, store/collectionsStore.ts,
  app/collections/, CollectionsPickerModal)
- PDF / print export (services/exports/pdf.ts, ExportMenuModal)
- Family members als cloud-resource (family_members tabel met display_name,
  color, allergies, active). Eigen profiel via updateMyProfile
  (services/familyMembers.ts), realtime sync tussen toestellen. Lokale
  familyStore is enkel nog in-memory spiegel + offline cache.
- Receptfoto's syncen via Supabase Storage (bucket recipe-images,
  services/imageUpload.ts + services/sync/imageBackfill.ts)
- Crash reporting via Sentry (@sentry/react-native, init in app/_layout.tsx,
  docs/SENTRY.md)
- Settings opgesplitst in app/(tabs)/settings/ (index + sections/*)

## Sanering (parallelle branch — chore/sanering-fase-0-triage)
- Triage + docs/SANITY.md als referentie voor codebase-status
- Supabase secrets uit broncode → V0.1.2/.env.example, geen hardcoded keys
- Outbox queue voor sync (services/sync/queue.ts + lifecycle.ts wire-up)
- 12 dode bestanden verwijderd
- app/recipes/[id].tsx opgesplitst (1491 → 767 regels, sub-componenten in
  features/recipes/components/detail/)

## Distributie
TestFlight (iOS) + Play Internal Testing (Android). Geen openbare App Store
listing. Testers worden per e-mail toegevoegd in App Store Connect resp.
Google Play Console. De app heeft geen interne toegangscode meer.

## Testing
Test runner: tsx (zie package.json scripts.test).
Tests in /tests/ — fixtures in tests/fixtures/. Geen Jest.
Run via: cd V0.1.2 && npm test
Typecheck via: cd V0.1.2 && npm run typecheck

## Builds
EAS via eas.json. Preview + production profiles voor iOS en Android.

## Web-deploy (Vercel) — extra target, naast native
De app draait ook als statische web-app om met testers te delen via URL. De
native iOS/Android flow blijft ongemoeid; web is enkel een extra target.
- `app.json` → `web.output: "single"` (SPA, geen SSR). SSR/`static` botst met de
  client-only SQLite/native APIs en de React 18-render — daarom single.
- `metro.config.js` voegt `.wasm` toe als asset zodat `expo-sqlite` (wa-sqlite)
  op web bundelt. OPFS-persistentie in een Web Worker.
- App gebruikt enkel de **async** SQLite-API → **geen** COOP/COEP cross-origin
  isolation nodig → Supabase-images blijven laden. Gebruik geen `*Sync`
  SQLite-methodes in code die op web kan draaien (die vereisen SharedArrayBuffer).
- `services/notifications.ts` no-opt op web (geen lokale notificaties in browser).
- Web-deps in package.json: `react-dom`, `react-native-web`, `@expo/metro-runtime`.
- Deploy: Vercel Root Directory = `V0.1.2`, config in `V0.1.2/vercel.json`. Volledige
  handleiding in `docs/VERCEL.md`. Lokaal: `npx expo export --platform web` → `dist/`.

## Nog te doen vóór publish

### Assets (ontbreken in V0.1.2/assets/)
`V0.1.2/assets/` bevat enkel `ASSETS.md` — de PNG's hieronder ontbreken maar
worden door `app.json` verwacht. Maak ze aan (geen placeholders gegenereerd):

- `V0.1.2/assets/app-icon-1024.png` — 1024×1024, opaque, achtergrond
  cream #EFE6D3, terracotta Cormorant italic R. Wordt gebruikt door zowel
  iOS-icoon, Android adaptive-icon-foreground als het splash-image.
- `V0.1.2/assets/notification-icon.png` — reeds verwacht door de
  expo-notifications plugin (pre-existing, niet nieuw in deze sprint)

## Sprint 37 — release hardening
- Babel naar `react-native-worklets/plugin` (Reanimated 4).
- app.json: `icon`, `splash` (paper #F6F1E7), `android.adaptiveIcon.foregroundImage`.
- iOS privacy manifest via `expo-build-properties` was geprobeerd maar weer
  uitgehaald: Snack's package-mirror kon `expo-build-properties` niet laden
  ongeacht de versie-range. Zie "Nog te doen vóór publish (handmatig)" voor de
  alternatieve route vlak voor je App Store submit.
- RLS gehardend (`supabase/migrations/release_hardening.sql`): invite_codes
  SELECT-leak dicht (verzilveren enkel nog via `redeem_invite_code` RPC), owner
  beschermd tegen kicken door andere leden.
- Auth: home-banner bij `familyId === null` (+ supabase geconfigureerd),
  `queue.enqueue` skipt zonder supabase/familyId (geen queue-bloat), one-shot
  initial backfill bij eerste login (`services/sync/initialBackfill.ts`).
- Sync: image-sync re-enqueue na upload (geverifieerd in create/update/backfill),
  LWW logt overschrijvingen van nieuwere lokale data naar Sentry,
  Settings → `SyncSection` voor wachtrij-diepte + dead-letter recovery.
- Auth UX: `authStore.waitForUser()` i.p.v. een vaste setTimeout, wachtwoord ≥ 8.

## Sprint 38 — sync-audit hardening
- Realtime delete-handlers gebruiken `deleteLocal` (geen outbox-write meer; de
  oude flow veroorzaakte een oneindige delete-pingpong tussen toestellen).
  Soft-deletes in de queue zijn idempotent (`.is('deleted_at', null)`).
- Weekplanner: remote applies via `applyRemoteWeeks` (weekPlannerStore) — de
  outbox-subscriber skipt die; diff op inhoud i.p.v. referentie.
- `pullAll`: tombstones worden lokaal verwijderd (geen resurrectie van remote
  verwijderde recepten), store-merge i.p.v. -vervanging (lokaal-only items
  blijven zichtbaar), pull-errors worden gelogd.
- Outbox: rijen dragen `family_id` (migratie v29); flush stempelt niet meer met
  het familyId van het moment van flushen (cross-family leak). Pre-login
  writes queuen met `family_id NULL` en flushen na login. Gezinswissel op één
  toestel wist lokale synced data (`resetLocalDataForFamilySwitch`).
- Foreground-sync (`useForegroundSync`): AppState active → flush + pull +
  `auth.startAutoRefresh`; NetInfo-reconnect pullt nu ook.
- LWW: `upsertMany` (recipes) heeft een `julianday(updated_at)`-guard; de
  recipeStore behoudt nieuwere lokale edits i.p.v. ze te overschrijven.
- Seeds: deterministische ids (`seed-<slug>`) via upsertMany — geen duplicaten
  per toestel meer na de initial backfill (pref nu per gezin).
- Delen: `fetchSharedRecipe` via `get_shared_recipe_payload` RPC
  (`supabase/migrations/shared_recipe_payload.sql`) — de directe table-reads
  konden door RLS nooit werken. Family-setup atomisch via
  `create_family_with_owner` RPC (`create_family_atomic.sql`).
- Onboarding-flag pas na geslaagde profiel-save; dead-letter geeft toast +
  `error()`-log (Sentry); authStore familyId-lookup checkt errors en zet bij
  een transient fout het bestaande familyId niet meer op null;
  `updateMyProfile` rolt de optimistische update terug bij een cloud-fout.
- Scan-scherm heeft een web-fallback (expo-camera werkt niet in de browser);
  share-als-tekst gebruikt de geschaalde hoeveelheden; Marley Spoon
  `gon.api_host` heeft een hostname-allowlist.

### Nog te doen vóór publish (handmatig)
- `eas.json`: vervang de `VERVANG_MET_*` placeholders door je Apple ID /
  Team ID / ASC App ID.
- Assets toevoegen indien ontbrekend (paden in app.json, afmetingen zoals
  gelogd onder "## Nog te doen vóór publish" hierboven).
- Supabase dashboard → Authentication → password min length op 8.
- `supabase/migrations/release_hardening.sql` op het Supabase project uitvoeren.
- `supabase/migrations/shared_recipe_payload.sql` en
  `supabase/migrations/create_family_atomic.sql` uitvoeren (sprint 38 —
  recepten delen en family-setup werken er niet zonder).
- iOS privacy manifest (NSPrivacyAccessedAPITypes) vóór App Store submit:
  Snack kan `expo-build-properties` niet laden, dus tijdelijk uit deze branch
  gehaald. Vóór een EAS production build voeg je hem terug toe met
  `npx expo install expo-build-properties` en zet je de plugin met de
  `NSPrivacyAccessedAPICategoryUserDefaults` (CA92.1),
  `NSPrivacyAccessedAPICategoryFileTimestamp` (C617.1),
  `NSPrivacyAccessedAPICategoryDiskSpace` (E174.1) en
  `NSPrivacyAccessedAPICategorySystemBootTime` (35F9.1) reasons in `app.json`.
  Push die wijziging NIET terug naar `sprint-37` zolang Snack 'm niet kan
  resolven — branch lokaal of in een EAS-only profile.
