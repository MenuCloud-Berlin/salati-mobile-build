# Supabase-Auslagerung: Entscheidungsvorlage

> Analyse 2026-07-22. Ziel: kleinere App/APK, Content-Updates ohne Store-Release,
> geringerer JS-Bundle. Read-only-Bestandsaufnahme, KEINE Code-Änderung.
> Relevantes Supabase-Projekt: `oulyzhselufekxekkqjp`, public Bucket `podcasts`
> (bzw. neuer Bucket) — striktes Muster: nur `fetch` + lokaler Cache, kein
> Supabase-Client, keine Vermischung mit MenuCloud.

---

## 0. Kernbefund zuerst (Realitäts-Check zur APK-Größe)

Die APK-Größe wird **nicht** von den mitgelieferten Daten dominiert, sondern von
**Native-Code**. Aus dem lokalen Release-Build:

| Bestandteil | Größe (Release) | Auslagerbar nach Supabase? |
|---|---|---|
| `libreactnative.so` (Hermes + RN, pro ABI) | ~125–134 MB unstripped / im AAB pro Gerät gestrippt geliefert | **Nein** (Native) |
| Weitere `.so` (onnxruntime/whisper.rn/ffmpeg etc.) | mehrere MB je ABI | **Nein** (Native) |
| **JS-Bundle** `index.android.bundle` (Hermes-Bytecode) | **17,0 MB** | **Teilweise** — hier steckt die auslagerbare Daten-Masse |
| `assets/` (Audio/Bilder/Fonts) | **8,1 MB** | **Teilweise** |

Das Play-Store-AAB (`app-release.aab` 107 MB) wird von Google **pro Gerät/ABI**
ausgeliefert; der Nutzer lädt also nicht die 158 MB der Website-Universal-APK,
sondern deutlich weniger. Der **große** Hebel für die Download-Größe wäre
ABI-Split (bereits AAB → passiert) bzw. das Entfernen von Native-Modulen — **das
kann Supabase-Auslagerung nicht leisten.**

**Was Supabase-Auslagerung realistisch bringt:** ~8–12 MB weniger im
JS-Bundle + Assets (von ~25 MB Content-Footprint bleiben ~13–17 MB), und — der
eigentliche Wert — **Content-Updates ohne Store-Release** (Kurs-Tippfehler, neue
Lektionen, frische Quizfragen sofort live). Das ist der stärkere Grund, nicht die
MB.

---

## 1. Bereits ausgelagert / nicht im nativen APK (NICHT erneut vorschlagen)

| Asset | Größe | Status |
|---|---|---|
| Whisper-Modelle (`public/models/whisper-base-ar-quran`, base 148 MB / turbo 574 MB) | 102 MB im Repo | **Runtime-Download** von HuggingFace ins `documentDirectory` (`whisperModel.ts`), per `.easignore` aus dem Native-Build ausgeschlossen. Bereits optimal. |
| Quran-Text, Übersetzungen, Tafsir, Wort-für-Wort, Rezitator-Audio | — | **Externe APIs** (`api.alquran.cloud`, `api.quran.com`, `audio.qurancdn.com`) via `src/features/quran/api.ts`. Nicht gebündelt. Offline-Audio wird per `offline-audio.ts` bei Bedarf ins `documentDirectory` gecacht. |
| Podcast (Audio/Cover/Transkripte) | — | **Supabase Bucket `podcasts`** via `index.json` + `fetch` (`podcast/data.ts`). Referenz-Muster. |
| RAG-Embeddings + Korpus (`public/rag/*`, 3,9 MB) | 3,9 MB im Repo | **Web-only** (KI-Chat auf salati.pro), nicht im nativen Bundle. |
| Website-APK-Teile (`public/salati.apk.part*`, 158 MB) | 158 MB im Repo | Website-Download-Hosting, `.easignore`. |
| `assets/marketing/*` (Screenshots, 2,3 MB) | 2,3 MB | **Web-only** — nur in `app/(tabs)/index.web.tsx` referenziert, **nicht** im nativen APK. Kein Handlungsbedarf. |

