# Web-deploy via Vercel

De Recepten-app draait naast iOS/Android ook als **web-app**. Dit is bedoeld
om snel met testers te delen via een URL — zonder TestFlight/Play Internal.
De native build (EAS → TestFlight / Play) blijft volledig intact: web is een
extra target, geen vervanging.

## Hoe het werkt

- Expo exporteert de app als **statische single-page app** (`web.output: "single"`
  in `app.json`). Eén `index.html` + JS-bundels in `dist/`.
- `expo-sqlite` draait op web via een WASM-build (wa-sqlite) met OPFS-persistentie
  in een Web Worker. De app gebruikt uitsluitend de **async** SQLite-API, dus er
  is **geen** cross-origin isolation (COOP/COEP) nodig — daardoor blijven
  Supabase Storage-afbeeldingen en andere cross-origin resources gewoon laden.
- `metro.config.js` voegt `.wasm` toe als asset-extensie zodat de bundler de
  SQLite-WASM meeneemt.
- Notificaties zijn op web een no-op (`services/notifications.ts`); lokale
  geplande meldingen bestaan niet in de browser.

## Eénmalige setup in Vercel

1. **New Project** → importeer de GitHub-repo `tuur007/recepten-app`.
2. **Root Directory**: zet op `V0.1.2` (de app leeft in die subfolder).
   Vercel pikt dan automatisch `V0.1.2/vercel.json` op.
3. Build-instellingen komen uit `vercel.json` (niets handmatig in te vullen):
   - Build Command: `npx expo export --platform web`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Environment Variables** (Project → Settings → Environment Variables) —
   dezelfde `EXPO_PUBLIC_*`-vars als lokaal, zodat cloud-sync werkt:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SENTRY_DSN` (optioneel)

   Zonder Supabase-vars werkt de app nog steeds lokaal (SQLite/OPFS), maar
   zonder cloud-sync en zonder family-login.
5. **Deploy**. Elke push naar de productiebranch geeft een nieuwe deploy;
   PR's krijgen automatisch een preview-URL.

## Lokaal testen

```bash
cd V0.1.2
npm install
npx expo export --platform web      # bouwt naar dist/
npx serve dist                      # of: python3 -m http.server -d dist 3000
```

Open de URL en test in een Chromium- of Safari-browser (OPFS-support vereist
een recente browser: Chrome 102+, Safari 16+, Firefox 111+).

## Belangrijke noten

- **CORS op Supabase**: zorg dat je Vercel-domein in Supabase → Auth → URL
  Configuration bij de toegestane redirect-URL's staat als je auth/redirects
  gebruikt. Storage-images werken zonder extra config (geen COOP/COEP).
- **Geen native features op web**: camera/barcode-scanner, lokale notificaties
  en het lokaal opslaan van receptfoto's (`file://`) zijn op web uit of beperkt.
  De kern — recepten, weekplanner, boodschappen, collecties — werkt volledig.
- **iOS standalone blijft werken**: niets aan de native flow is gewijzigd.
  Bouw zoals altijd met `npm run build:ios:preview` / `:prod` (zie `eas.json`).
  `metro.config.js`, de web-deps en `web.output` raken de native bundel niet.
