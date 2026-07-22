import { DASHBOARD_CARD_IDS, type DashboardCardId } from '@/features/dashboard/dashboardCards';
import { DEFAULT_DIALECT_GROUP_ORDER, type DialectGroupId } from '@/features/study/dialectOrder';
import type { ZakatCurrency } from '@/features/zakat/calc';
import type { WidgetTheme } from '@/widgets/widgetTheme';
import type { Locale } from '@/lib/locale-detect';

export interface LocationSetting {
  lat: number;
  lon: number;
  label: string;
  city: string;
  country: string;
}

/**
 * Ein vom Nutzer gespeicherter Ort (z. B. "Zuhause", "Arbeit") — unabhängig
 * vom aktuell AKTIVEN `location`. Erweitert LocationSetting nur um eine
 * stabile `id` (Auswahl/Löschen unabhängig vom austauschbaren Namen) und den
 * frei vergebenen `name`. Reine Verwaltungslogik in features/settings/
 * savedLocations.ts; der aktive Ort bleibt weiterhin `AppSettings.location`.
 */
export interface SavedLocation extends LocationSetting {
  id: string;
  name: string;
}

export interface NotificationToggles {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

/**
 * Zeitbudget pro Tag in Minuten — daraus leiten sich Tagesziel (Lektionen)
 * und das Kontingent der Wiederholungs-Session ab. Wer 4 h investiert, lernt
 * so schnell wie möglich; wer 10 Minuten hat, bekommt ein schaffbares Ziel.
 */
export type DailyMinutes = 10 | 20 | 45 | 90 | 240;

export interface TimeBudget {
  /** Ziel: bestandene Lektionen pro Tag */
  lessonsPerDay: number;
  /** Obergrenze Fragen je Wiederholungs-Session */
  reviewQuestions: number;
}

export const TIME_BUDGETS: Record<DailyMinutes, TimeBudget> = {
  10: { lessonsPerDay: 1, reviewQuestions: 6 },
  20: { lessonsPerDay: 2, reviewQuestions: 12 },
  45: { lessonsPerDay: 5, reviewQuestions: 20 },
  90: { lessonsPerDay: 10, reviewQuestions: 30 },
  240: { lessonsPerDay: 25, reviewQuestions: 60 },
};

export const DAILY_MINUTES_OPTIONS: DailyMinutes[] = [10, 20, 45, 90, 240];

export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5;

export const PLAYBACK_SPEED_OPTIONS: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5];

/** Stunde (0-23, lokale Geräte-Zeit) für die tägliche Wiederholungs-Erinnerung. */
export type ReviewReminderHour = 9 | 14 | 18 | 21;

export const REVIEW_REMINDER_HOUR_OPTIONS: ReviewReminderHour[] = [9, 14, 18, 21];

/**
 * Stunde (0-23, lokale Geräte-Zeit) für die tägliche Vers/Hadith-Erinnerung
 * (features/verseOfDay). Default 8 Uhr: liegt in praktisch allen Breitengraden/
 * Jahreszeiten sicher nach Fajr, aber noch vor dem für die meisten Nutzer
 * hektischen Start in den Arbeitstag — ein ruhiger Moment für einen kurzen
 * Impuls. Bewusst KEIN direkter Fajr-Anker: die Gebetszeiten-Notifications
 * (prayer-times/notifications.ts) planen bereits relativ zur täglich neu
 * berechneten Fajr-Zeit — dieselbe Kopplung hier hätte eine zusätzliche
 * Abhängigkeit von Standort/Berechnungsmethode/Madhab bedeutet, nur um am
 * Ende auch wieder auf eine feste Uhrzeit pro Tag hinauszulaufen.
 */
export type VerseOfDayHour = 7 | 8 | 9 | 10;

export const VERSE_OF_DAY_HOUR_OPTIONS: VerseOfDayHour[] = [7, 8, 9, 10];