**Wichtige Konsequenz:** Der Offline-Mandats-Kern (Quran-Text, Übersetzungen)
ist **heute schon API-basiert**, nicht offline-gebündelt. Wirklich offline-kritisch
im Bundle sind nur: UI-Locales (Erststart), Adhan-Audio (Gebetszeit ohne Netz),
Quran-Schrift-Font. Gebetszeiten werden **berechnet** (adhan-Lib), nicht als Daten
geliefert.

---

## 2. Bewertung der gebündelten Kandidaten

Legende: **(a)** klar sinnvoll auslagern · **(b)** grenzwertig · **(c)** muss gebündelt bleiben.

| Asset | Größe | Empf. | Begründung |
|---|---|:--:|---|
| **Studium-Kurse** `src/features/study/data/*.json` (12 Dateien) | **6,9 MB** | **a** | Größter Datenblock. Nicht Kern-Religiös i.S. des Offline-Mandats. Bereits per `import()` code-gesplittet (nur Web-Effekt — nativ landet trotzdem alles im Bundle). Profitiert massiv von OTA (Tippfehler, neue Lektionen, `lessonCount`-Änderungen ohne Release). Offline via First-Online-Precache lösbar. |
| ┗ madinah.json | 1,81 MB | a | größte Einzeldatei |
| ┗ seerah / prophets / sahaba / amau / tajwid / grammar | 0,5–0,9 MB je | a | |
| ┗ nawawi40 / aqida / akhlaq / dialects / nikah | 0,09–0,4 MB je | a | |
| **Trivia** `src/features/practice/trivia.json` | **508 KB** | **a** | Reines Nice-to-have-Quiz, kein Offline-Kern. Ideal für OTA (frische Fragen). Bei Netzfehler: Feature ausblenden/leer — unkritisch. |
| **Locales (8 Phase-1-Sprachen)** bn/fa/ps/ur/ru/ms/id/sw | **~1,1 MB** | **b** | UI-Übersetzung, beim Start **statisch** importiert (`translate.ts`) → alle 14 sofort im Speicher. Erststart-ohne-Netz in diesen Sprachen bräuchte Fallback auf de/en (existiert bereits!). Grenzwertig: klein pro Datei, aber Offline-Erstlauf-Risiko. Nur sinnvoll wenn Precache + robuster de/en-Fallback. |
| **Guide-Bilder** `assets/images/guides/*.jpg` (wudu, ghusl, salah, kaaba …) | **~1,5 MB** | **b** | Illustrationen in den Ratgebern. Remote-cachebar (wie Offline-Audio), aber Ratgeber sind eher „offline erwartbar". Mittlere Update-Frequenz. Grenzwertig. |
| **Duas** `src/features/duas/data/duas.json` | **277 KB** | **b** | Religiöser Inhalt, wird plausibel offline gebraucht (Bittgebete unterwegs). Klein. Auslagern spart wenig, Offline-Risiko real → eher behalten oder nur mit Precache. |
| **Adhan-Audio** `assets/audio/azan/*.mp3` (mehrere Rufe, größter azan14 1,0 MB) | **3,6 MB** | **b** | **Muss offline abspielbar** sein (Gebetszeit evtl. ohne Netz), aber nur der **gewählte** Adhan muss lokal sein. Modell: 1 Standard-Adhan bündeln, restliche als Download (wie Rezitator-Offline-Audio). Grenzwertig wegen Offline-Kritikalität. |
| Guides-Text `src/features/guides/guides.json` | 128 KB | b | Wie Duas: klein, offline erwartbar. |
| Lern-Daten `salah-words` (89 K), `vocab` (76 K), `wisdom` (20 K), `fatiha-deep` (19 K) | ~0,2 MB | c | Klein, Teil der Kern-Lern-Engine, offline nötig. Aufwand/Nutzen negativ. |
| **Quran-Schrift-Font** `assets/fonts/kfgqpc-hafs.ttf` | 237 KB | **c** | Immer & überall gebraucht (arabischer Text), Font muss vor First-Paint da sein. Behalten. |
| Basis-Locales de/en (+ tr/ar) `src/locales/*` | ~0,4 MB | **c** | Erststart-UI ohne Netz. Behalten. |
| Logo/Icon/Splash `assets/images/logo*`, App-Icon | ~0,5 MB | **c** | Native-Icons/Splash müssen im Bundle sein. Behalten. |
| Landing-Bilder `assets/images/landing/*` | ~0,4 MB | c | Nur Web/Onboarding — Prüfen ob nativ referenziert; falls web-only, bereits raus. |

