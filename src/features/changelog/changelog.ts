// Datenquelle für den "Was ist neu"-Screen (src/app/changelog.tsx).
//
// Sprachabdeckung (User-Entscheidung, siehe Session-Bericht): Texte liegen
// vollständig auf Deutsch + Englisch vor. Für die übrigen 12 App-Sprachen
// gibt es bewusst KEINE separate Übersetzung — getChangelogText() fällt für
// jede Sprache außer 'de' auf Englisch zurück. Grund: 33 Versionen x bis zu
// 4 Einträge x 12 Sprachen wäre reine Fleißarbeit ohne Mehrwert gegenüber
// einem sauberen Englisch-Fallback (bei einer 100%-lokalen Islam-App lesen
// die allermeisten Nutzer ohnehin Englisch als Zweitsprache im Store).
//
// Reihenfolge hier: aufsteigend (älteste zuerst) - der Screen dreht die
// Liste für die Anzeige um (neueste Version oben).

export type ChangelogEntryType = 'feature' | 'improvement' | 'fix';

export interface ChangelogEntry {
  type: ChangelogEntryType;
  de: string;
  en: string;
}

export interface ChangelogVersion {
  version: string;
  /** ISO-Datum (YYYY-MM-DD) */
  date: string;
  entries: ChangelogEntry[];
}

