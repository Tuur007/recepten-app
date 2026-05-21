# SANITY — FASE 0 triage

Stand van zaken op `chore/sanering-fase-0-triage`, vertrekkende van
`origin/sprint-35` (commit `d390608`).

## Test-baseline

`cd V0.1.2 && npm test` — **75 passed, 0 failed, 1 skipped** verspreid
over zes suites:

| Suite                          | Tests |
|--------------------------------|------:|
| `extractor.test.mjs`           |    10 passed, 1 skipped |
| `parseTimeFromStep.test.mjs`   |    15 passed |
| `marleyspoon.test.mjs`         |    21 passed |
| `groceryStore.test.mjs`        |     6 passed |
| `normalize.test.mjs`           |    18 passed |
| `sync.test.mjs`                |     5 passed |

`cd V0.1.2 && npm run typecheck` — **schoon**, geen `tsc` fouten.

## TODO / FIXME / XXX / HACK

`grep -rnE "TODO|FIXME|XXX|HACK" V0.1.2/**/*.{ts,tsx}` levert **niets** op.
De codebase is op dit punt schoon van expliciete markers — alle bekende
schulden zitten verstopt in commit-historie en design-keuzes.

## Dode bestanden

Geverifieerd door grep op imports. Files met **0 importers** in de hele
boom (`V0.1.2/app|services|components|features|store|utils|hooks|database|theme|constants|types`):

| Bestand | Reden | Status |
|---|---|---|
| `V0.1.2/hooks/useNetworkSync.ts` | Niet aangeroepen vanuit `_layout.tsx` of elders. Heel `hooks/` bevat alleen dit ene dode bestand. | verwijderd (FASE 2) |
| `V0.1.2/utils/unitConversion.ts` | Eigen versie van conversies. Niemand importeert het; `utils/merge.ts` gebruikt uitsluitend helpers uit `utils/normalize.ts`. | verwijderd (FASE 2) |
| `V0.1.2/utils/units.ts` | Definieert `KNOWN_UNITS`, `normalizeUnit`, `areUnitsCompatible` — maar `utils/normalize.ts` doet exact hetzelfde en wordt wél gebruikt. Pure shadowing. | verwijderd (FASE 2) |
| `V0.1.2/utils/linking.ts` | Geen importers. | verwijderd (FASE 2) |
| `V0.1.2/utils/validation.ts` | Geen importers. | verwijderd (FASE 2) |
| `V0.1.2/types/sync.ts` | Alleen geïmporteerd door `services/sync/types.ts` (re-export) — dat is ook dood. | verwijderd (FASE 2) |
| `V0.1.2/services/sync/types.ts` | Pure re-export van `types/sync.ts`. Geen consumer. | verwijderd (FASE 2) |
| `V0.1.2/components/WeekPlanner.tsx` | Niet geïmporteerd. (`app/(tabs)/weekplanner.tsx` is een aparte file en gebruikt deze niet.) | verwijderd (FASE 2) |
| `V0.1.2/features/recipes/components/RecipeCard.tsx` | Geen importers — `recipes.tsx` rendert recipes inline ipv via deze component. | verwijderd (FASE 2) |
| `V0.1.2/features/recipes/components/FilterBar.tsx` | Geen importers — filter-chips zijn ingebouwd in `recipes.tsx`. | verwijderd (FASE 2) |
| `V0.1.2/features/grocery/components/QuantityControls.tsx` | Geen importers. | verwijderd (FASE 2) |
| `V0.1.2/features/grocery/components/GroceryItem.tsx` | Geen importers — `grocery.tsx` gebruikt `GroceryItemEnhanced`. | verwijderd (FASE 2) |

**Totaal: 12 dode files** — allemaal verwijderd in FASE 2.

Eslint-warnings ("Unused vars", "no-script-url") in pre-existing files
(`features/recipes/components/CategoryPicker.tsx`, `services/imageExtractor.ts`,
`services/recipeParser.ts`, `utils/servingsScaler.ts`, etc.) bevestigen dat
sommige van deze imports al lang niet meer gebruikt worden — een eslint-pass
zou `--ext .ts,.tsx --no-unused` 19 errors loggen, allemaal pre-existing.

## Bevindingen voor latere fasen

Hier alvast vastgelegd wat ik tegenkwam maar buiten FASE-0 scope valt. Niet aanraken.

### Volgende sprint — kandidaten

- **`app/recipes/[id].tsx` is 1491 regels** — orchestrator + 6 modals + 4
  off-screen kaarten + CookOverlay in één bestand. FASE 4 op de roadmap.
- **`services/recipeParser.ts` is 800+ regels** — alle scrape-strategieën
  + image-extraction interleaved. Splitsen ook uitgestelde fase.
- **Sync is dood ingehaakt**: `useAuthStore.initialize()` (in `store/authStore.ts`)
  wordt nergens aangeroepen, dus de hele Supabase-auth flow is logisch
  onbereikbaar tenzij iemand de tabs zoekt. `useNetworkSync` zelf is óók niet
  gemount. FASE 3 vraagt expliciet om een A/B-keuze hier.
- **`features/recipes/repository.ts` `pushRecipe(x).catch(console.error)`** — fire-
  and-forget naar Supabase zonder retry queue. Stille data-loss bij offline.
  Hoort in FASE 3B-2.
- **Inviteservice + RLS**: `services/inviteService.ts` is gekoppeld aan
  Supabase; de RLS-policy "redeem invite codes" op `supabase/schema.sql`
  liet (in eerdere review) iedereen elke `family_id` zien. Migratiefile staat
  klaar in `supabase/migrations/fix_rls_policies.sql` — niet handmatig
  toegepast voor zover ik kan zien.

### Dingen die mijn tanden jeuken (niet aanpakken)

- `services/supabase.ts` heeft hardcoded URL + anon key als fallback voor
  Expo Snack. FASE 1.
- `utils/normalize.ts` en `utils/units.ts` zijn duplicate implementaties.
  FASE 2 raakt `utils/merge.ts` aan en kan dit meenemen — anders een latere
  cleanup.
- Het `services/sync/index.ts`-bestand mengt **lokale** JSON-export/import
  met cloud-sync semantiek (`pushAll`, `pullAll`). Naamgeving suggereert één
  systeem, code is twee. Hernoemen kan na FASE 3.

## Klaar voor

FASE 3 — sync architectuur (Supabase A/B keuze: doorgaan met retry-queue
of lokaal blijven). Wachten op 👍.

## Status per fase

- ✅ **FASE 0** — triage, baseline, dode-files lijst (`9817696`)
- ✅ **FASE 1** — secrets uit `services/supabase.ts` + `.env.example` (`05b8a57`)
- ✅ **FASE 2** — 12 dode files verwijderd, typecheck + tests groen
- ⏳ **FASE 3** — sync architectuur
- ⏳ **FASE 4** — `app/recipes/[id].tsx` opsplitsen
