# Sentry — crash reporting

De app gebruikt [`@sentry/react-native`](https://docs.sentry.io/platforms/react-native/)
voor crash- en error-reporting. Sentry is **opt-in**: zonder DSN doet de
integratie helemaal niets (no-op), zodat lokaal/dev niets verstuurt.

> Let op: we gebruiken `@sentry/react-native` (met de Expo config-plugin
> `@sentry/react-native/expo`), niet het oude `sentry-expo`. Dat laatste is
> sinds Expo SDK 50 deprecated en werkt niet op SDK 54.

## Wat draait waar

| Onderdeel | Bestand |
|---|---|
| `Sentry.init` (module-load, vóór render) | `app/_layout.tsx` |
| `Sentry.captureException` bij render-crash | `components/ErrorBoundary.tsx` |
| Config-plugin (sourcemap upload) | `app.json` → `@sentry/react-native/expo` |

`Sentry.init` draait met `tracesSampleRate: 0.1` en
`environment: __DEV__ ? 'development' : 'production'`.

## DSN configureren

De **runtime-DSN** moet de `EXPO_PUBLIC_` prefix hebben — alleen zo bundelt
Expo de waarde in de client. Een Sentry-DSN is niet geheim (hij zit sowieso
in de gepubliceerde app), dus dit is veilig.

```
# V0.1.2/.env
EXPO_PUBLIC_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
```

Voor EAS builds zet je dezelfde variabele als project-env:

```
eas env:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value https://...
```

Laat de waarde leeg om Sentry uit te zetten (init wordt dan overgeslagen).

## Sourcemaps uploaden

Sourcemaps maken de stacktraces leesbaar (anders zie je geminificeerde code).
De config-plugin regelt de upload tijdens de EAS build via de Sentry CLI. Die
heeft **build-time** env vars nodig (géén `EXPO_PUBLIC_` prefix — ze mogen niet
in de client belanden):

```
eas env:create --scope project --name SENTRY_AUTH_TOKEN --value sntrys_...
eas env:create --scope project --name SENTRY_ORG --value <org-slug>
eas env:create --scope project --name SENTRY_PROJECT --value <project-slug>
```

De `SENTRY_AUTH_TOKEN` maak je aan in Sentry → Settings → Auth Tokens met scope
`project:releases` (en `org:read`). **Niet committen.**

## Free tier

De Sentry Developer (free) tier dekt ruim voldoende voor een familie-app:
- 1 gebruiker
- ~5.000 errors / maand
- ~10.000 performance-units / maand (we samplen op 10%, dus zuinig)
- 30 dagen retentie

Bij overschrijding worden events gedropt (geen kosten); voor deze app
onwaarschijnlijk.
