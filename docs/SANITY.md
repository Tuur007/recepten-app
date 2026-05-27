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

### Wat is opgelost in deze sanering

- **`[id].tsx` afgesplitst in FASE 4** — orchestrator 1491 → 767 regels.
  Detail-componenten in `V0.1.2/features/recipes/components/detail/`:
  `CookOverlay`, `GroceryPickerModal`, `ExportMenuModal`,
  `CollectionsPickerModal`, `AddIngredientForm`, `Section`, `helpers`.
- **Sync afgewerkt in FASE 3** — outbox queue (`services/sync/queue.ts`),
  lifecycle (`services/sync/lifecycle.ts`) gemount in `_layout.tsx`,
  NetInfo-listener flushed bij reconnect. Manuele acties (RLS migrations,
  anon key rotatie, EAS env vars) staan in `docs/SUPABASE.md`.

### Volgende sprint — kandidaten

- **`services/recipeParser.ts` is 800+ regels** — alle scrape-strategieën
  + image-extraction interleaved. Logische opvolger als nog een refactor
  gewenst is.

### Dingen die mijn tanden jeuken (niet aanpakken)

- `services/supabase.ts` had hardcoded URL + anon key als fallback. Weg in FASE 1.
- `utils/normalize.ts` en `utils/units.ts` zijn duplicate implementaties.
  FASE 2 raakt `utils/merge.ts` aan en kan dit meenemen — anders een latere
  cleanup.
- Het `services/sync/index.ts`-bestand mengt **lokale** JSON-export/import
  met cloud-sync semantiek (`pushAll`, `pullAll`). Naamgeving suggereert één
  systeem, code is twee. Hernoemen kan na FASE 3.

## Klaar voor

Sanering rond. Volgende sprint kan zich op de roadmap richten — `services/recipeParser.ts`
(800+ regels) is de logische opvolger als nog een refactor gewenst is.

## Status per fase

- ✅ **FASE 0** — triage, baseline, dode-files lijst (`9817696`)
- ✅ **FASE 1** — secrets uit `services/supabase.ts` + `.env.example` (`05b8a57`)
- ✅ **FASE 2** — 12 dode files verwijderd, typecheck + tests groen
- ✅ **FASE 3** — outbox queue + lifecycle wire-up + RLS checklist (`docs/SUPABASE.md`)
- ✅ **FASE 4** — `[id].tsx` 1491 → 767 regels, opgesplitst in 7 detail-componenten
- ✅ FASE 5 — release hardening (sprint-37)
