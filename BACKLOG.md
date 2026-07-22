# Salati — Arbeits-Backlog (Audit + Content-Ausbau)

> Lebendes Dokument. Stand 2026-07-22. Erledigtes → `[x]` mit Beleg.
> Store-/Release-Historie steht in `../../USER-TODO.md`, nicht hier.
> Aktueller Live-Stand Website: **vc31 (1.27.19)** auf www.salati.pro.
> Ziel dieses Durchgangs: alle App-Verbesserungen mergen → **vc32** deployen → User testet.

---

## A) App-Audit & Politur (Nutzer-Feedback-Batch 2026-07-19/22)

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
