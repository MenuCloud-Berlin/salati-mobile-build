# Salati — Arbeits-Backlog (Audit + Content-Ausbau)

> Lebendes Dokument. Stand 2026-07-22. Erledigtes → `[x]` mit Beleg.
> Store-/Release-Historie steht in `../../USER-TODO.md`, nicht hier.
> Aktueller Live-Stand Website: **vc31 (1.27.19)** auf www.salati.pro.
> Ziel dieses Durchgangs: alle App-Verbesserungen mergen → **vc32** deployen → User testet.

---

## Z) Voll-Audit-Runde → vc33 (Stand 2026-07-22, Nutzer: „alles abarbeiten, nichts auslassen, Build erst wenn perfekt")

**vc32 (1.27.20) ist zum Testen live** auf www.salati.pro — trägt die 5 gezielten Fixes (A1–A5).
Der Nutzer testet vc32 auf echtem Gerät; **finaler Build (vc33) wartet auf sein Feedback** — Schwerpunkt laut Nutzer: **Element-Größen zu groß / Apple-Feeling auf jedem Gerät**, und **Einstellungsmenü fühlt sich nicht wie iOS an**.

Berichte: `AUDIT-UX-2026-07-22.md`, `AUDIT-CONTENT-2026-07-22.md`. Gute Nachricht: kein P0/Crash.