export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '1.0.0',
    date: '2026-07-12',
    entries: [
      {
        type: 'feature',
        de: 'Erstveröffentlichung: Gebetszeiten, Qibla-Kompass, Koran-Reader, islamischer Kalender und Duas – komplett werbefrei',
        en: 'First release: prayer times, Qibla compass, Quran reader, Islamic calendar and duas – completely ad-free',
      },
      {
        type: 'feature',
        de: 'Hadith-Sammlung, erweiterte Einstellungen und ein Moschee-Finder in der Nähe',
        en: 'Hadith collection, advanced settings and a nearby mosque finder',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-12',
    entries: [
      {
        type: 'feature',
        de: 'Neues Lernmodul für die arabische Schrift (Alif-Ba-Kurs)',
        en: 'New learning module for the Arabic alphabet (Alif-Ba course)',
      },
      {
        type: 'feature',
        de: 'Koran-Rezitation zum Anhören und Vorlesefunktion (Text-zu-Sprache)',
        en: 'Quran recitation audio and text-to-speech read-aloud',
      },
      {
        type: 'feature',
        de: 'Quiz-Bereich mit 9 verschiedenen Spielmodi',
        en: 'Quiz hub with 9 different game modes',
      },
      {
        type: 'feature',
        de: 'Hifz-Trainer zum Auswendiglernen und digitaler Tasbih-Zähler',
        en: 'Hifz memorization trainer and digital Tasbih counter',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-13',
    entries: [
      {
        type: 'feature',
        de: 'Gebets-Anleitungen (Guides) und tägliche Weisheiten',
        en: 'Step-by-step prayer guides and daily wisdom quotes',
      },
      { type: 'feature', de: 'Tafsir (Koran-Auslegung) ergänzt', en: 'Tafsir (Quran commentary) added' },
      {
        type: 'improvement',
        de: 'App jetzt auch auf Spanisch und Französisch verfügbar',
        en: 'App now also available in Spanish and French',
      },
      { type: 'feature', de: '30 neue Quizfragen', en: '30 new quiz questions' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-13',
    entries: [
      {
        type: 'feature',
        de: 'Gebets-Tracker, Fasten-Modus für den Ramadan und Khatmah-Leseplan zum Koran-Durchlesen',
        en: 'Prayer tracker, Ramadan fasting mode and Khatmah plan for reading the whole Quran',
      },
      {
        type: 'feature',
        de: 'Zakat-Rechner und die 99 Namen Allahs',
        en: 'Zakat calculator and the 99 Names of Allah',
      },
      {
        type: 'feature',
        de: 'Halal-Finder in der Nähe und Koran-Audio zum Offline-Hören',
        en: 'Nearby halal finder and offline Quran audio downloads',
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-07-15',
    entries: [
      {
        type: 'feature',
        de: 'Neuer Studienbereich: Arabisch-Grammatikkurs',
        en: 'New Study section: Arabic grammar course',
      },
      {
        type: 'feature',
        de: 'Alle 42 Hadithe der Nawawi-40-Sammlung',
        en: 'All 42 hadiths of the Nawawi-40 collection',
      },
      {
        type: 'improvement',
        de: 'Einstufungstest: direkt mit der passenden Lektion starten statt immer bei Lektion 1',
        en: 'Placement test: start at the right lesson instead of always lesson 1',
      },
      {
        type: 'feature',
        de: 'Neuer Kurs für den arabischen Alltagswortschatz',
        en: 'New course for everyday Arabic vocabulary',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-07-15',
    entries: [
      {
        type: 'feature',
        de: 'Kompletter Madinah-Arabisch-Kurs: alle 4 Bücher mit 83 Lektionen für die klassische arabische Grammatik',
        en: 'Complete Madinah Arabic course: all 4 books, 83 lessons of classical Arabic grammar',
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-07-15',
    entries: [
      {
        type: 'improvement',
        de: 'Aqida-Kurs (Glaubenslehre) deutlich vertieft',
        en: 'Aqida (creed) course significantly expanded',
      },
      {
        type: 'feature',
        de: 'Neue Kurse: Gefährten & Gelehrte des Propheten sowie Fiqh der Ehe & Familie',
        en: 'New courses: Companions & Scholars of the Prophet, and Family & Marriage Fiqh',
      },
      {
        type: 'feature',
        de: 'Neuer Erbrechts-Rechner (Mirath) nach islamischem Recht',
        en: 'New Islamic inheritance calculator (Mirath)',
      },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-07-16',
    entries: [
      {
        type: 'feature',
        de: 'Koran-Reader großes Update: Umschrift, isolierte Buchstabenformen, englisches Tafsir, Wort-für-Wort-Übersetzung, farbige Tajweed-Regeln und Volltextsuche',
        en: 'Major Quran reader update: transliteration, isolated letter forms, English tafsir, word-by-word translation, color-coded Tajweed rules and full-text search',
      },
      {
        type: 'feature',
        de: 'Hadith-Bibliothek erweitert (Riyad as-Salihin, Bulugh al-Maram, Al-Adab Al-Mufrad) mit Kapitel-Browsing',
        en: 'Hadith library expanded (Riyad as-Salihin, Bulugh al-Maram, Al-Adab Al-Mufrad) with chapter browsing',
      },
      {
        type: 'feature',
        de: 'Neue Kurse: Charakter/Akhlaq und arabische Dialekte',
        en: 'New courses: Character/Akhlaq and Arabic dialects',
      },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-07-16',
    entries: [
      {
        type: 'improvement',
        de: 'App jetzt optimiert für Tablets und faltbare Geräte',
        en: 'App now optimized for tablets and foldable devices',
      },
      {
        type: 'fix',
        de: 'Bedienungshilfen (Screenreader) an vielen Stellen in der App nachgerüstet',
        en: 'Accessibility (screen reader) support added throughout the app',
      },
      {
        type: 'feature',
        de: 'Impressum und Datenschutzerklärung in der App ergänzt',
        en: 'Legal notice and privacy policy added to the app',
      },
      {
        type: 'fix',
        de: 'Automatischer Dunkelmodus auf der Webseite behoben',
        en: 'Fixed automatic dark mode on the website',
      },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-07-16',
    entries: [
      {
        type: 'feature',
        de: 'Eigene Notizen zu einzelnen Koran-Versen möglich',
        en: 'Personal notes on individual Quran verses',
      },
      {
        type: 'feature',
        de: 'Tägliche Lernserie (Streak) über alle Kurse hinweg',
        en: 'Daily learning streak across all courses',
      },
      {
        type: 'feature',
        de: 'Wiederholungs-Erinnerungen nach der Spaced-Repetition-Methode',
        en: 'Spaced-repetition review reminders',
      },
      { type: 'feature', de: '"Hadith des Tages"', en: '"Hadith of the Day"' },
    ],
  },
  {
    version: '1.8.1',
    date: '2026-07-16',
    entries: [
      {
        type: 'improvement',
        de: 'Webseite komplett neu gestaltet mit Animationen und echten Moschee-Fotos',
        en: 'Website redesigned with animations and real mosque photography',
      },
      {
        type: 'fix',
        de: 'Geteilte Links öffnen jetzt zuverlässig die richtige Seite',
        en: 'Shared links now reliably open the correct page',
      },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-07-16',
    entries: [
      {
        type: 'improvement',
        de: 'Aussprache-Check verbessert: Wort-für-Wort-Feedback und ehrliche Tajweed-Hinweise',
        en: 'Pronunciation check improved: word-by-word feedback and honest Tajweed hints',
      },
      {
        type: 'feature',
        de: 'Koran-Reader neu gestaltet mit übersichtlicherem Kopfbereich',
        en: 'Quran reader redesigned with a cleaner header',
      },
      {
        type: 'feature',
        de: 'Koran-Radio und Hadith-Suche über alle 13 Sammlungen',
        en: 'Quran radio and hadith search across all 13 collections',
      },
    ],
  },
  {
    version: '1.10.0',
    date: '2026-07-17',
    entries: [
      { type: 'feature', de: 'Homescreen-Widgets für Android', en: 'Android home screen widgets' },
      {
        type: 'improvement',
        de: 'Qibla-Kompass und Gebetszeiten-Startseite neu gestaltet',
        en: 'Qibla compass and prayer times home screen redesigned',
      },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-07-17',
    entries: [
      {
        type: 'feature',
        de: 'Gebets-Benachrichtigungen: 7-Tage-Planung mit Ton und Vibration',
        en: 'Prayer notifications: 7-day scheduling with sound and vibration',
      },
      {
        type: 'feature',
        de: 'Fokus-Lesemodus mit warmem Sepia-Papierton für den Koran-Reader',
        en: 'Focus reading mode with warm sepia paper tone for the Quran reader',
      },
      {
        type: 'feature',
        de: 'Morgen- und Abend-Adhkar-Erinnerungen',
        en: 'Morning and evening Adhkar reminders',
      },
      {
        type: 'feature',
        de: 'Gebetszeiten als Kalender exportieren (ICS)',
        en: 'Export prayer times to your calendar (ICS)',
      },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-07-17',
    entries: [
      {
        type: 'feature',
        de: 'Zwei neue Übungsarten: Satz-Puzzle und Paare finden',
        en: 'Two new exercise types: Sentence Puzzle and Matching Pairs',
      },
      {
        type: 'feature',
        de: 'Quiz-Duell: gegen eine zweite Person am selben Gerät antreten',
        en: 'Quiz Duel: compete against a second person on the same device',
      },
      {
        type: 'feature',
        de: 'Mushaf-Seitenansicht mit den 604 klassischen Druckseiten',
        en: 'Mushaf page view with the 604 classic print pages',
      },
    ],
  },
  {
    version: '1.13.0',
    date: '2026-07-17',
    entries: [
      {
        type: 'feature',
        de: 'Salati KI: Islam-Fragen 100% lokal auf dem Gerät beantwortet, ganz ohne Internet',
        en: 'Salati AI: Islamic questions answered 100% on-device, no internet needed',
      },
      {
        type: 'feature',
        de: 'Verse und Gebets-Statistiken als Bild teilen',
        en: 'Share verses and prayer stats as an image',
      },
      {
        type: 'feature',
        de: 'Lesezeichen-Sammlungen: Favoriten, Auswendiglernen, zum Nachdenken',
        en: 'Bookmark collections: favorites, memorizing, reflecting',
      },
    ],
  },
  {
    version: '1.14.0',
    date: '2026-07-17',
    entries: [
      {
        type: 'improvement',
        de: 'Salati KI deutlich schlauer und trifft Antworten präziser',
        en: 'Salati AI significantly smarter and more accurate',
      },
      {
        type: 'feature',
        de: 'Wort antippen im Mushaf zeigt sofort Übersetzung und Umschrift',
        en: 'Tap a word in the Mushaf to instantly see its translation and transliteration',
      },
      {
        type: 'feature',
        de: 'Halal/Haram-Scanner: Barcode scannen und Produkt prüfen',
        en: 'Halal/Haram scanner: scan a barcode to check a product',
      },
    ],
  },
  {
    version: '1.14.1',
    date: '2026-07-17',
    entries: [
      {
        type: 'improvement',
        de: 'Studienbereich neu sortiert nach Kategorien',
        en: 'Study section reorganized by category',
      },
      {
        type: 'feature',
        de: 'Dauerhafte Anzeige der nächsten Gebetszeit als Benachrichtigung (optional)',
        en: 'Persistent next-prayer-time notification (optional)',
      },
      {
        type: 'fix',
        de: 'Eigenes Fehler-Log mit Kopieren-Button für Support-Anfragen',
        en: 'Local error log with a copy button for support requests',
      },
    ],
  },
  {
    version: '1.15.0',
    date: '2026-07-18',
    entries: [
      {
        type: 'feature',
        de: 'Wort-Lexikon: Bedeutung und Tajweed-Grund direkt beim Antippen',
        en: 'Word lexicon: meaning and Tajweed reason right on tap',
      },
      {
        type: 'feature',
        de: 'Streak-Schutz: ein Joker pro Woche rettet die Lernserie',
        en: 'Streak freeze: one joker per week protects your learning streak',
      },
      {
        type: 'feature',
        de: 'Abzeichen-System und thematische Vers-Sammlungen',
        en: 'Achievement badges and thematic verse collections',
      },
      {
        type: 'improvement',
        de: 'Mushaf: Doppelseiten-Ansicht mit Khatmah-Fortschrittsanzeige',
        en: 'Mushaf: two-page view with Khatmah progress tracking',
      },
    ],
  },
  {
    version: '1.15.1',
    date: '2026-07-18',
    entries: [
      {
        type: 'feature',
        de: 'Qada-Zähler für nachzuholende Fastentage',
        en: 'Qada counter for make-up fasting days',
      },
      { type: 'feature', de: 'Jährliche Zakat-Erinnerung', en: 'Annual Zakat reminder' },
      {
        type: 'feature',
        de: "Reise-Modus: Hinweis auf verkürztes/zusammengelegtes Gebet (Qasr/Jam')",
        en: "Travel mode: reminder for shortened/combined prayers (Qasr/Jam')",
      },
      {
        type: 'fix',
        de: 'Screenshot-Galerie auf der Webseite scrollt jetzt wirklich',
        en: 'Screenshot gallery on the website now actually scrolls',
      },
    ],
  },
  {
    version: '1.16.0',
    date: '2026-07-18',
    entries: [
      {
        type: 'feature',
        de: '8 neue Sprachen: Indonesisch, Bengalisch, Persisch, Malaiisch, Urdu, Russisch, Swahili, Paschtu – jetzt 14 Sprachen insgesamt',
        en: '8 new languages: Indonesian, Bengali, Persian, Malay, Urdu, Russian, Swahili, Pashto – now 14 languages in total',
      },
      {
        type: 'improvement',
        de: 'Volle Unterstützung für rechts-nach-links-Sprachen (Arabisch, Urdu, Persisch, Paschtu)',
        en: 'Full right-to-left support (Arabic, Urdu, Persian, Pashto)',
      },
      {
        type: 'improvement',
        de: 'Alle Kurse, Duas und Inhalte in allen 14 Sprachen verfügbar',
        en: 'All courses, duas and content available in all 14 languages',
      },
    ],
  },
  {
    version: '1.16.1',
    date: '2026-07-19',
    entries: [
      {
        type: 'fix',
        de: 'Zurück-Pfeile und Menüs in rechts-nach-links-Sprachen richtig gespiegelt',
        en: 'Back arrows and menus correctly mirrored in right-to-left languages',
      },
      {
        type: 'feature',
        de: 'Salati KI: Themen-Browser und Arabisch-Modus',
        en: 'Salati AI: topic browser and Arabic mode',
      },
      {
        type: 'improvement',
        de: 'Kennzeichnung von KI-Antworten als KI-generiert (keine Fatwa)',
        en: 'AI answers labeled as AI-generated (not a fatwa)',
      },
    ],
  },
  {
    version: '1.17.0',
    date: '2026-07-19',
    entries: [
      {
        type: 'feature',
        de: 'Neues Erststart-Onboarding für neue Nutzer',
        en: 'New first-launch onboarding for new users',
      },
      {
        type: 'improvement',
        de: 'Store-Eintrag aktualisiert mit korrekten Lektions- und Sprachzahlen',
        en: 'Store listing updated with accurate lesson and language counts',
      },
    ],
  },
  {
    version: '1.17.1',
    date: '2026-07-19',
    entries: [
      {
        type: 'fix',
        de: 'Großer Audit: zahlreiche Design- und Bedienungshilfen-Fehler app-weit behoben',
        en: 'Major audit: numerous design and accessibility issues fixed app-wide',
      },
      { type: 'feature', de: '99-Namen-Lernquiz', en: '99 Names learning quiz' },
      {
        type: 'improvement',
        de: 'Tasbih-Zähler erweitert: eigenes Dhikr, Fortschrittsring, Ziel-Vibration',
        en: 'Tasbih counter expanded: custom dhikr, progress ring, goal vibration',
      },
    ],
  },
  {
    version: '1.18.0',
    date: '2026-07-19',
    entries: [
      {
        type: 'feature',
        de: 'Dua-Sammlung fast verdreifacht: jetzt 89 Bittgebete für Wetter, Kleidung, Reise, Krankheit, Familie und mehr',
        en: 'Dua collection nearly tripled: now 89 supplications for weather, clothing, travel, illness, family and more',
      },
    ],
  },
  {
    version: '1.19.0',
    date: '2026-07-19',
    entries: [
      {
        type: 'feature',
        de: 'Themen-Leseplaene: geführte Tages-Reisen zu Themen wie Ramadan-Vorbereitung, Trauer, Prüfungszeit und Versorgung (Rizq)',
        en: 'Thematic reading Journeys: guided day-by-day plans on topics like Ramadan prep, grief, exam time and provision (Rizq)',
      },
    ],
  },
  {
    version: '1.19.1',
    date: '2026-07-20',
    entries: [
      {
        type: 'improvement',
        de: 'Startbildschirm neu geordnet, Kalender-Zugriff vereinfacht',
        en: 'Home screen reorganized, calendar access simplified',
      },
      {
        type: 'feature',
        de: 'Globaler Mini-Player für laufende Rezitationen',
        en: 'Global mini player for ongoing recitations',
      },
      {
        type: 'improvement',
        de: 'Rezitations-Check läuft jetzt nativ auf dem Gerät – schneller und genauer',
        en: 'Recitation check now runs natively on-device – faster and more accurate',
      },
    ],
  },
  {
    version: '1.20.0',
    date: '2026-07-20',
    entries: [
      {
        type: 'feature',
        de: 'Offline-Verwaltung: einzelne Rezitatoren zum Offline-Hören herunterladen und wieder löschen',
        en: 'Offline manager: download individual reciters for offline listening and remove them again',
      },
      { type: 'feature', de: 'Eigenes App-Icon und App-Name', en: 'Custom app icon and app name' },
      {
        type: 'improvement',
        de: 'Studieninhalte laden schneller beim App-Start',
        en: 'Study content now loads faster on app start',
      },
    ],
  },
  {
    version: '1.20.1',
    date: '2026-07-20',
    entries: [
      {
        type: 'improvement',
        de: 'Einstellungen und Gebetszeiten-Bildschirm visuell überarbeitet (Icons, Gruppierung)',
        en: 'Settings and prayer times screen visually reworked (icons, grouping)',
      },
      {
        type: 'feature',
        de: 'Suren-übergreifende Wiedergabe im Koran-Reader',
        en: 'Cross-Surah continuous playback in the Quran reader',
      },
    ],
  },
  {
    version: '1.21.0',
    date: '2026-07-21',
    entries: [
      {
        type: 'feature',
        de: 'Fortschritt exportieren und importieren – Backup ohne Cloud-Zwang',
        en: 'Export and import your progress – backup without a cloud account',
      },
      { type: 'feature', de: 'Verse und Hadithe als Bild teilen', en: 'Share verses and hadiths as an image' },
      {
        type: 'feature',
        de: 'Neue Speicherverwaltung: sehen und löschen, was wie viel Platz braucht',
        en: "New storage management screen: see and clear what's taking up space",
      },
    ],
  },
  {
    version: '1.22.0',
    date: '2026-07-21',
    entries: [
      {
        type: 'feature',
        de: 'Suhoor-/Iftar-Countdown-Karte für den Ramadan',
        en: 'Suhoor/Iftar countdown card for Ramadan',
      },
      {
        type: 'feature',
        de: 'Zakat-Rechner nutzt jetzt den aktuellen Goldpreis live',
        en: 'Zakat calculator now uses the live gold price',
      },
      {
        type: 'feature',
        de: 'Neue app-weite Suche über Koran, Hadithe, Duas und Kurse',
        en: 'New app-wide search across Quran, hadiths, duas and courses',
      },
    ],
  },
  {
    version: '1.23.0',
    date: '2026-07-21',
    entries: [
      { type: 'feature', de: 'Zakat al-Fitr-Rechner', en: 'Zakat al-Fitr calculator' },
      {
        type: 'feature',
        de: "Neue Erinnerungen: Jumu'ah, Sunnah-Gebete (Duha/Tahajjud/Witr) und vor dem Adhan",
        en: "New reminders: Jumu'ah, Sunnah prayers (Duha/Tahajjud/Witr) and pre-Adhan",
      },
      {
        type: 'feature',
        de: 'Wochenübersicht der Gebetszeiten und mehrere gespeicherte Orte',
        en: 'Weekly prayer times table and multiple saved locations',
      },
    ],
  },
  {
    version: '1.24.0',
    date: '2026-07-21',
    entries: [
      {
        type: 'feature',
        de: 'Tasbih: Tagesziel mit Fortschrittsbalken und 7-Tage-Verlauf',
        en: 'Tasbih: daily goal with progress bar and 7-day history',
      },
      { type: 'feature', de: 'Taraweeh-Tracker für den Ramadan', en: 'Taraweeh tracker for Ramadan' },
      {
        type: 'feature',
        de: 'Hijri-Datumsumrechner und Entfernungsanzeige zur Kaaba beim Qibla-Kompass',
        en: 'Hijri date converter and distance-to-Kaaba display on the Qibla compass',
      },
      {
        type: 'feature',
        de: 'Geführter Dhikr-Zähler nach dem Gebet',
        en: 'Guided Dhikr counter after prayer',
      },
    ],
  },
  {
    version: '1.25.0',
    date: '2026-07-21',
    entries: [
      {
        type: 'feature',
        de: '"Erste Schritte"-Leitfaden für Konvertiten und Neu-Muslime',
        en: '"First Steps" guide for converts and new Muslims',
      },
      {
        type: 'feature',
        de: 'iOS Live Activity: Gebets-Countdown auf Sperrbildschirm und Dynamic Island',
        en: 'iOS Live Activity: prayer countdown on the lock screen and Dynamic Island',
      },
      {
        type: 'feature',
        de: 'App-Shortcuts (Android) und Quick Actions (iOS) für Gebet, Qibla und Radio',
        en: 'App shortcuts (Android) and quick actions (iOS) for prayer, Qibla and radio',
      },
    ],
  },
  {
    version: '1.25.1',
    date: '2026-07-21',
    entries: [
      {
        type: 'fix',
        de: 'Tajweed-Farben jetzt auch für farbenblinde Nutzer klar unterscheidbar',
        en: 'Tajweed colors now clearly distinguishable for colorblind users',
      },
      {
        type: 'feature',
        de: 'Neue Benachrichtigungs-Übersicht über alle Erinnerungs-Typen',
        en: 'New notifications overview across all reminder types',
      },
      {
        type: 'fix',
        de: 'Diverse RTL-Layout-Fixes und kleinere Korrekturen',
        en: 'Various RTL layout fixes and small corrections',
      },
    ],
  },
  {
    version: '1.26.0',
    date: '2026-07-21',
    entries: [
      {
        type: 'feature',
        de: 'Live Activity: Das nächste Gebet erscheint jetzt direkt auf dem Sperrbildschirm und in der Dynamic Island',
        en: 'Live Activity: your next prayer now appears right on the Lock Screen and in the Dynamic Island',
      },
    ],
  },
  {
    version: '1.27.0',
    date: '2026-07-21',
    entries: [
      {
        type: 'improvement',
        de: 'Genauere Rezitations-Erkennung: Koran-optimiertes Sprachmodell (wie bei Tarteel) und deutlich schnellere Auswertung',
        en: 'More accurate recitation check: a Quran-optimized speech model (like Tarteel) and much faster results',
      },
      {
        type: 'improvement',
        de: 'Überarbeiteter Aufsage-Screen mit größerem, klarerem Aufnahme-Button und übersichtlicherem Aufbau',
        en: 'Redesigned recitation screen with a larger, clearer record button and a cleaner layout',
      },
    ],
  },
  {
    version: '1.27.1',
    date: '2026-07-21',
    entries: [
      {
        type: 'fix',
        de: 'Rezitations-Erkennung ließ sich nicht starten („nicht verfügbar") — das Koran-Sprachmodell lädt jetzt wieder korrekt',
        en: 'Recitation check failed to start ("unavailable") — the Quran speech model now loads correctly again',
      },
    ],
  },
  {
    version: '1.27.2',
    date: '2026-07-21',
    entries: [
      {
        type: 'improvement',
        de: 'Rezitations-Erkennung genauer (volle Modell-Präzision) und einfacher: ein Knopf, stoppt automatisch, wenn du fertig bist',
        en: 'More accurate recitation check (full model precision) and simpler: one button that stops automatically when you finish',
      },
    ],
  },
];

/** Neueste Version zuerst - für die Anzeige im Changelog-Screen. */
export function changelogNewestFirst(): ChangelogVersion[] {
  return [...CHANGELOG].reverse();
}

/** Höchste (letzte) Versionsnummer im Changelog. */
export const LATEST_CHANGELOG_VERSION = CHANGELOG[CHANGELOG.length - 1].version;

/**
 * Liefert den Anzeigetext eines Eintrags für die aktuelle Sprache.
 * Siehe Kommentar am Dateianfang: nur 'de' hat einen eigenen Text, alle
 * anderen 13 App-Sprachen (inkl. 'en') fallen auf Englisch zurück.
 */
export function getChangelogText(entry: ChangelogEntry, locale: string): string {
  return locale === 'de' ? entry.de : entry.en;
}
