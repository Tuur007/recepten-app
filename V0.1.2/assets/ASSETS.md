# Benodigde assets voor EAS-builds

Maak de onderstaande PNG-bestanden aan in deze map vóór je eerste EAS-build.
De bestanden staan in `.gitignore` zodat Expo Snack niet probeert ze te uploaden.

| Bestand             | Afmetingen  | Achtergrond   | Gebruik                          |
|---------------------|-------------|---------------|----------------------------------|
| `icon.png`          | 1024 × 1024 | Opaque        | App-icoon (iOS & Android)        |
| `adaptive-icon.png` | 1024 × 1024 | Transparant   | Android Adaptive Icon voorgrond  |
| `splash.png`        | 1284 × 2778 | Wit (#ffffff) | Splash-scherm                    |
| `favicon.png`       | 48 × 48     | Opaque        | Web favicon                      |

## Stappen

1. Voeg je PNG-bestanden toe aan deze map.
2. Voeg de verwijzingen toe aan `app.json`:

```json
"icon": "./assets/icon.png",
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#ffffff"
},
```

En onder `"android"`:
```json
"adaptiveIcon": {
  "foregroundImage": "./assets/adaptive-icon.png",
  "backgroundColor": "#16a34a"
}
```

En onder `"web"`:
```json
"favicon": "./assets/favicon.png"
```

3. Draai `eas init` (eenmalig) om je EAS-project te koppelen.
4. Bouw met `npm run build:android:prod` of `npm run build:ios:prod`.
