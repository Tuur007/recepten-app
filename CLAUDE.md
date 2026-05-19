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

## Wat al af is (niet opnieuw bouwen)
- Recepten CRUD, import vanuit URL (services/recipeParser.ts), image extractor
- Favorites, star rating, difficulty badge, servings scaler met smart rounding
- Filter bar, gefilterde recepten via useFilteredRecipes
- Weekplanner store + screen
- Grocery: bulk actions, quantity controls, category grouping, source tags,
  add-from-recipe modal, unit conversion
- Cook timer, cooking time display, recipe share card (view-shot)
- Sync service (services/sync/), notifications, onboarding flow

## Nog op de roadmap (prioriteit)
1. Nutritie-data per recept (Open Food Facts of Edamam)
2. Barcode scanner voor grocery items (expo-camera CameraView.onBarcodeScanned)
3. Colruyt integratie afmaken (zie debug-colruyt.mjs in vorige sprint)
4. Dark mode (palette werkt mooi geïnverteerd)
5. Recipe collections (custom groups: "BBQ", "snel doordeweeks", ...)
6. PDF / print export van recepten + boodschappenlijst
7. Cooklang als export-formaat

## Testing
Test runner: tsx (zie package.json scripts.test).
Tests in /tests/ — fixtures in tests/fixtures/. Geen Jest.
Run via: cd V0.1.2 && npm test
Typecheck via: cd V0.1.2 && npm run typecheck

## Builds
EAS via eas.json. Preview + production profiles voor iOS en Android.