/**
 * Minuten VOR der eigentlichen Gebetszeit-Notification (features/prayer-times/
 * preAdhanReminder.ts) — z. B. um sich rechtzeitig für die Gebetswaschung
 * (Wudu) oder den Weg zur Moschee bereitzumachen. Wählbar statt fest, weil
 * der sinnvolle Vorlauf stark vom Nutzer abhängt (zuhause vs. Pendler).
 */
export type PreAdhanOffsetMinutes = 10 | 15 | 20;

export const PRE_ADHAN_OFFSET_OPTIONS: PreAdhanOffsetMinutes[] = [10, 15, 20];

export interface AppSettings {
  location: LocationSetting;
  method: number;
  school: 0 | 1;
  quranReciter: string;
  quranTranslation: string;
  /** Zweite, optional zusätzlich einblendbare Übersetzung für den Interpretations-
   * Vergleich (Vers-Interpretations-Vergleich) — unabhängig von quranTranslation wählbar. */
  quranTranslation2: string;
  /** Mehrere gleichzeitig anzeigbare Tafsir-Editionen (max. 3, siehe TAFSIR_MAX_SIMULTANEOUS). */
  quranTafsirs: string[];
  language: Locale;
  hadithLanguage: 'ar' | 'en' | 'tr';
  timeFormat: '24h' | '12h';
  quranFontSize: 'small' | 'medium' | 'large' | 'xlarge';
  /** Wiedergabegeschwindigkeit für Vers-/Sure-Rezitation (1 = normal). */
  quranPlaybackSpeed: PlaybackSpeed;
  themeOverride: 'auto' | 'light' | 'dark';
  notificationsEnabled: NotificationToggles;
  /** Tägliches Lern-Zeitbudget in Minuten (bestimmt Tagesziel + Review-Umfang) */
  dailyMinutes: DailyMinutes;
  /** true = alle Lektionen frei wählbar (kein sequenzielles Freischalten) */
  freeUnlock: boolean;
  /** true = Transliteration (lateinische Umschrift) bei Wörtern/Vokabeln anzeigen */
  showTransliteration: boolean;
  /** true = Wörter zusätzlich in isolierten Buchstabenformen anzeigen (Einprägehilfe) */
  showIsolatedLetters: boolean;
  /** true = tägliche lokale Erinnerung, sobald fällige Wiederholungen vorhanden sind */
  reviewReminderEnabled: boolean;
  /** Uhrzeit der täglichen Wiederholungs-Erinnerung (lokale Geräte-Zeit) */
  reviewReminderHour: ReviewReminderHour;
  /** Bevorzugte Übungsart in Lektions-Quizzen: gemischt / mehr Hören / mehr Lesen */
  exerciseStyle: ExerciseStyle;
  /** false = Mikrofon-/Sprechübungen überall ausblenden ("kann gerade nicht sprechen") */
  speechExercisesEnabled: boolean;
  /** Welches on-device-Sprachmodell für den Rezitations-Check geladen wird —
   * Kompromiss Genauigkeit vs. Download/RAM (s. whisperModel.ts RECITATION_MODELS). */
  recitationModel: 'base' | 'turbo';
  /** Wie Gebets-Benachrichtigungen zugestellt werden (Ton/Vibration/Heads-up) */
  notificationPrefs: NotificationPrefs;
  /** Sepia-Papierton im Koran-Reader (augenschonend, wie E-Reader) */
  readerSepia: boolean;
  /** Schriftstil der Mushaf-Seitenansicht (Madina-Uthmani oder IndoPak) */
  mushafStyle: 'uthmani' | 'indopak';
  /** Tägliche Morgen-/Abend-Adhkar-Erinnerungen */
  adhkarMorningEnabled: boolean;
  adhkarMorningHour: AdhkarMorningHour;
  adhkarEveningEnabled: boolean;
  adhkarEveningHour: AdhkarEveningHour;
  /** Welcher volle Adhan im Gebetszeiten-Screen abgespielt wird (s. AzanChoice). */
  azanChoice: AzanChoice;
  /**
   * Heimatort für den Reise-Modus (Qasr/Jam'-Hinweis) — unabhängig vom
   * aktuell aktiven `location`, das sich bei einer Reise ändert. Wird beim
   * ersten Laden der Einstellungen einmalig auf den damals aktiven Standort
   * gesetzt (siehe SettingsProvider) und bleibt danach fix, bis der Nutzer
   * ihn in den Einstellungen explizit neu setzt.
   */
  homeLocation: LocationSetting | null;
  /** true = Qasr/Jam'-Hinweis im Gebetszeiten-Screen anzeigen, sobald >85 km vom Heimatort entfernt. */
  travelModeEnabled: boolean;
  /**
   * Nutzer-gewählte Reihenfolge der 4 Dialektgruppen im "Arabische Dialekte"-
   * Kurs (Maghrebinisch/Levantinisch/Golf-Arabisch/Ägyptisch). Bestimmt nur
   * die Anzeigereihenfolge im Kurs-Screen, siehe features/study/dialectOrder.ts.
   */
  dialectGroupOrder: DialectGroupId[];
  /** true = Iqama-Zeit (Adhan + Karenzzeit) zusätzlich im Gebetszeiten-Screen anzeigen */
  iqamaEnabled: boolean;
  /** Konfigurierbare Karenzzeit je Gebet zwischen Adhan-Ruf und Iqama (Minuten) */
  iqamaOffsets: IqamaOffsets;
  /** true = tägliche lokale Erinnerung mit rotierendem, kuratiertem Vers/Hadith
   * (features/verseOfDay). Default false — opt-in wie reviewReminder/adhkar,
   * tägliche Notifications sind nicht für jeden gewünscht. */
  verseOfDayReminderEnabled: boolean;
  /** Uhrzeit der täglichen Vers/Hadith-Erinnerung (lokale Geräte-Zeit). */
  verseOfDayReminderHour: VerseOfDayHour;
  /** true = freitägliche Jumu'ah-Erinnerung inkl. Sunnah-Hinweis auf Sure
   * Al-Kahf (features/prayer-times/jumuahReminder.ts). Default false. */
  jumuahReminderEnabled: boolean;
  /** true = optionale Erinnerung ans Duha-Gebet (Vormittag, nach Sonnenaufgang). */
  sunnahDuhaEnabled: boolean;
  /** true = optionale Erinnerung ans Tahajjud-Gebet (spät nachts, vor Fajr). */
  sunnahTahajjudEnabled: boolean;
  /** true = optionale Erinnerung ans Witr-Gebet (nach Isha). */
  sunnahWitrEnabled: boolean;
  /** true = zusätzliche Erinnerung X Minuten vor jeder aktivierten Gebetszeit-
   * Notification (features/prayer-times/preAdhanReminder.ts). Default false. */
  preAdhanReminderEnabled: boolean;
  /** Vorlauf der Pre-Adhan-Erinnerung in Minuten. */
  preAdhanReminderOffset: PreAdhanOffsetMinutes;
  /**
   * Vom Nutzer gespeicherte Orte (z. B. "Zuhause", "Arbeit") zum schnellen
   * Wechseln ohne erneute Stadtsuche — der AKTIVE Ort bleibt `location`,
   * unverändert. Siehe features/settings/savedLocations.ts.
   */
  savedLocations: SavedLocation[];
  /** true = wöchentliche lokale Erinnerung mit kurzem Rückblick (Lektionen +
   * volle Gebetstage der letzten 7 Tage, features/weeklySummary). Fester
   * Termin Sonntagabend 20 Uhr (s. Begründung in weeklySummary/notifications.ts).
   * Default false — Opt-in wie reviewReminder/verseOfDay/adhkar. */
  weeklySummaryReminderEnabled: boolean;
  /** Währung für den Zakat-Rechner (features/zakat) — bestimmt, in welcher
   * Währung der Live-/Referenz-Goldpreis vorgeschlagen wird und in welcher
   * Währung die eingegebenen Vermögenswerte implizit gemeint sind. Default
   * EUR (Mehrwährungs-Erweiterung 2026-07-21, siehe ZAKAT_CURRENCIES). */
  zakatCurrency: ZakatCurrency;
  /** true = einmalige saisonale Erinnerung ein paar Tage vor Eid al-Adha,
   * das Opfertier (Udhiyah/Qurbani) zu organisieren (features/udhiyah).
   * Default false — Opt-in wie alle anderen optionalen Erinnerungen, nicht
   * jeder Nutzer verrichtet Udhiyah. */
  udhiyahReminderEnabled: boolean;
  /**
   * Nutzer-gewählte Reihenfolge der Home-Dashboard-Karten (Hero/Ramadan-
   * Countdown/Reise-Banner/Gebetszeiten-Tabelle, siehe components/
   * prayer-times-screen.tsx). Siehe features/dashboard/dashboardCards.ts.
   */
  dashboardCardOrder: DashboardCardId[];
  /** Ausgeblendete Dashboard-Karten (nie die in DASHBOARD_LOCKED_CARDS). */
  dashboardHiddenCards: DashboardCardId[];
  /**
   * Farbthema der Android-Homescreen-Widgets (dark/light/transparent/black/
   * white/purple/orange, siehe src/widgets/widgetTheme.ts). Der Headless-
   * Widget-Handler liest diese Einstellung beim Rendern und wendet sie auf
   * ALLE platzierten Widgets an — die Änderung wird beim nächsten Widget-
   * Update sichtbar. Nur Android; auf iOS ohne Wirkung (eigene Widgets).
   */
  widgetTheme: WidgetTheme;
}