---

## 3. Geschätzter Gesamtgewinn

| Szenario | Quell-Daten raus | Effekt JS-Bundle / Assets |
|---|---|---|
| **Konservativ (nur Kat. a)** | Studium 6,9 MB + Trivia 0,5 MB = **7,4 MB** Quell-JSON | JS-Bundle 17 MB → **~10–12 MB** (Hermes-Bytecode ≈ ähnlich groß wie Quell-JSON). Assets unverändert. |
| **+ grenzwertig (b) sinnvoll** | zusätzlich 8 Locales 1,1 MB + Guide-Bilder 1,5 MB + Adhan-Split ~2,5 MB | zusätzlich ~4 MB Assets + ~1 MB Bundle. |
| **Realistisch gesamt** | | **~8–12 MB** kleinerer Install (Bundle + Assets), also von ~25 MB Content-Footprint auf ~13–17 MB. |

Gemessen an der **pro-Gerät ausgelieferten** Download-Größe (Native-dominiert)
sind das grob **einstellige Prozent** — aber ~40–50 % des reinen Daten-/Bundle-
Anteils. **Der Haupt-Gewinn ist nicht die MB-Zahl, sondern OTA-Content-Updates.**

---

## 4. Konkreter Umsetzungsplan für Kategorie (a) — NICHT umgesetzt

Muster: exakt wie Podcast (`fetch` einer `index.json` aus public Bucket) + lokaler
Cache wie `offline-audio.ts`/`whisperModel.ts` (`expo-file-system/legacy`,
`documentDirectory`, Index in AsyncStorage).

### 4.1 Studium-Kurse (6,9 MB)

**Bucket-Layout** (neuer public Bucket `study` im Projekt `oulyzhselufekxekkqjp`):
```
study/index.json                 # { version, courses:[{id, sha256, url, lessonCount}] }
study/tajwid.json
study/madinah.json
...  (die 12 heutigen data/*.json unverändert hochladen)
```

**App-Änderung (nur skizziert):**
- `courses.ts`: `COURSE_DEFS[].load` von `() => import('./data/x.json')` auf einen
  Cache-Loader umstellen: `loadCourseLessons(id)` prüft `documentDirectory/study/<id>.json`
  → lokal vorhanden & `sha256` passt → aus Datei lesen; sonst von
  `study/<id>.json` `fetch`en, in `documentDirectory` schreiben, `sha256` in
  AsyncStorage ablegen. `COURSE_META`/`lessonCount` bleiben **synchron gebündelt**
  (winzig), damit das Studium-Hub-Listing ohne Netz rendert.
- **Offline-Fallback (Pflicht):** Kurs noch nie geladen + kein Netz → klare
  Meldung „Kurs beim ersten Öffnen mit Internet laden". Optional: **1 Kern-Kurs**
  (z. B. tajwid) gebündelt lassen als Offline-Startpunkt.
- **First-Online-Precache:** beim ersten App-Start mit Netz alle 12 im Hintergrund
  laden (12 × `fetch`, ~6,9 MB), damit späteres Offline-Studium funktioniert.
- **`courses.test.ts`** prüft `lessonCount` heute gegen die lokalen JSONs — Test
  auf gebündeltes Metadaten-Manifest (oder Fixture) umstellen, damit er offline grün bleibt.

### 4.2 Trivia (508 KB)