**5 Agents laufen (strikt getrennte Datei-Bereiche):**
- [ ] **UX-Voll-Fix** (src/app UI + components + theme + locales): ScreenHeader (nativer Zurück-Button ~16 Screens + Modal-Schließen), Sure-{n}-i18n, NEU-Badges/Karten, Home-Touch-Targets, Badge-Skala, Studium-Kopf, u. a. — PLUS **Element-Größen/Responsiveness auf jedem Gerät** (Direktive) + **iOS-Settings-Umbau** (Direktive: gruppierte Inset-Liste, Icon-Kacheln, Footnotes, Suche bleibt).
- [ ] **99 Namen** Bedeutungen → alle 14 Sprachen (names-Daten).
- [ ] **nawawi40** (42 Lektionen) Story+Quiz → 8 Sprachen (id/bn/fa/ms/ur/sw/ru/ps).
- [ ] **aqida+akhlaq+nikah** (25 Lektionen) → 8 Sprachen.
- [ ] **Dialekte** (224 Vokabeln) → 8 Sprachen.
  (Alle Kurs-Übersetzungen sind maschinell → **muttersprachliche/fachliche Gegenlese vor Store-Claim „vollständig 14-sprachig" nötig**, v. a. ps/bn.)

**Selbst erledigt:** Store-Text „47 Duas" → „89 Duas" in de/en/es/tr/ar (Code hat 89).

**P2-Roadmap (bewusst NICHT in vc33, damit nichts still wegfällt — Entscheidung/Aufwand):**
- AR-/Kamera-Qibla (neues Feature, expo-camera + Sensor) — eigener Build.
- Deutscher/mehrsprachiger Tafsir — **blockiert**: keine freie Datenquelle (s. USER-TODO Datenquellen-Blocker); Optionen: Lizenz oder eigene Kurz-Erklärung.
- Wort-für-Wort-Übersetzung Deutsch für Kernsuren (API nur EN) — eigene Glossen.
- Arabische Wurzel-/Morphologie-Suche im Reader.
- Benannte Adhan-Stimmen (Makkah/Madinah/al-Afasy) statt 6 generischer.
- Hisnul-Muslim-Dua-Ausbau (Situations-Duas) — mit Quellen, review-pflichtig.
- Store-Listings in den 8 fehlenden App-Sprachen; Apple-Datenschutz-Label (Standort) prüfen.
- 99-Namen-Benefit-Text je Name (P2, über 1-Zeilen-Bedeutung hinaus).

---

## A) App-Audit & Politur (Nutzer-Feedback-Batch 2026-07-19/22) — in vc32 deployed ✓

Läuft parallel über mehrere Agents. Merge-Reihenfolge: erst tsc/eslint/jest je Branch grün, dann in main mergen, dann vc32 bauen.

- [ ] **A1 Spracherkennung ganze Sure deutlich besser** — Agent läuft.
      Kern: Voll-Aufnahme-Endauswertung in überlappenden Fenstern statt nur
      Tail-Fenster; positions-gekoppeltes monotones Reveal; Serializer gegen
      "Context is already transcribing".
- [ ] **A2 Video-Player** — Agent läuft. Sortierung/Ordnung vor der Übersicht,
      Playlisten, Autoplay-next nach Video-Ende, Hintergrund-/PiP-Wiedergabe,
      Beschreibung-Anzahl entfernen (weil dynamisch wachsend), robuster
      Hintergrund-Download, bessere Controls, bessere Nutzung in Lektionen.
- [ ] **A3 Reels-Player** — Agent läuft. Flüssiges Snapping, Overlay/Controls,
      Doppeltipp-Like, Fortschritt scrubbar, Kuratierung/Filter, Performance.
- [ ] **A4 Settings + App-Aufgeräumtheit + Studium-Menü** — Agent läuft.
      Apple-Niveau: iOS-Settings-Gruppen, konsistente Rows/Touch-Targets ≥44pt,
      größere Studium-Buttons, klare Hierarchie, einheitliche Card/Typo/Spacing.
- [ ] **A5 Widget-Design** — Agent läuft. Modernere Typo-Hierarchie, dezenter
      hochwertiger Hintergrund, nächstes Gebet hervorgehoben, alle Größen sauber.
- [ ] **A6 Hintergrund-Download-Funktion** (Videos/Podcast/Reels) — Teil von A2;
      auf robuste Umsetzung über alle Medien achten.

## B) Content-Ausbau-Loop (Nutzer-Direktive: fehlende Lektionen füllen)

Pro fehlende Lektion die komplette Pipeline. Anforderungen/Format:
`../../podcast/PODCAST-PLAN.md`, `../../podcast/FUTURE-EPISODES.md`, `../../podcast/MEDIEN-PLAN.md`.

- [ ] **B1 Fehlende Podcast-Folgen schreiben** (ep38+) — Agent läuft. Lücken:
      Reihe E kurze Suren (Tafsir-leicht), weitere Madinah-/Wortschatz-Lektionen,
      Aqida/Seerah-Grundlagen. Voll ausgeschrieben im bestehenden Format.
- [ ] **B2 Podcast vertonen** (ElevenLabs, `podcast/scripts` Pipeline) → mp3.
- [ ] **B3 Podcast → Supabase** (`podcasts`-Bucket, `index.json` erweitern) →
      erscheint via RSS auf **Spotify** (Show 033U0teP7zMDXYm3zQ3fje).
- [ ] **B4 Videos rendern** (`video.py` / Tabellen `table_video.py`) → **R2**
      (`upload_videos_r2.py`, `videos/index.json`) + **YouTube** (`youtube_upload.py`).
- [ ] **B5 Reels rendern** (`reel.py`, 1080×1920, ~55s) → **R2**
      (`upload_reels_r2.py`, `reels/index.json`) + lokaler Ordner für Instagram.
- [ ] **B6 App-Integration** — neue Podcasts/Videos/Reels erscheinen automatisch
      über die jeweiligen `index.json`-Contracts; an den passenden Lektionen
      verlinken (PhasePodcast/Video/Table-Cards in `src/app/learn/index.tsx`).

## C) Extern / braucht den User

- [ ] **C1 YouTube-Upload OAuth** — `redirect_uri_mismatch`. User muss in Google
      Cloud Console entweder `http://localhost:8766/` als Weiterleitungs-URI beim
      OAuth-Client eintragen ODER einen **Desktop-App**-Client neu anlegen und mir
      Client-ID+Secret geben. Danach lädt `youtube_upload.py` 37 Videos + 21
      Tabellen in Reihen-Playlisten. Blockiert nichts anderes.
- [ ] **C2 Instagram-Reels** — schnellster Weg: manueller Upload aus dem lokalen
      Reels-Ordner. Graph-API-Automatisierung bräuchte Business-Account + Review
      (später). Plan in `../../podcast/MEDIEN-PLAN.md`.
- [x] **C3 344 Reels Final-Upload nach R2** — fertig, `reels/index.json` = 344 Reels online (2026-07-22).

## D) Bekannte offene Baustellen (aus USER-TODO, kein Blocker für vc32)

- Web-Bundle-Splitting (Metro serialisiert keine getrennten Chunks, Expo 57.0.7).
- WearOS-Tile Kotlin-Kompilierfehler (`PrayerTileService.kt:64`) — eigene Session.
- AGP 9.0 R8-Vollmodus — struktureller Blocker (finalizeDsl zu spät).
- iOS Live Activity (1.26) — braucht iPhone zum Testen.

---

## Deploy-Checkliste vc32

1. Alle A/B-Branches gemerged, `npx tsc --noEmit` + `npx eslint` + `npx jest` grün.
2. `src/lib/locales.test.ts` grün (14-Sprachen-Parität).
3. versionCode/versionName in `app.config.ts` hochziehen.
4. Web-Export + Website-APK (2-Teile-Split, Byte-Identität) → push → Vercel.
5. User testet auf echtem Gerät (Spracherkennung ganze Sure, Video/Reels-Player,
   Settings/Studium, Widgets).