export interface NotificationPrefs {
  sound: boolean;
  vibrate: boolean;
  /** Android: Importance MAX — Banner erscheint über anderen Apps */
  headsUp: boolean;
  /**
   * Android-only: dauerhafte, nicht wegwischbare Notification mit dem
   * nächsten Gebet + Uhrzeit (Notification.isOngoing). Kein echter
   * sekündlich tickender Countdown — expo-notifications exponiert Androids
   * Chronometer-Style nicht; eine feste Uhrzeit ist die ehrliche Alternative.
   * Default false: eine dauerhafte Notification ist aufdringlich, bewusst
   * Opt-in statt Standard.
   */
  ongoingCountdown: boolean;
  /**
   * iOS-only: Live Activity ("nächstes Gebet") auf Sperrbildschirm/Dynamic
   * Island — Pendant zu ongoingCountdown oben, s. live-activity.ios.tsx.
   * Gleiche Begründung für den Default false: eine dauerhaft sichtbare
   * Live Activity ist aufdringlich, bewusst Opt-in statt Standard.
   */
  liveActivity: boolean;
}

/**
 * Fünf vom Nutzer bereitgestellte Adhan-Aufnahmen (voller Ruf, mehrere
 * Minuten lang). System-Benachrichtigungstöne müssen kurz und in einem
 * bestimmten Format sein (iOS: unter 30s, AIFF/WAV/CAF — MP3 wird von
 * Apple für Notification-Sounds gar nicht akzeptiert; Android ist zwar
 * toleranter, aber ein mehrminütiger "Klingelton" ist dort ebenfalls
 * unüblich/technisch aufwändig). Der volle Adhan spielt deshalb BEWUSST
 * in der App (Gebetszeiten-Screen + bei Öffnen der Benachrichtigung),
 * die System-Benachrichtigung selbst bleibt ein kurzer Standardton.
 */