- Bucket `study/trivia.json` (oder `content/trivia.json`).
- `src/features/practice/*`: `import trivia from './trivia.json'` → Cache-Loader
  (fetch + `documentDirectory/trivia.json`, AsyncStorage-`version`).
- Offline-Fallback: unkritisch — bei fehlendem Cache Quiz-Eintrag ausblenden.
  Optional kleines gebündeltes Seed-Set (z. B. 20 Fragen) für Offline-Erstlauf.

### 4.3 Gemeinsame Infrastruktur (einmalig)

- **Ein** generischer `cachedJson<T>(bucketPath, {version|sha256, seed?})`-Helper
  (Vorbild `offline-audio.ts` Index-Logik) statt pro Feature zu duplizieren.
- Upload-Skript analog `podcast/scripts/upload.py`: lädt `data/*.json` + trivia
  in den Bucket, schreibt `index.json` mit `sha256`/`version`. Damit ist der
  Content-Update-Flow: JSON ändern → Skript → live, **kein Store-Release**.
- Bucket **public** (nur `fetch`, kein Client/Key in der App — Muster wie Podcast).

---

## 5. Risiken & Offline-Vorbehalte

- **Offline-Erstlauf ist die Hauptgefahr.** Wer die App zum ersten Mal ohne Netz
  öffnet, hat ausgelagerte Inhalte nicht. Mitigation: First-Online-Precache +
  gebündelte Seeds für die kritischsten Inhalte + klare UI-Meldung. Kern-Religiöses
  (Quran-Text ist ohnehin schon API-basiert; Gebetszeiten werden berechnet;
  gewählter Adhan + de/en-UI + Font bleiben gebündelt) bleibt unangetastet.
- **Kein zusätzlicher Single-Point-of-Failure für Gebet:** Adhan-Auslagerung nur
  mit garantiert lokal vorhandenem Standard-Adhan.
- **Supabase Free-Tier-Egress:** 6,9 MB × Installationen. Bei Wachstum Cloudflare
  davor (Projekt hat bereits CDN-Muster) — Bandbreite beobachten.
- **Versionierung/Cache-Invalidierung:** `sha256`/`version` im Manifest ist Pflicht,
  sonst zeigt der Cache veraltete Kurse. Ohne das kein verlässliches OTA.
- **Test-Abhängigkeit:** `courses.test.ts` / `courseOrder.test.ts` lesen heute die
  lokalen JSONs — vor Auslagerung auf Manifest/Fixtures umstellen, sonst CI rot.
- **App-Store-Richtlinien:** Reines Content-Nachladen (Daten, keine ausführbare
  Logik) ist bei Apple/Google zulässig. Keine JS-Code-Auslagerung — dafür wäre
  Expo-Updates/OTA der richtige, separate Mechanismus.
- **Ehrlichkeit zur Erwartung:** Die APK wird dadurch **nicht dramatisch** kleiner
  (Native dominiert). Wer echte MB will, muss an Native-Modulen/ABI-Splitting
  ansetzen. Der reale Gewinn hier heißt **schnellere Content-Updates**.

---

## 6. Empfehlung (kompakt)

1. **Machen — Kat. (a):** Studium-Kurse (6,9 MB) + Trivia (0,5 MB) via public Bucket
   + `fetch`/Cache + First-Online-Precache auslagern. Hauptnutzen: OTA-Content ohne
   Release; ~7–9 MB kleineres JS-Bundle.
2. **Optional/später — Kat. (b):** Adhan-Split (1 Standard bündeln, Rest Download),
   Guide-Bilder remote-cachen. Nur wenn Precache/Offline-Fallback sauber steht.
3. **Nicht anfassen — Kat. (c):** Font, de/en-Locales, Duas/Guides-Text, App-Icons,
   Kern-Lern-Daten — klein und offline-kritisch.
4. **Kein Re-Work:** Whisper, Quran-APIs, Podcast, RAG, Marketing sind bereits
   ausgelagert/web-only.
