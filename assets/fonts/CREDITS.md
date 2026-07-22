# Font-Lizenz (assets/fonts)

| Datei | Font | Herkunft | Quelle |
|---|---|---|---|
| `kfgqpc-hafs.ttf` | KFGQPC HAFS Uthmanic Script Regular (v0.18) | King Fahd Glorious Quran Printing Complex (KFGQPC), Al-Madinah Al-Munawwarah, Saudi-Arabien — offizielles Entwickler-Portal `qurancomplex.gov.sa/en/techquran/dev/` | Font-Mirror `github.com/thetruetruth/quran-data-kfgqpc` (`hafs/font/hafs.18.ttf`), Original-Host `fonts.qurancomplex.gov.sa` |

Der offizielle Uthmani-Hafs-Standardfont des KFGQPC (nicht das 604-Einzelseiten-
Font-System für pixelgenaue Druckseiten-Zeilenumbrüche — das wäre ein separates
Vorhaben mit anderen Daten). Font-interner Name laut Name-Tabelle: "KFGQPC HAFS
Uthmanic Script Regular", Copyright KFGQPC 2010/2019.

Die Einbindung erfolgt auf ausdrückliche Anweisung des Produktinhabers (Session
2026-07-18): die zuvor bestehende Lizenz-Blockade für diesen Font wurde vom
Produktinhaber als geklärt erklärt. Das Font-Lizenz-EULA (im Font selbst
eingebettet) gestattet die Nutzung der Font-Software; bei Rückfragen zur
kommerziellen Distribution vor App-Store-Veröffentlichung erneut prüfen.

Registrierung im Code: `apps/mobile/src/app/_layout.tsx` (via `expo-font`
`useFonts`, Key `KFGQPCHafs`), verwendet als `ArabicFont`-Konstante in
`apps/mobile/src/constants/theme.ts`.