export type AzanChoice = 'default' | 'azan8' | 'azan9' | 'azan12' | 'azan14' | 'azan20';
export const AZAN_CHOICES: AzanChoice[] = ['default', 'azan8', 'azan9', 'azan12', 'azan14', 'azan20'];

export type AdhkarMorningHour = 5 | 6 | 7 | 8;
export type AdhkarEveningHour = 17 | 18 | 19 | 20;
export const ADHKAR_MORNING_HOURS: AdhkarMorningHour[] = [5, 6, 7, 8];
export const ADHKAR_EVENING_HOURS: AdhkarEveningHour[] = [17, 18, 19, 20];

export type ExerciseStyle = 'mixed' | 'audio' | 'reading';

/** Karenzzeit zwischen Adhan-Ruf und Iqama (Beginn des Gemeinschaftsgebets), in Minuten, pro Gebet. */
export interface IqamaOffsets {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export const IQAMA_OFFSET_OPTIONS: number[] = [5, 10, 15, 20, 25, 30];

// Default: Berlin — deckungsgleich mit dem Default in apps/device/src/components/SalatiDashboard.tsx
export const DEFAULT_SETTINGS: AppSettings = {
  location: { lat: 52.52, lon: 13.405, label: 'Berlin, Deutschland', city: 'Berlin', country: 'DE' },
  method: 13, // Diyanet — Default in apps/device
  school: 0, // Shafi/Maliki/Hanbali
  quranReciter: 'ar.alafasy',
  quranTranslation: 'de.bubenheim',
  quranTranslation2: 'en.sahih', // zweite Vergleichs-Übersetzung, standardmäßig ausgeblendet
  quranTafsirs: ['qc.169'], // Ibn Kathir (EN) — Default-Sprache ist de, siehe BEST_TAFSIRS
  language: 'de',
  hadithLanguage: 'en',
  timeFormat: '24h',
  quranFontSize: 'medium',
  quranPlaybackSpeed: 1,
  themeOverride: 'auto',
  notificationsEnabled: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  dailyMinutes: 20,
  freeUnlock: false,
  showTransliteration: true,
  showIsolatedLetters: false,
  reviewReminderEnabled: false,
  reviewReminderHour: 18,
  exerciseStyle: 'mixed',
  speechExercisesEnabled: true,
  // Standard = base = tarteel-ai/whisper-base-ar-quran (Koran-Finetune, GGML
  // f16, 148 MB). Perfekte Wahl fürs Projekt: Koran-spezialisiert, on-device,
  // privat, läuft flüssig auf jedem Handy — mit der Alignment-Methode
  // (initialPrompt-Conditioning, s. speech.ts) die eigentliche Tarteel-Parität.
  // large-v3 (1,08 GB) bleibt als optionales „Maximum" wählbar, ist als
  // generisches Modell aber nicht automatisch koran-genauer und langsamer.
  recitationModel: 'base',
  notificationPrefs: { sound: true, vibrate: true, headsUp: true, ongoingCountdown: false, liveActivity: false },
  azanChoice: 'default',
  readerSepia: false,
  mushafStyle: 'uthmani',
  adhkarMorningEnabled: false,
  adhkarMorningHour: 7,
  adhkarEveningEnabled: false,
  adhkarEveningHour: 18,
  homeLocation: null,
  travelModeEnabled: true,
  dialectGroupOrder: DEFAULT_DIALECT_GROUP_ORDER,
  iqamaEnabled: false,
  // Übliche Moschee-Praxis: Fajr/Dhuhr/Asr/Isha 15-20 Min. Karenzzeit,
  // Maghrib deutlich kürzer (kurzes Zeitfenster bis Isha).
  iqamaOffsets: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 10, isha: 15 },
  verseOfDayReminderEnabled: false,
  verseOfDayReminderHour: 8,
  jumuahReminderEnabled: false,
  sunnahDuhaEnabled: false,
  sunnahTahajjudEnabled: false,
  sunnahWitrEnabled: false,
  preAdhanReminderEnabled: false,
  preAdhanReminderOffset: 15,
  savedLocations: [],
  weeklySummaryReminderEnabled: false,
  zakatCurrency: 'EUR',
  udhiyahReminderEnabled: false,
  dashboardCardOrder: DASHBOARD_CARD_IDS,
  dashboardHiddenCards: [],
  widgetTheme: 'dark',
};

export const SETTINGS_STORAGE_KEY = 'salatibox:settings';
