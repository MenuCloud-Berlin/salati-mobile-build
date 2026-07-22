import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SwitchRow } from '@/components/settings/switch-row';
import { SettingsSearchBar } from '@/components/settings/search-bar';
import { azanSource } from '@/features/prayer-times/azan';
import { markBatteryHintShown, wasBatteryHintShown } from '@/features/prayer-times/battery-hint';
import { checkExactAlarmPermission } from '@/features/prayer-times/exact-alarm';
import { formatErrorReport, getErrorLog } from '@/lib/errorLog';
import { useSsrSafeAudioPlayer } from '@/lib/ssrSafeAudio';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { EmptyState } from '@/components/empty-state';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { RECITATION_MODELS } from '@/features/hifz/whisperModel';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { nominatimResultToLocation, searchCity, type NominatimResult } from '@/features/location/nominatim';
import {
  addSavedLocation,
  isActiveSavedLocation,
  removeSavedLocation,
} from '@/features/settings/savedLocations';
import { EditionPicker, editionDisplayName } from '@/features/quran/EditionPicker';
import { useQueryClient } from '@tanstack/react-query';

import { BEST_TAFSIRS, BEST_TRANSLATIONS, RECOMMENDED_RECITERS, RECOMMENDED_TRANSLATIONS, fetchSurahReading } from '@/features/quran/api';
import { rescheduleAdhkarReminders } from '@/features/duas/adhkarNotifications';
import { rescheduleVerseOfDayReminder } from '@/features/verseOfDay/notifications';
import { rescheduleWeeklySummary } from '@/features/weeklySummary/notifications';
import { rescheduleUdhiyahReminder } from '@/features/udhiyah/notifications';
import { useAudioEditions, useTranslationEditions } from '@/features/quran/hooks';
import {
  countDownloadedSurahs,
  deleteFullMushafAudio,
  listDownloadedReciters,
  QURAN_SURAH_COUNT,
  useFullMushafDownload,
  type DownloadedReciterPack,
} from '@/features/quran/offline-audio';
import {
  APP_ICON_VARIANTS,
  appIconNameSwitchSupported,
  appIconSupported,
  getCurrentAppIcon,
  setAppIcon,
  type AppIconVariant,
} from '@/features/settings/app-icon';
import {
  applyBackupData,
  collectBackupData,
  parseBackupFile,
  readBackupFile,
  writeBackupFile,
  type BackupData,
} from '@/features/settings/backup';
import { METHODS, SCHOOLS } from '@/features/settings/methods';
import { useSettings } from '@/features/settings/store';
import {
  ADHKAR_EVENING_HOURS,
  ADHKAR_MORNING_HOURS,
  AZAN_CHOICES,
  DAILY_MINUTES_OPTIONS,
  IQAMA_OFFSET_OPTIONS,
  PRE_ADHAN_OFFSET_OPTIONS,
  REVIEW_REMINDER_HOUR_OPTIONS,
  VERSE_OF_DAY_HOUR_OPTIONS,
  type IqamaOffsets,
  type LocationSetting,
  type NotificationToggles,
} from '@/features/settings/types';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';
import { isRtlLocale } from '@/lib/locale-detect';
import type { Locale } from '@/lib/locale-detect';
import { refreshAllWidgets } from '@/widgets/refresh';
import { WIDGET_THEME_KEYS } from '@/widgets/widgetTheme';

// Sprach-Labels bewusst in der jeweiligen Sprache (Endonym), nicht übersetzt.
const LANGUAGES: { id: Locale; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
  { id: 'tr', label: 'Türkçe' },
  { id: 'ar', label: 'العربية' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'id', label: 'Bahasa Indonesia' },
  { id: 'bn', label: 'বাংলা' },
  { id: 'fa', label: 'فارسی' },
  { id: 'ms', label: 'Bahasa Melayu' },
  { id: 'ur', label: 'اردو' },
  { id: 'ru', label: 'Русский' },
  { id: 'sw', label: 'Kiswahili' },
  { id: 'ps', label: 'پښتو' },
];

const PRAYER_TOGGLE_LABELS: { id: keyof NotificationToggles; label: string }[] = [
  { id: 'fajr', label: 'Fajr' },
  { id: 'dhuhr', label: 'Dhuhr' },
  { id: 'asr', label: 'Asr' },
  { id: 'maghrib', label: 'Maghrib' },
  { id: 'isha', label: 'Isha' },
];

const HADITH_LANGUAGES: { id: 'ar' | 'en' | 'tr'; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'tr', label: 'Türkçe' },
  { id: 'ar', label: 'العربية' },
];

const TIME_FORMATS: { id: '24h' | '12h'; labelKey: string }[] = [
  { id: '24h', labelKey: 'settings.format24' },
  { id: '12h', labelKey: 'settings.format12' },
];

const FONT_SIZES: { id: 'small' | 'medium' | 'large' | 'xlarge'; labelKey: string }[] = [
  { id: 'small', labelKey: 'settings.fontSmall' },
  { id: 'medium', labelKey: 'settings.fontMedium' },
  { id: 'large', labelKey: 'settings.fontLarge' },
  { id: 'xlarge', labelKey: 'settings.fontXLarge' },
];

const THEME_OPTIONS: { id: 'auto' | 'light' | 'dark'; labelKey: string }[] = [
  { id: 'auto', labelKey: 'settings.themeAuto' },
  { id: 'light', labelKey: 'settings.themeLight' },
  { id: 'dark', labelKey: 'settings.themeDark' },
];

// Such-Index für die Live-Filterung: bildet die gerenderte Reihenfolge der
// Gruppen und Sektionen 1:1 ab. `id` ist der i18n-Schlüssel des Sektions-Titels
// (identisch zum an <Section label=…> übergebenen Titel) und dient zugleich als
// durchsuchbarer Begriff. `keys` sind i18n-Schlüssel (bzw. reine Literale wie
// Gebetsnamen) — sie werden zur Laufzeit via t() in die AKTUELLE Sprache
// übersetzt und dann gegen die Suchanfrage geprüft, damit die Suche in jeder
// Sprache die tatsächlich angezeigten Labels trifft. Trifft eine Sektion, legt
// der Provider ihren übersetzten Titel (t(id)) + den Gruppentitel ins Sichtbar-
// Set; Section/GroupHeader lesen das per Context und rendern sich sonst zu null.
type SearchGroup = { group: string; sections: { id: string; keys: string[] }[] };
const SETTINGS_SEARCH_INDEX: SearchGroup[] = [
  {
    group: 'settings.groups.prayer',
    sections: [
      { id: 'settings.location', keys: ['settings.location', 'settings.useMyLocation', 'settings.searchCity', 'settings.savedLocations.title', 'settings.savedLocations.saveCurrent'] },
      { id: 'settings.travel.title', keys: ['settings.travel.title', 'settings.travel.enable', 'settings.travel.setHome'] },
      { id: 'settings.method', keys: ['settings.method'] },
      { id: 'settings.asrSchool', keys: ['settings.asrSchool', 'settings.asrEarlier', 'settings.asrLater'] },
      { id: 'settings.iqama.title', keys: ['settings.iqama.title', 'settings.iqama.enable'] },
      { id: 'settings.timeFormat', keys: ['settings.timeFormat', 'settings.format24', 'settings.format12'] },
    ],
  },
  {
    group: 'settings.groups.notifications',
    sections: [
      { id: 'settings.notificationsOverview.navLabel', keys: ['settings.notificationsOverview.navLabel', 'settings.notificationsOverview.navHint'] },
      { id: 'settings.notifications', keys: ['settings.notifications', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'settings.notifPrefs.sound', 'settings.notifPrefs.vibrate', 'settings.notifPrefs.headsUp'] },
      { id: 'settings.lateNotif.title', keys: ['settings.lateNotif.title', 'settings.lateNotif.exactAlarm', 'settings.lateNotif.battery'] },
      { id: 'settings.azan.title', keys: ['settings.azan.title'] },
      { id: 'settings.preAdhan.title', keys: ['settings.preAdhan.title', 'settings.preAdhan.enable'] },
      { id: 'settings.adhkar.title', keys: ['settings.adhkar.title', 'settings.adhkar.morning', 'settings.adhkar.evening'] },
      { id: 'settings.reviewReminder.title', keys: ['settings.reviewReminder.title', 'settings.reviewReminder.enable'] },
      { id: 'settings.verseOfDay.title', keys: ['settings.verseOfDay.title', 'settings.verseOfDay.enable'] },
      { id: 'settings.jumuah.title', keys: ['settings.jumuah.title', 'settings.jumuah.enable'] },
      { id: 'settings.sunnah.title', keys: ['settings.sunnah.title', 'settings.sunnah.duha', 'settings.sunnah.tahajjud', 'settings.sunnah.witr'] },
      { id: 'settings.weeklySummary.title', keys: ['settings.weeklySummary.title', 'settings.weeklySummary.enable'] },
      { id: 'settings.udhiyah.title', keys: ['settings.udhiyah.title', 'settings.udhiyah.enable'] },
    ],
  },
  {
    group: 'settings.groups.quran',
    sections: [
      { id: 'nav.quran', keys: ['nav.quran', 'quran.chooseReciter', 'quran.chooseTranslation'] },
      { id: 'settings.fontSize', keys: ['settings.fontSize', 'settings.fontSmall', 'settings.fontMedium', 'settings.fontLarge', 'settings.fontXLarge'] },
      { id: 'settings.offlinePack.title', keys: ['settings.offlinePack.title', 'settings.offlinePack.download'] },
      { id: 'settings.reciterAudioPack.title', keys: ['settings.reciterAudioPack.title', 'settings.reciterAudioPack.chooseReciter'] },
      { id: 'settings.storage.title', keys: ['settings.storage.title'] },
    ],
  },
  {
    group: 'settings.groups.language',
    sections: [
      { id: 'settings.language', keys: ['settings.language'] },
      { id: 'settings.hadithLanguage', keys: ['settings.hadithLanguage'] },
      { id: 'settings.appearance', keys: ['settings.appearance', 'settings.themeAuto', 'settings.themeLight', 'settings.themeDark'] },
      { id: 'settings.display.title', keys: ['settings.display.title', 'settings.display.transliteration', 'settings.display.isolatedLetters'] },
      { id: 'settings.appIcon.title', keys: ['settings.appIcon.title'] },
      { id: 'settings.dashboard.navLabel', keys: ['settings.dashboard.navLabel', 'settings.dashboard.navHint'] },
      { id: 'settings.widgets.title', keys: ['settings.widgets.title', 'widgets.themeTitle'] },
    ],
  },
  {
    group: 'settings.groups.learning',
    sections: [
      { id: 'settings.pace.title', keys: ['settings.pace.title', 'settings.pace.freeUnlock'] },
      { id: 'settings.exercise.title', keys: ['settings.exercise.title', 'settings.exercise.mixed', 'settings.exercise.audio', 'settings.exercise.reading', 'settings.exercise.speech', 'settings.recitationModel.title'] },
    ],
  },
  {
    group: 'settings.groups.data',
    sections: [
      { id: 'settings.backup.title', keys: ['settings.backup.title', 'settings.backup.exportButton', 'settings.backup.importButton', 'sync.title'] },
      { id: 'settings.support.title', keys: ['settings.support.title', 'settings.support.copyReport', 'settings.support.replayOnboarding'] },
    ],
  },
  {
    group: 'settings.groups.about',
    sections: [
      { id: 'settings.legal', keys: ['settings.legal', 'nav.impressum', 'nav.datenschutz', 'nav.agb', 'settings.legalFeedback', 'settings.legalVersion'] },
    ],
  },
];

// Sichtbarkeits-Context der Live-Suche: `null` = keine Suche aktiv (alles
// sichtbar), sonst ein Set der übersetzten Titel, die zur aktuellen Anfrage
// passen. Section/GroupHeader lesen das und rendern sich zu `null`, wenn ihr
// Titel nicht enthalten ist — so bleibt die JSX-Struktur unverändert.
const SettingsFilterContext = createContext<Set<string> | null>(null);
function useSectionVisible(title: string): boolean {
  const visible = useContext(SettingsFilterContext);
  return visible === null || visible.has(title);
}

export default function SettingsScreen() {
  const { settings, update, reset } = useSettings();
  const { t, locale } = useTranslation();
  const rtl = isRtlLocale(locale);
  const { requestLocation, loading: locLoading } = useDeviceLocation();
  const { data: audioEditions } = useAudioEditions();
  const { data: translationEditions } = useTranslationEditions();

  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const [pickerOpen, setPickerOpen] = useState<'reciter' | 'translation' | 'method' | 'downloadReciter' | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const cityRequestId = useRef(0);
  const cityDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const queryClient = useQueryClient();
  // null = noch nie gestartet; 0-113 = laeuft; 114 = fertig
  const [offlineProgress, setOfflineProgress] = useState<number | null>(null);

  // Exact-Alarm-Berechtigungsstatus (nur Android, siehe exact-alarm.ts) -
  // null = unbekannt (iOS/Web oder natives Modul nicht gebaut/registriert,
  // dann bleibt nur der generische Hinweistext unten sichtbar). Wird beim
  // Betreten des Screens einmal geprüft, nicht laufend gepollt - der Nutzer
  // kommt ohnehin über einen der beiden Buttons hierher zurück, wenn er die
  // Einstellung ändert.
  const [exactAlarmGranted, setExactAlarmGranted] = useState<boolean | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    checkExactAlarmPermission().then((status) => {
      if (!cancelled) setExactAlarmGranted(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Wrapper um das Umschalten der 5 Gebets-Toggles: identisch zum direkten
   * update()-Aufruf, zeigt aber beim ERSTEN Einschalten (irgendeines Gebets,
   * irgendwann) zusätzlich einmalig den Akku-Optimierungs-Hinweis (Teil 2
   * der Exact-Alarm/Doze-Recherche) - danach nie wieder, siehe battery-hint.ts.
   */
  async function togglePrayerNotification(id: keyof NotificationToggles, value: boolean) {
    update({ notificationsEnabled: { ...settings.notificationsEnabled, [id]: value } });
    if (Platform.OS !== 'android' || !value) return;
    if (await wasBatteryHintShown()) return;
    await markBatteryHintShown();
    Alert.alert(t('settings.lateNotif.batteryPromptTitle'), t('settings.lateNotif.batteryPromptBody'), [
      { text: t('settings.lateNotif.batteryPromptLater'), style: 'cancel' },
      {
        text: t('settings.lateNotif.batteryPromptOpen'),
        onPress: () => Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => {}),
      },
    ]);
  }

  async function downloadOfflinePack() {
    setOfflineProgress(0);
    const staleTime = 7 * 24 * 60 * 60 * 1000;
    for (let n = 1; n <= 114; n++) {
      try {
        await queryClient.prefetchQuery({
          queryKey: ['quran', 'surah', n, settings.quranTranslation, settings.quranReciter],
          queryFn: () => fetchSurahReading(n, settings.quranTranslation, settings.quranReciter),
          staleTime,
        });
      } catch {
        // einzelne Fehlschlaege ueberspringen (naechster Lauf holt sie nach)
      }
      setOfflineProgress(n);
      // API-freundlich drosseln
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  // Kompletter Rezitator-Audio-Download (114 Suren, sequentiell) - Hook aus
  // offline-audio.ts, hier nur UI (Bestätigungs-Dialog + Fortschritt + Anzahl
  // bereits vorhandener Suren fürs "fortsetzen"-Label). Bewusst NICHT an
  // settings.quranReciter (den Wiedergabe-Rezitator) gekoppelt: der Download
  // soll unabhängig davon wählbar sein, wer gerade abgespielt wird - Start-
  // wert ist der aktuelle Wiedergabe-Rezitator als sinnvoller Default, ändert
  // sich danach aber nicht mehr mit, wenn der Nutzer diesen umstellt.
  const [downloadReciter, setDownloadReciter] = useState(settings.quranReciter);
  const reciterDownload = useFullMushafDownload(downloadReciter);
  const [reciterDownloadedCount, setReciterDownloadedCount] = useState<number | null>(null);
  useEffect(() => {
    if (!reciterDownload.supported) return;
    let cancelled = false;
    countDownloadedSurahs(downloadReciter).then((n) => {
      if (!cancelled) setReciterDownloadedCount(n);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadReciter, reciterDownload.downloading]);

  // Übersicht aller bereits (teilweise) offline gespeicherten Rezitatoren -
  // mehrere Pakete können gleichzeitig vorliegen, da Pfad+Index pro Rezitator
  // getrennt sind (siehe offline-audio.ts). Refresh bei Download-Ende/-Start
  // und nach jedem Löschen.
  const [downloadedReciters, setDownloadedReciters] = useState<DownloadedReciterPack[]>([]);
  useEffect(() => {
    if (!reciterDownload.supported) return;
    let cancelled = false;
    listDownloadedReciters().then((list) => {
      if (!cancelled) setDownloadedReciters(list);
    });
    return () => {
      cancelled = true;
    };
  }, [reciterDownload.supported, reciterDownload.downloading]);

  const downloadReciterEdition = audioEditions?.find((e) => e.identifier === downloadReciter);
  const downloadReciterName = downloadReciterEdition ? editionDisplayName(downloadReciterEdition) : downloadReciter;

  function confirmReciterDownload() {
    Alert.alert(t('settings.reciterAudioPack.confirmTitle'), t('settings.reciterAudioPack.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.reciterAudioPack.startAction'), onPress: () => void reciterDownload.download() },
    ]);
  }

  function confirmDeleteReciterPack(reciter: string, name: string) {
    Alert.alert(
      t('settings.reciterAudioPack.deleteConfirmTitle'),
      t('settings.reciterAudioPack.deleteConfirmBody').replace('{reciter}', name),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.reciterAudioPack.deleteAction'),
          style: 'destructive',
          onPress: () => {
            void deleteFullMushafAudio(reciter).then(async () => {
              setDownloadedReciters(await listDownloadedReciters());
              if (reciter === downloadReciter) setReciterDownloadedCount(0);
            });
          },
        },
      ],
    );
  }

  // App-Icon/Name-Auswahl (nur Android, siehe features/settings/app-icon.ts).
  const [appIconChoice, setAppIconChoice] = useState<AppIconVariant>('Default');
  useEffect(() => {
    if (!appIconSupported()) return;
    getCurrentAppIcon().then(setAppIconChoice);
  }, []);
  async function pickAppIcon(variant: AppIconVariant) {
    setAppIconChoice(variant);
    await setAppIcon(variant);
  }

  const [cityResults, setCityResults] = useState<NominatimResult[]>([]);
  // Name-Eingabe für "aktuellen Ort speichern" (s. features/settings/savedLocations.ts).
  const [savedLocationName, setSavedLocationName] = useState('');
  // Vorschau-Player für die Adhan-Auswahl (kein bestimmter Track vorgewählt,
  // wird pro Tipp neu gesetzt).
  const [previewChoice, setPreviewChoice] = useState<typeof AZAN_CHOICES[number] | null>(null);
  const previewPlayer = useSsrSafeAudioPlayer(previewChoice ? azanSource(previewChoice) : undefined);
  function previewAzan(choice: typeof AZAN_CHOICES[number]) {
    if (choice === 'default') return;
    setPreviewChoice(choice);
  }
  useEffect(() => {
    if (previewChoice) {
      previewPlayer.seekTo(0);
      previewPlayer.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewChoice]);

  const [citySearching, setCitySearching] = useState(false);

  const [reportCopied, setReportCopied] = useState(false);
  async function copyErrorReport() {
    const entries = await getErrorLog();
    await Clipboard.setStringAsync(formatErrorReport(entries));
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 1800);
  }

  // Kontakt-Adresse identisch zum Impressum (src/app/impressum.tsx) - kein
  // eigenes Backend, öffnet nur den Standard-Mail-Client des Geräts.
  function openFeedbackMail() {
    const subject = encodeURIComponent(t('settings.legalFeedbackSubject'));
    Linking.openURL(`mailto:salatibox@gmail.com?subject=${subject}`).catch(() => {});
  }

  // App-Version für Support-Anfragen: JS-Konfigversion (app.config.ts) plus
  // die tatsächliche native Build-Nummer des installierten Binaries (bleibt
  // auch nach einem OTA-Update auf den ursprünglichen Build fixiert, siehe
  // expo-constants-Doku zu Constants.platform.*). `platform`-Feld ist zwar
  // als deprecated markiert (expo-application wird empfohlen), liefert aber
  // ohne zusätzliche native Dependency/Rebuild bereits den echten Wert.
  const nativeBuildNumber =
    Platform.OS === 'android'
      ? Constants.platform?.android?.versionCode
      : Platform.OS === 'ios'
        ? Constants.platform?.ios?.buildNumber
        : undefined;
  const appVersionLabel = nativeBuildNumber != null
    ? `${Constants.expoConfig?.version ?? '?'} (${nativeBuildNumber})`
    : Constants.expoConfig?.version ?? '?';

  // Fortschritt exportieren/importieren (siehe features/settings/backup.ts für
  // die recherchierten AsyncStorage-Keys + Formatversion). scrollRef +
  // reciterSectionY erlauben den "Zu den Rezitator-Downloads"-Link nach einem
  // Import direkt zur bestehenden Rezitator-Sektion weiter unten zu scrollen,
  // statt eine zweite Kopie der Sektion aufzubauen.
  const scrollRef = useRef<ScrollView>(null);
  const reciterSectionY = useRef(0);
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null);
  const [importedReciters, setImportedReciters] = useState<string[] | null>(null);

  async function exportProgress() {
    if (backupBusy) return;
    setBackupBusy('export');
    try {
      const data = await collectBackupData();
      const uri = await writeBackupFile(data);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: t('settings.backup.exportButton'),
        });
      } else {
        Alert.alert(t('settings.backup.title'), t('settings.backup.exportError'));
      }
    } catch {
      Alert.alert(t('settings.backup.title'), t('settings.backup.exportError'));
    } finally {
      setBackupBusy(null);
    }
  }

  async function finishImport(data: BackupData) {
    try {
      await applyBackupData(data);
      setImportedReciters(data.downloadedReciters);
      Alert.alert(t('settings.backup.title'), t('settings.backup.importSuccess'));
    } catch {
      Alert.alert(t('settings.backup.title'), t('settings.backup.importError'));
    }
  }

  async function importProgress() {
    if (backupBusy) return;
    setBackupBusy('import');
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (!asset) return;

      const raw = await readBackupFile(asset.uri);
      const result = parseBackupFile(raw);
      if (!result.ok) {
        Alert.alert(
          t('settings.backup.title'),
          result.reason === 'unsupported_version'
            ? t('settings.backup.importUnsupportedVersion')
            : t('settings.backup.importInvalidFile'),
        );
        return;
      }

      // Import überschreibt lokalen Fortschritt vollständig - erst nach
      // expliziter Bestätigung anwenden (Aufgabenstellung Punkt 2).
      Alert.alert(t('settings.backup.importConfirmTitle'), t('settings.backup.importConfirmBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.backup.importConfirmAction'),
          style: 'destructive',
          onPress: () => void finishImport(result.data),
        },
      ]);
    } catch {
      Alert.alert(t('settings.backup.title'), t('settings.backup.importError'));
    } finally {
      setBackupBusy(null);
    }
  }

  function goToReciterDownloads() {
    scrollRef.current?.scrollTo({ y: Math.max(reciterSectionY.current - Spacing.three, 0), animated: true });
  }

  function onCityQueryChange(q: string) {
    setCityQuery(q);
    if (cityDebounce.current) clearTimeout(cityDebounce.current);
    if (q.trim().length < 3) {
      setCityResults([]);
      setCitySearching(false);
      return;
    }
    // 400ms Debounce: ohne Bremse feuert jeder Tastendruck sofort einen
    // eigenen Nominatim-Request ab, was gegen deren 1req/s-Nutzungsrichtlinie
    // verstößt und dort zu Rate-Limit-Antworten (kein valides JSON) führt.
    // requestId verwirft veraltete Antworten, falls der Nutzer weitertippt.
    setCitySearching(true);
    const requestId = ++cityRequestId.current;
    cityDebounce.current = setTimeout(async () => {
      try {
        const results = await searchCity(q);
        if (requestId === cityRequestId.current) setCityResults(results);
      } catch {
        if (requestId === cityRequestId.current) setCityResults([]);
      } finally {
        if (requestId === cityRequestId.current) setCitySearching(false);
      }
    }, 400);
  }

  function pickCity(r: NominatimResult) {
    update({ location: nominatimResultToLocation(r) });
    setCityQuery('');
    setCityResults([]);
  }

  async function useMyLocation() {
    const pos = await requestLocation();
    if (pos) {
      update({
        location: {
          ...pos,
          label: `${pos.lat.toFixed(3)}, ${pos.lon.toFixed(3)}`,
          city: settings.location.city,
          country: settings.location.country,
        },
      });
    }
  }

  // Gespeicherte Orte ("Zuhause"/"Arbeit"/…) — schnelles Wechseln ohne
  // erneute Stadtsuche, s. features/settings/savedLocations.ts. Der aktive
  // Ort (settings.location) bleibt davon unberührt, bis der Nutzer explizit
  // einen gespeicherten Ort antippt.
  function saveCurrentLocation() {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = addSavedLocation(settings.savedLocations, id, savedLocationName, settings.location);
    if (next !== settings.savedLocations) {
      update({ savedLocations: next });
      setSavedLocationName('');
    }
  }

  function switchToSavedLocation(loc: LocationSetting) {
    update({ location: { lat: loc.lat, lon: loc.lon, label: loc.label, city: loc.city, country: loc.country } });
  }

  function deleteSavedLocation(id: string) {
    update({ savedLocations: removeSavedLocation(settings.savedLocations, id) });
  }

  const currentMethodName = METHODS.find((m) => m.id === settings.method)?.name ?? String(settings.method);
  const currentReciterEdition = audioEditions?.find((e) => e.identifier === settings.quranReciter);
  const currentReciterName = currentReciterEdition
    ? editionDisplayName(currentReciterEdition)
    : settings.quranReciter;
  const currentTranslationEdition = translationEditions?.find(
    (e) => e.identifier === settings.quranTranslation,
  );
  const currentTranslationName = currentTranslationEdition
    ? editionDisplayName(currentTranslationEdition)
    : settings.quranTranslation;

  // Live-Suche über alle Einstellungen (iOS-artig): filtert Sektionen und
  // Gruppen-Überschriften anhand ihrer in die aktuelle Sprache übersetzten
  // Titel + Unter-Labels (SETTINGS_SEARCH_INDEX). Statt jede der ~35 Sektionen
  // im JSX einzeln mit einem Gate zu umschließen, stellen wir das Ergebnis als
  // Set der SICHTBAREN übersetzten Titel per Context bereit: Section/GroupHeader
  // rendern sich selbst zu `null`, wenn ihr Titel nicht im Set ist. Leeres Feld
  // => `null` = alles sichtbar. Auswertung pro Render günstig, kein useMemo.
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  let visibleTitles: Set<string> | null = null;
  if (query) {
    visibleTitles = new Set<string>();
    for (const g of SETTINGS_SEARCH_INDEX) {
      const groupMatches = t(g.group).toLowerCase().includes(query);
      const matchedSections = g.sections.filter(
        (s) => groupMatches || s.keys.some((k) => t(k).toLowerCase().includes(query)),
      );
      if (matchedSections.length > 0) {
        visibleTitles.add(t(g.group));
        for (const s of matchedSections) visibleTitles.add(t(s.id));
      }
    }
  }
  const filterVisible = visibleTitles;
  const noResults = filterVisible !== null && filterVisible.size === 0;

  return (
    <SettingsFilterContext.Provider value={filterVisible}>
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            {t('nav.settings')}
          </ThemedText>

          <SettingsSearchBar value={search} onChangeText={setSearch} />

          {noResults && (
            <EmptyState
              icon="search-outline"
              title={t('settings.searchNoResults')}
            />
          )}

          <GroupHeader label={t('settings.groups.prayer')} rtl={rtl} />

          <AnimatedListItem index={0}>
          <Section label={t('settings.location')} icon="location-outline">
            <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
              {t('settings.current')}: {settings.location.label}
            </ThemedText>
            <Row
              onPress={useMyLocation}
              label={locLoading ? t('settings.locating') : t('settings.useMyLocation')}
              accent
              chevron
            />
            <View style={styles.inputWrap}>
              <ThemedView type="backgroundElement" style={styles.inputBox}>
                <TextInput
                  value={cityQuery}
                  onChangeText={onCityQueryChange}
                  placeholder={t('settings.searchCity')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.textInput, rtl && styles.rtlText, { color: colors.text }]}
                />
              </ThemedView>
              {citySearching && (
                <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                  {t('common.loading')}
                </ThemedText>
              )}
              {cityResults.map((r) => (
                <Row key={r.place_id} onPress={() => pickCity(r)} label={r.display_name} chevron />
              ))}
            </View>

            {/* Gespeicherte Orte: schnelles Wechseln (z. B. "Zuhause"/"Arbeit")
                ohne die Stadtsuche erneut zu bemühen - der aktive Ort bleibt
                weiterhin settings.location, unverändert. */}
            {settings.savedLocations.length > 0 && (
              <View style={styles.savedLocationsWrap}>
                <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
                  {t('settings.savedLocations.title')}
                </ThemedText>
                {settings.savedLocations.map((loc) => {
                  const active = isActiveSavedLocation(loc, settings.location);
                  return (
                    <View key={loc.id} style={[styles.savedLocationRow, rtl && styles.savedLocationRowRtl]}>
                      <Pressable
                        onPress={() => switchToSavedLocation(loc)}
                        style={({ pressed }) => [
                          styles.savedLocationMain,
                          Platform.OS === 'web' ? styles.pressableWeb : undefined,
                          pressed && styles.rowPressed,
                        ]}>
                        <ThemedText type={active ? 'smallBold' : 'default'} themeColor={active ? 'accent' : 'text'} style={rtl && styles.rtlText}>
                          {loc.name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                          {loc.label}
                        </ThemedText>
                      </Pressable>
                      {active && <IconSymbol name="checkmark" size={16} color={colors.accent} />}
                      <Pressable
                        onPress={() => deleteSavedLocation(loc.id)}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel={t('settings.savedLocations.delete')}
                        style={({ pressed }) => [
                          styles.savedLocationDelete,
                          Platform.OS === 'web' ? styles.pressableWeb : undefined,
                          pressed && styles.pressed,
                        ]}>
                        <IconSymbol name="trash-outline" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.inputWrap}>
              <ThemedView type="backgroundElement" style={styles.inputBox}>
                <TextInput
                  value={savedLocationName}
                  onChangeText={setSavedLocationName}
                  placeholder={t('settings.savedLocations.namePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.textInput, rtl && styles.rtlText, { color: colors.text }]}
                />
              </ThemedView>
              <Row onPress={saveCurrentLocation} label={t('settings.savedLocations.saveCurrent')} accent chevron />
            </View>
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={1}>
          <Section label={t('settings.travel.title')} icon="airplane-outline">
            <SwitchRow
              label={t('settings.travel.enable')}
              hint={t('settings.travel.enableHint')}
              value={settings.travelModeEnabled}
              onValueChange={(v) => update({ travelModeEnabled: v })}
            />
            <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
              {t('settings.travel.home').replace('{location}', settings.homeLocation?.label ?? settings.location.label)}
            </ThemedText>
            <Row onPress={() => update({ homeLocation: settings.location })} label={t('settings.travel.setHome')} accent chevron />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={2}>
          <Section label={t('settings.method')} icon="calculator-outline">
            <Row onPress={() => setPickerOpen('method')} label={currentMethodName} chevron />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={3}>
          <Section label={t('settings.asrSchool')} icon="school-outline">
            {SCHOOLS.map((s) => (
              <Row
                key={s.id}
                onPress={() => update({ school: s.id })}
                label={t(s.id === 0 ? 'settings.asrEarlier' : 'settings.asrLater')}
                selected={settings.school === s.id}
              />
            ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={4}>
          <Section label={t('settings.iqama.title')} icon="people-outline">
            <SwitchRow
              label={t('settings.iqama.enable')}
              hint={t('settings.iqama.enableHint')}
              value={settings.iqamaEnabled}
              onValueChange={(v) => update({ iqamaEnabled: v })}
            />
            {settings.iqamaEnabled && (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
                  {t('settings.iqama.offsetHint')}
                </ThemedText>
                {PRAYER_TOGGLE_LABELS.map((p) => (
                  <View key={p.id}>
                    <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
                      <ThemedText type="default" style={rtl && styles.rtlText}>{p.label}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                        +{settings.iqamaOffsets[p.id]} {t('settings.iqama.minutesShort')}
                      </ThemedText>
                    </View>
                    <View style={[styles.hourRow, rtl && styles.hourRowRtl]}>
                      {IQAMA_OFFSET_OPTIONS.map((minutes) => (
                        <Pressable
                          key={minutes}
                          onPress={() =>
                            update({
                              iqamaOffsets: { ...settings.iqamaOffsets, [p.id]: minutes } as IqamaOffsets,
                            })
                          }
                          style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                          <ThemedView
                            type={settings.iqamaOffsets[p.id] === minutes ? 'backgroundSelected' : 'backgroundElement'}
                            style={styles.hourChip}>
                            <ThemedText
                              type="small"
                              themeColor={settings.iqamaOffsets[p.id] === minutes ? 'accent' : 'text'}>
                              {minutes}
                            </ThemedText>
                          </ThemedView>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={5}>
          <Section label={t('settings.timeFormat')} icon="time-outline">
            {TIME_FORMATS.map((f) => (
              <Row
                key={f.id}
                onPress={() => update({ timeFormat: f.id })}
                label={t(f.labelKey)}
                selected={settings.timeFormat === f.id}
              />
            ))}
          </Section>
          </AnimatedListItem>

          <GroupHeader label={t('settings.groups.notifications')} rtl={rtl} />

          {/* Prominenter Einstieg in die Benachrichtigungs-Gruppe: zentrale
              Übersicht ALLER Notification-Toggles der App (notifications-
              overview.tsx) - die einzelnen Toggles unten in ihren jeweiligen
              Sections bleiben zusätzlich bestehen, siehe Datei-Kommentar dort. */}
          <AnimatedListItem index={6}>
          <Section label={t('settings.notificationsOverview.navLabel')} icon="notifications-outline">
            <Row
              onPress={() => router.push('/notifications-overview')}
              label={t('settings.notificationsOverview.navHint')}
              accent
              chevron
            />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={7}>
          <Section label={t('settings.notifications')} icon="notifications-outline">
            {PRAYER_TOGGLE_LABELS.map((p) => (
              <SwitchRow
                key={p.id}
                label={p.label}
                value={settings.notificationsEnabled[p.id]}
                onValueChange={(v) => togglePrayerNotification(p.id, v)}
              />
            ))}
            {(
              [
                { key: 'sound', label: t('settings.notifPrefs.sound'), hint: t('settings.notifPrefs.soundHint') },
                { key: 'vibrate', label: t('settings.notifPrefs.vibrate'), hint: t('settings.notifPrefs.vibrateHint') },
                { key: 'headsUp', label: t('settings.notifPrefs.headsUp'), hint: t('settings.notifPrefs.headsUpHint') },
                ...(Platform.OS === 'android'
                  ? ([
                      {
                        key: 'ongoingCountdown',
                        label: t('settings.notifPrefs.ongoingCountdown'),
                        hint: t('settings.notifPrefs.ongoingCountdownHint'),
                      },
                    ] as const)
                  : []),
                ...(Platform.OS === 'ios'
                  ? ([
                      {
                        key: 'liveActivity',
                        label: t('settings.notifPrefs.liveActivity'),
                        hint: t('settings.notifPrefs.liveActivityHint'),
                      },
                    ] as const)
                  : []),
              ] as const
            ).map((row) => (
              <SwitchRow
                key={row.key}
                label={row.label}
                hint={row.hint}
                value={settings.notificationPrefs[row.key]}
                onValueChange={(v) =>
                  update({ notificationPrefs: { ...settings.notificationPrefs, [row.key]: v } })
                }
              />
            ))}
          </Section>
          </AnimatedListItem>

          {/* Direkt nach den Gebets-Toggles statt hinter dem Adhan-Klang
              (Nutzerfund: 3 Benachrichtigungen kamen gebuendelt/verspaetet
              an — Ursache meist eine fehlende Exact-Alarm-Berechtigung;
              der Hinweis dazu war vorher zu weit von den Toggles entfernt,
              um beim Einrichten aufzufallen). */}
          {Platform.OS === 'android' && (
            <AnimatedListItem index={8}>
            <Section label={t('settings.lateNotif.title')} icon="alarm-outline">
              <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                {t('settings.lateNotif.hint')}
              </ThemedText>
              {/* Laufzeit-Prüfung via ExactAlarmModule.kt (exact-alarm.ts) -
                  nur sichtbar, wenn der Status tatsächlich bekannt UND
                  explizit nicht erteilt ist. `null` (iOS/Web/Modul nicht
                  gebaut) und `true` zeigen bewusst NICHTS Zusätzliches, damit
                  kein falscher Alarm entsteht. */}
              {exactAlarmGranted === false && (
                <ThemedText type="smallBold" themeColor="accent" style={rtl && styles.rtlText}>
                  {t('settings.lateNotif.notGranted')}
                </ThemedText>
              )}
              <Row
                onPress={() => Linking.sendIntent('android.settings.REQUEST_SCHEDULE_EXACT_ALARM').catch(() => {})}
                label={t('settings.lateNotif.exactAlarm')}
                accent
                chevron
              />
              <Row
                onPress={() => Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => {})}
                label={t('settings.lateNotif.battery')}
                accent
                chevron
              />
            </Section>
            </AnimatedListItem>
          )}

          <AnimatedListItem index={9}>
          <Section label={t('settings.azan.title')} icon="musical-notes-outline">
            <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
              {t('settings.azan.hint')}
            </ThemedText>
            <View style={[styles.azanRow, rtl && styles.azanRowRtl]}>
              {AZAN_CHOICES.map((choice, azanIndex) => (
                // Zwei GESCHWISTER-Pressables statt verschachtelt (Auswahl +
                // Vorschau-Icon): ein <button> im anderen ist ungültiges HTML
                // und löste im Web-Export einen reproduzierbaren Hydration-
                // Fehler aus (Browser korrigiert das verschachtelte <button>
                // beim Parsen selbst weg, React erwartet danach eine andere
                // DOM-Struktur als tatsächlich vorhanden — minified React
                // error #418, per Playwright-Konsole auf /settings bestätigt).
                <ThemedView
                  key={choice}
                  type={settings.azanChoice === choice ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.azanChip}>
                  <Pressable
                    onPress={() => update({ azanChoice: choice })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: settings.azanChoice === choice }}
                    style={({ pressed }) => [
                      styles.azanChipLabel,
                      choice === 'default' && styles.azanChipLabelSolo,
                      Platform.OS === 'web' ? styles.pressableWeb : undefined,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small" themeColor={settings.azanChoice === choice ? 'accent' : 'text'}>
                      {choice === 'default'
                        ? t('settings.azan.systemDefault')
                        : // Angezeigtes Label ist der sequenzielle Listenindex (Adhan 1, 2, 3, ...),
                          // NICHT die rohe Sample-Dateinummer im choice-Wert (z.B. 'azan8') — die
                          // Dateinummern sind Lücken-behaftet und würden "Adhan 8/9/12/14/20" zeigen.
                          // 'default' liegt auf Index 0, daher ist azanIndex hier bereits 1-basiert.
                          t('settings.azan.option').replace('{n}', String(azanIndex))}
                    </ThemedText>
                  </Pressable>
                  {choice !== 'default' && (
                    <Pressable
                      onPress={() => previewAzan(choice)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('settings.azan.preview')}
                      style={({ pressed }) => [
                        styles.azanChipPreview,
                        Platform.OS === 'web' ? styles.pressableWeb : undefined,
                        pressed && styles.pressed,
                      ]}>
                      <IconSymbol name="play-circle-outline" size={16} color={colors.accent} />
                    </Pressable>
                  )}
                </ThemedView>
              ))}
            </View>
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={10}>
          <Section label={t('settings.preAdhan.title')} icon="alarm-outline">
            <SwitchRow
              label={t('settings.preAdhan.enable')}
              hint={t('settings.preAdhan.hint')}
              value={settings.preAdhanReminderEnabled}
              onValueChange={(v) => update({ preAdhanReminderEnabled: v })}
            />
            {settings.preAdhanReminderEnabled && (
              <View style={[styles.hourRow, rtl && styles.hourRowRtl]}>
                {PRE_ADHAN_OFFSET_OPTIONS.map((min) => (
                  <Pressable
                    key={min}
                    onPress={() => update({ preAdhanReminderOffset: min })}
                    style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                    <ThemedView
                      type={settings.preAdhanReminderOffset === min ? 'backgroundSelected' : 'backgroundElement'}
                      style={styles.hourChip}>
                      <ThemedText type="small" themeColor={settings.preAdhanReminderOffset === min ? 'accent' : 'text'}>
                        {t('settings.preAdhan.minutes').replace('{n}', String(min))}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            )}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={11}>
          <Section label={t('settings.adhkar.title')} icon="partly-sunny-outline">
            {(
              [
                { key: 'morning', enabledKey: 'adhkarMorningEnabled', hourKey: 'adhkarMorningHour', hours: ADHKAR_MORNING_HOURS },
                { key: 'evening', enabledKey: 'adhkarEveningEnabled', hourKey: 'adhkarEveningHour', hours: ADHKAR_EVENING_HOURS },
              ] as const
            ).map((row) => (
              <View key={row.key}>
                <SwitchRow
                  label={t(`settings.adhkar.${row.key}`)}
                  hint={t(`settings.adhkar.${row.key}Hint`)}
                  value={settings[row.enabledKey]}
                  onValueChange={(v) => {
                    update({ [row.enabledKey]: v });
                    rescheduleAdhkarReminders({
                      morningEnabled: row.key === 'morning' ? v : settings.adhkarMorningEnabled,
                      morningHour: settings.adhkarMorningHour,
                      eveningEnabled: row.key === 'evening' ? v : settings.adhkarEveningEnabled,
                      eveningHour: settings.adhkarEveningHour,
                      locale: settings.language,
                    }).catch(() => {});
                  }}
                />
                {settings[row.enabledKey] && (
                  <View style={[styles.hourRow, rtl && styles.hourRowRtl]}>
                    {row.hours.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => {
                          update({ [row.hourKey]: h });
                          rescheduleAdhkarReminders({
                            morningEnabled: settings.adhkarMorningEnabled,
                            morningHour: row.key === 'morning' ? h : settings.adhkarMorningHour,
                            eveningEnabled: settings.adhkarEveningEnabled,
                            eveningHour: row.key === 'evening' ? h : settings.adhkarEveningHour,
                            locale: settings.language,
                          }).catch(() => {});
                        }}
                        style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                        <ThemedView
                          type={settings[row.hourKey] === h ? 'backgroundSelected' : 'backgroundElement'}
                          style={styles.hourChip}>
                          <ThemedText type="small" themeColor={settings[row.hourKey] === h ? 'accent' : 'text'}>
                            {h}:00
                          </ThemedText>
                        </ThemedView>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={12}>
          <Section label={t('settings.reviewReminder.title')} icon="refresh-outline">
            <SwitchRow
              label={t('settings.reviewReminder.enable')}
              hint={t('settings.reviewReminder.hint')}
              value={settings.reviewReminderEnabled}
              onValueChange={(v) => update({ reviewReminderEnabled: v })}
            />
            {settings.reviewReminderEnabled &&
              REVIEW_REMINDER_HOUR_OPTIONS.map((hour) => (
                <Row
                  key={hour}
                  onPress={() => update({ reviewReminderHour: hour })}
                  label={t(`settings.reviewReminder.hour${hour}`)}
                  selected={settings.reviewReminderHour === hour}
                />
              ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={13}>
          <Section label={t('settings.verseOfDay.title')} icon="sparkles-outline">
            <SwitchRow
              label={t('settings.verseOfDay.enable')}
              hint={t('settings.verseOfDay.hint')}
              value={settings.verseOfDayReminderEnabled}
              onValueChange={(v) => {
                update({ verseOfDayReminderEnabled: v });
                rescheduleVerseOfDayReminder(
                  v,
                  settings.verseOfDayReminderHour,
                  settings.language,
                  settings.hadithLanguage,
                ).catch(() => {});
              }}
            />
            {settings.verseOfDayReminderEnabled && (
              <View style={[styles.hourRow, rtl && styles.hourRowRtl]}>
                {VERSE_OF_DAY_HOUR_OPTIONS.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => {
                      update({ verseOfDayReminderHour: h });
                      rescheduleVerseOfDayReminder(true, h, settings.language, settings.hadithLanguage).catch(
                        () => {},
                      );
                    }}
                    style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                    <ThemedView
                      type={settings.verseOfDayReminderHour === h ? 'backgroundSelected' : 'backgroundElement'}
                      style={styles.hourChip}>
                      <ThemedText type="small" themeColor={settings.verseOfDayReminderHour === h ? 'accent' : 'text'}>
                        {h}:00
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            )}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={14}>
          <Section label={t('settings.jumuah.title')} icon="calendar-outline">
            <SwitchRow
              label={t('settings.jumuah.enable')}
              hint={t('settings.jumuah.hint')}
              value={settings.jumuahReminderEnabled}
              onValueChange={(v) => update({ jumuahReminderEnabled: v })}
            />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={15}>
          <Section label={t('settings.sunnah.title')} icon="moon-outline">
            {(
              [
                { key: 'duha', enabledKey: 'sunnahDuhaEnabled' },
                { key: 'tahajjud', enabledKey: 'sunnahTahajjudEnabled' },
                { key: 'witr', enabledKey: 'sunnahWitrEnabled' },
              ] as const
            ).map((row) => (
              <SwitchRow
                key={row.key}
                label={t(`settings.sunnah.${row.key}`)}
                hint={t(`settings.sunnah.${row.key}Hint`)}
                value={settings[row.enabledKey]}
                onValueChange={(v) => update({ [row.enabledKey]: v })}
              />
            ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={16}>
          <Section label={t('settings.weeklySummary.title')} icon="stats-chart-outline">
            <SwitchRow
              label={t('settings.weeklySummary.enable')}
              hint={t('settings.weeklySummary.hint')}
              value={settings.weeklySummaryReminderEnabled}
              onValueChange={(v) => {
                update({ weeklySummaryReminderEnabled: v });
                rescheduleWeeklySummary(v, settings.language).catch(() => {});
              }}
            />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={17}>
          <Section label={t('settings.udhiyah.title')} icon="gift-outline">
            <SwitchRow
              label={t('settings.udhiyah.enable')}
              hint={t('settings.udhiyah.hint')}
              value={settings.udhiyahReminderEnabled}
              onValueChange={(v) => {
                update({ udhiyahReminderEnabled: v });
                rescheduleUdhiyahReminder(v, settings.language).catch(() => {});
              }}
            />
          </Section>
          </AnimatedListItem>

          <GroupHeader label={t('settings.groups.quran')} rtl={rtl} />

          <AnimatedListItem index={18}>
          <Section label={t('nav.quran')} icon="book-outline">
            <Row onPress={() => setPickerOpen('reciter')} label={`${t('quran.chooseReciter')}: ${currentReciterName}`} chevron />
            <Row onPress={() => setPickerOpen('translation')} label={`${t('quran.chooseTranslation')}: ${currentTranslationName}`} chevron />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={19}>
          <Section label={t('settings.fontSize')} icon="text-outline">
            {FONT_SIZES.map((f) => (
              <Row
                key={f.id}
                onPress={() => update({ quranFontSize: f.id })}
                label={t(f.labelKey)}
                selected={settings.quranFontSize === f.id}
              />
            ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={20}>
          <Section label={t('settings.offlinePack.title')} icon="cloud-download-outline">
            <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
              <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
                <ThemedText type="default" style={rtl && styles.rtlText}>{t('settings.offlinePack.download')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                  {offlineProgress === null
                    ? t('settings.offlinePack.hint')
                    : offlineProgress >= 114
                      ? t('settings.offlinePack.done')
                      : `${offlineProgress} / 114`}
                </ThemedText>
              </View>
              <Pressable
                onPress={downloadOfflinePack}
                disabled={offlineProgress !== null && offlineProgress < 114}
                accessibilityRole="button"
                accessibilityLabel={t('settings.offlinePack.download')}
                style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                <ThemedView type="backgroundSelected" style={styles.hourChip}>
                  <IconSymbol
                    name={offlineProgress !== null && offlineProgress >= 114 ? 'checkmark' : 'cloud-download-outline'}
                    size={16}
                    color={colors.accent}
                  />
                </ThemedView>
              </Pressable>
            </View>
          </Section>
          </AnimatedListItem>

          {reciterDownload.supported && (
          <View onLayout={(e) => { reciterSectionY.current = e.nativeEvent.layout.y; }}>
          <AnimatedListItem index={21}>
          <Section label={t('settings.reciterAudioPack.title')} icon="download-outline">
            <Row
              onPress={() => setPickerOpen('downloadReciter')}
              label={`${t('settings.reciterAudioPack.chooseReciter')}: ${downloadReciterName}`}
              chevron
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.currentValue}>
              {t('settings.reciterAudioPack.hint').replace('{reciter}', downloadReciterName)}
            </ThemedText>
            <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
              <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
                <ThemedText type="default" style={rtl && styles.rtlText}>
                  {reciterDownload.downloading
                    ? t('settings.reciterAudioPack.progress')
                        .replace('{n}', String(Math.round(reciterDownload.progress * QURAN_SURAH_COUNT)))
                        .replace('{total}', String(QURAN_SURAH_COUNT))
                    : reciterDownloadedCount !== null && reciterDownloadedCount >= QURAN_SURAH_COUNT
                      ? t('settings.reciterAudioPack.done')
                      : reciterDownloadedCount
                        ? t('settings.reciterAudioPack.resume').replace('{n}', String(reciterDownloadedCount))
                        : t('settings.reciterAudioPack.download')}
                </ThemedText>
              </View>
              <Pressable
                onPress={reciterDownload.downloading ? reciterDownload.cancel : confirmReciterDownload}
                disabled={!reciterDownload.downloading && reciterDownloadedCount !== null && reciterDownloadedCount >= QURAN_SURAH_COUNT}
                accessibilityRole="button"
                accessibilityLabel={reciterDownload.downloading ? t('common.cancel') : t('settings.reciterAudioPack.download')}
                style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                <ThemedView type="backgroundSelected" style={styles.hourChip}>
                  <IconSymbol
                    name={
                      reciterDownload.downloading
                        ? 'close'
                        : reciterDownloadedCount !== null && reciterDownloadedCount >= QURAN_SURAH_COUNT
                          ? 'checkmark'
                          : 'cloud-download-outline'
                    }
                    size={16}
                    color={colors.accent}
                  />
                </ThemedView>
              </Pressable>
            </View>
            {downloadedReciters.length > 0 ? (
              <>
                <ThemedText type="smallBold" themeColor="textSecondary" style={[styles.currentValue, styles.downloadedHeader]}>
                  {t('settings.reciterAudioPack.downloadedTitle')}
                </ThemedText>
                {downloadedReciters.map((pack) => {
                  const edition = audioEditions?.find((e) => e.identifier === pack.reciter);
                  const name = edition ? editionDisplayName(edition) : pack.reciter;
                  return (
                    <View key={pack.reciter} style={[styles.switchRow, rtl && styles.switchRowRtl]}>
                      <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
                        <ThemedText type="default" style={rtl && styles.rtlText}>
                          {name}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                          {pack.surahCount >= QURAN_SURAH_COUNT
                            ? t('settings.reciterAudioPack.packComplete')
                            : t('settings.reciterAudioPack.packStatus').replace('{n}', String(pack.surahCount))}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() => confirmDeleteReciterPack(pack.reciter, name)}
                        accessibilityRole="button"
                        accessibilityLabel={t('settings.reciterAudioPack.deleteAction')}
                        style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                        <ThemedView type="backgroundSelected" style={styles.hourChip}>
                          <IconSymbol name="trash-outline" size={16} color={colors.accent} />
                        </ThemedView>
                      </Pressable>
                    </View>
                  );
                })}
              </>
            ) : (
              <EmptyState
                compact
                icon="cloud-download-outline"
                title={t('settings.reciterAudioPack.noDownloads')}
              />
            )}
          </Section>
          </AnimatedListItem>
          </View>
          )}

          {/* Speicherverwaltung direkt neben den Offline-/Rezitator-Downloads:
              der Nutzer, der hier Suren/Rezitatoren offline verfügbar macht,
              erreicht die zugehörige Größen-/Lösch-Übersicht ohne bis zur
              "Daten"-Gruppe weiterscrollen zu müssen (Nutzerfund: "Speicher
              verwalten" lag zu weit von "offline verfügbar machen" entfernt). */}
          {Platform.OS !== 'web' && (
          <AnimatedListItem index={22}>
          <Section label={t('settings.storage.title')} icon="server-outline">
            <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
              {t('settings.storage.openHint')}
            </ThemedText>
            <Row onPress={() => router.push('/storage')} label={t('settings.storage.title')} accent chevron />
          </Section>
          </AnimatedListItem>
          )}

          <GroupHeader label={t('settings.groups.language')} rtl={rtl} />

          <AnimatedListItem index={22}>
          <Section label={t('settings.language')} icon="language-outline">
            {LANGUAGES.map((l) => (
              <Row
                key={l.id}
                onPress={() =>
                  update({
                    language: l.id,
                    quranTranslation: BEST_TRANSLATIONS[l.id] ?? settings.quranTranslation,
                    quranTafsirs: [BEST_TAFSIRS[l.id] ?? settings.quranTafsirs[0]],
                  })
                }
                label={l.label}
                selected={settings.language === l.id}
              />
            ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={23}>
          <Section label={t('settings.hadithLanguage')} icon="chatbox-outline">
            {HADITH_LANGUAGES.map((l) => (
              <Row
                key={l.id}
                onPress={() => update({ hadithLanguage: l.id })}
                label={l.label}
                selected={settings.hadithLanguage === l.id}
              />
            ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={24}>
          <Section label={t('settings.appearance')} icon="contrast-outline">
            {THEME_OPTIONS.map((themeOption) => (
              <Row
                key={themeOption.id}
                onPress={() => update({ themeOverride: themeOption.id })}
                label={t(themeOption.labelKey)}
                selected={settings.themeOverride === themeOption.id}
              />
            ))}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={25}>
          <Section label={t('settings.display.title')} icon="eye-outline">
            <SwitchRow
              label={t('settings.display.transliteration')}
              hint={t('settings.display.transliterationHint')}
              value={settings.showTransliteration}
              onValueChange={(v) => update({ showTransliteration: v })}
            />
            <SwitchRow
              label={t('settings.display.isolatedLetters')}
              hint={t('settings.display.isolatedLettersHint')}
              value={settings.showIsolatedLetters}
              onValueChange={(v) => update({ showIsolatedLetters: v })}
            />
          </Section>
          </AnimatedListItem>

          {appIconSupported() && (
          <AnimatedListItem index={26}>
          <Section label={t('settings.appIcon.title')} icon="color-palette-outline">
            <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
              {appIconNameSwitchSupported() ? t('settings.appIcon.hint') : t('settings.appIcon.iosHint')}
            </ThemedText>
            {APP_ICON_VARIANTS.map((variant) => (
              <Pressable
                key={variant.id}
                onPress={() => pickAppIcon(variant.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: appIconChoice === variant.id }}
                style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.rowPressed]}>
                <View style={[styles.row, rtl && styles.rowRtl]}>
                  <View style={[styles.iconSwatch, rtl && styles.iconSwatchRtl, { backgroundColor: variant.swatch }]} />
                  <ThemedText
                    type={appIconChoice === variant.id ? 'smallBold' : 'default'}
                    themeColor={appIconChoice === variant.id ? 'accent' : 'text'}
                    style={[styles.rowLabel, rtl && styles.rtlText]}>
                    {t(`settings.appIcon.variant${variant.id}`)}
                  </ThemedText>
                  {appIconChoice === variant.id && <IconSymbol name="checkmark" size={16} color={colors.accent} />}
                </View>
              </Pressable>
            ))}
          </Section>
          </AnimatedListItem>
          )}

          <AnimatedListItem index={27}>
          <Section label={t('settings.dashboard.navLabel')} icon="swap-vertical-outline">
            <Row
              onPress={() => router.push('/dashboard-reorder')}
              label={t('settings.dashboard.navHint')}
              accent
              chevron
            />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={28}>
          <Section label={t('settings.widgets.title')} icon="apps-outline">
            <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
              {t('settings.widgets.hint')}
            </ThemedText>
            <View style={styles.modelPicker}>
              <ThemedText type="smallBold" style={[styles.modelPickerTitle, rtl && styles.rtlText]}>
                {t('widgets.themeTitle')}
              </ThemedText>
              {WIDGET_THEME_KEYS.map((k) => (
                <Row
                  key={k}
                  onPress={() => {
                    // Erst persistieren, DANN die platzierten Widgets neu
                    // zeichnen — sonst läse der Widget-Renderer noch das alte
                    // Theme aus AsyncStorage. Auf Web/iOS ist refreshAllWidgets
                    // ein No-Op (s. widgets/refresh.ts).
                    void update({ widgetTheme: k }).then(() => refreshAllWidgets());
                  }}
                  label={t(`widgets.theme_${k}`)}
                  selected={settings.widgetTheme === k}
                />
              ))}
              <ThemedText type="small" themeColor="textSecondary" style={[styles.modelHint, rtl && styles.rtlText]}>
                {t('widgets.themeHint')}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
              {t('settings.widgets.perWidgetHint')}
            </ThemedText>
          </Section>
          </AnimatedListItem>

          <GroupHeader label={t('settings.groups.learning')} rtl={rtl} />

          <AnimatedListItem index={29}>
          <Section label={t('settings.pace.title')} icon="speedometer-outline">
            {DAILY_MINUTES_OPTIONS.map((minutes) => (
              <Row
                key={minutes}
                onPress={() => update({ dailyMinutes: minutes })}
                label={t(`settings.pace.min${minutes}`)}
                selected={settings.dailyMinutes === minutes}
              />
            ))}
            <SwitchRow
              label={t('settings.pace.freeUnlock')}
              hint={t('settings.pace.freeUnlockHint')}
              value={settings.freeUnlock}
              onValueChange={(v) => update({ freeUnlock: v })}
            />
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={30}>
          <Section label={t('settings.exercise.title')} icon="options-outline">
            {(['mixed', 'audio', 'reading'] as const).map((s) => (
              <Row
                key={s}
                onPress={() => update({ exerciseStyle: s })}
                label={t(`settings.exercise.${s}`)}
                selected={settings.exerciseStyle === s}
              />
            ))}
            <SwitchRow
              label={t('settings.exercise.speech')}
              hint={t('settings.exercise.speechHint')}
              value={settings.speechExercisesEnabled}
              onValueChange={(v) => update({ speechExercisesEnabled: v })}
            />
            {settings.speechExercisesEnabled && (
              <View style={styles.modelPicker}>
                <ThemedText type="smallBold" style={[styles.modelPickerTitle, rtl && styles.rtlText]}>
                  {t('settings.recitationModel.title')}
                </ThemedText>
                {(['base', 'turbo'] as const).map((m) => (
                  <Row
                    key={m}
                    onPress={() => update({ recitationModel: m })}
                    label={`${t(`settings.recitationModel.${m}`)}  ·  ${Math.round(
                      RECITATION_MODELS[m].groesse / 1_000_000,
                    )} MB`}
                    selected={settings.recitationModel === m}
                  />
                ))}
                <ThemedText type="small" themeColor="textSecondary" style={[styles.modelHint, rtl && styles.rtlText]}>
                  {t('settings.recitationModel.hint')}
                </ThemedText>
              </View>
            )}
          </Section>
          </AnimatedListItem>

          <GroupHeader label={t('settings.groups.data')} rtl={rtl} />

          <AnimatedListItem index={32}>
          <Section label={t('settings.backup.title')} icon="save-outline">
            <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
              {/* Der Datei-Export nutzt Geraete-Dateisystem + nativen Teilen-Dialog
                  (expo-file-system/expo-sharing) - auf Web nicht verfuegbar
                  (Sharing.isAvailableAsync()===false). Dort statt der nicht
                  funktionierenden Datei-Buttons der Hinweis auf die
                  Code-Uebertragung (Sync), die im Browser funktioniert. */}
              {Platform.OS === 'web' ? t('sync.intro') : t('settings.backup.hint')}
            </ThemedText>
            {Platform.OS !== 'web' && (
              <>
                <Pressable
                  onPress={exportProgress}
                  disabled={backupBusy !== null}
                  style={({ pressed }) => [pressed && styles.rowPressed]}>
                  <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
                    <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
                      <ThemedText type="default" style={rtl && styles.rtlText}>{t('settings.backup.exportButton')}</ThemedText>
                    </View>
                    {backupBusy === 'export' && <ThemedActivityIndicator size="small" />}
                  </View>
                </Pressable>
                <Pressable
                  onPress={importProgress}
                  disabled={backupBusy !== null}
                  style={({ pressed }) => [pressed && styles.rowPressed]}>
                  <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
                    <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
                      <ThemedText type="default" style={rtl && styles.rtlText}>{t('settings.backup.importButton')}</ThemedText>
                    </View>
                    {backupBusy === 'import' && <ThemedActivityIndicator size="small" />}
                  </View>
                </Pressable>
              </>
            )}
            {/* Code-basierte Uebertragung (funktioniert auch im Browser) - bisher
                nur im "Mehr"-Tab verlinkt, hier fuer bessere Auffindbarkeit
                direkt in der Sichern-Sektion. */}
            <Row onPress={() => router.push('/sync')} label={t('sync.title')} accent chevron />

            {importedReciters !== null && importedReciters.length > 0 && (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={[styles.currentValue, rtl && styles.currentValueRtl]}>
                  {t('settings.backup.downloadedRecitersNote').replace('{list}', importedReciters.join(', '))}
                </ThemedText>
                {reciterDownload.supported && (
                  <Row onPress={goToReciterDownloads} label={t('settings.backup.goToDownloads')} accent chevron />
                )}
              </>
            )}
          </Section>
          </AnimatedListItem>

          <AnimatedListItem index={33}>
          <Section label={t('settings.support.title')} icon="help-circle-outline">
            <Pressable
              onPress={copyErrorReport}
              style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.rowPressed]}>
              <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
                <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
                  <ThemedText type="default" style={rtl && styles.rtlText}>
                    {reportCopied ? t('settings.support.copied') : t('settings.support.copyReport')}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                    {t('settings.support.copyReportHint')}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Row
                onPress={() => router.push('/onboarding')}
                label={t('settings.support.replayOnboarding')}
                chevron
              />
            )}
          </Section>
          </AnimatedListItem>

          <GroupHeader label={t('settings.groups.about')} rtl={rtl} />

          <AnimatedListItem index={34}>
          <Section label={t('settings.legal')} icon="document-text-outline">
            <Row onPress={() => router.push('/impressum')} label={t('nav.impressum')} chevron />
            <Row onPress={() => router.push('/datenschutz')} label={t('nav.datenschutz')} chevron />
            <Row onPress={() => router.push('/agb')} label={t('nav.agb')} chevron />
            <Row onPress={openFeedbackMail} label={t('settings.legalFeedback')} accent chevron />
            <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
              <ThemedText type="default" style={rtl && styles.rtlText}>{t('settings.legalVersion')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                {appVersionLabel}
              </ThemedText>
            </View>
          </Section>
          </AnimatedListItem>

          {!query && (
            <Pressable
              onPress={reset}
              style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.rowPressed]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.reset}>
                {t('settings.resetDefaults')}
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>

        <EditionPicker
          visible={pickerOpen === 'reciter'}
          title={t('quran.chooseReciter')}
          editions={audioEditions ?? []}
          recommended={RECOMMENDED_RECITERS}
          selected={settings.quranReciter}
          onSelect={(id) => {
            update({ quranReciter: id });
            setPickerOpen(null);
          }}
          onClose={() => setPickerOpen(null)}
        />
        <EditionPicker
          visible={pickerOpen === 'downloadReciter'}
          title={t('settings.reciterAudioPack.chooseReciter')}
          editions={audioEditions ?? []}
          recommended={RECOMMENDED_RECITERS}
          selected={downloadReciter}
          onSelect={(id) => {
            setDownloadReciter(id);
            setPickerOpen(null);
          }}
          onClose={() => setPickerOpen(null)}
        />
        <EditionPicker
          visible={pickerOpen === 'translation'}
          title={t('quran.chooseTranslation')}
          editions={translationEditions ?? []}
          recommended={RECOMMENDED_TRANSLATIONS}
          selected={settings.quranTranslation}
          onSelect={(id) => {
            update({ quranTranslation: id });
            setPickerOpen(null);
          }}
          onClose={() => setPickerOpen(null)}
        />
        <MethodPicker
          visible={pickerOpen === 'method'}
          selected={settings.method}
          onSelect={(id) => {
            update({ method: id });
            setPickerOpen(null);
          }}
          onClose={() => setPickerOpen(null)}
        />
      </SafeAreaView>
    </ThemedView>
    </SettingsFilterContext.Provider>
  );
}

/**
 * Gruppen-Überschrift: gliedert die vielen Sektionen in wenige, klar
 * benannte Themenblöcke (Gebet / Benachrichtigungen / Koran / …). Ersetzt
 * die früheren namenlosen Hairline-Trenner (styles.groupBreak) durch eine
 * beschriftete, scanbare Hierarchie-Ebene ÜBER den Sektions-Labels.
 */
function GroupHeader({ label, rtl }: { label: string; rtl: boolean }) {
  // Bei aktiver Suche nur einblenden, wenn mindestens eine Sektion der Gruppe
  // trifft (der Provider nimmt den Gruppen-Titel dann in das Sichtbar-Set auf).
  const visible = useSectionVisible(label);
  if (!visible) return null;
  return (
    <View style={[styles.groupHeader, rtl && styles.groupHeaderRtl]}>
      <ThemedText type="smallBold" style={[styles.groupHeaderText, rtl && styles.rtlText]}>
        {label.toUpperCase()}
      </ThemedText>
      <View style={styles.groupHeaderRule} />
    </View>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon: IconName;
  children: React.ReactNode;
}) {
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const { locale } = useTranslation();
  const rtl = isRtlLocale(locale);
  // Live-Suche: Sektion verschwindet, wenn ihr Titel nicht ins Treffer-Set des
  // Providers fällt. Der umgebende AnimatedListItem-Wrapper bleibt dann leer
  // (0 Höhe) — deshalb trägt die Abstands-Logik unten `marginBottom` an der
  // Sektion selbst statt am (früheren) `gap` des ScrollView-Containers.
  const visible = useSectionVisible(label);
  if (!visible) return null;
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, rtl && styles.sectionHeaderRtl]}>
        <ThemedView type="backgroundElement" style={styles.sectionIconBadge}>
          <IconSymbol name={icon} size={13} color={colors.accent} />
        </ThemedView>
        <ThemedText
          type="smallBold"
          themeColor="textSecondary"
          style={[styles.sectionLabel, rtl && styles.rtlText]}>
          {label.toUpperCase()}
        </ThemedText>
      </View>
      <ThemedView type="backgroundElement" style={styles.sectionBody}>
        {children}
      </ThemedView>
    </View>
  );
}

function Row({
  onPress,
  label,
  selected,
  accent,
  chevron,
}: {
  onPress: () => void;
  label: string;
  selected?: boolean;
  accent?: boolean;
  chevron?: boolean;
}) {
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const { locale } = useTranslation();
  const rtl = isRtlLocale(locale);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.rowPressed]}>
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <ThemedText
          type={selected ? 'smallBold' : 'default'}
          themeColor={accent ? 'accent' : selected ? 'accent' : 'text'}
          style={[styles.rowLabel, rtl && styles.rtlText]}>
          {label}
        </ThemedText>
        {selected && <IconSymbol name="checkmark" size={16} color={colors.accent} />}
        {chevron && !selected && <DisclosureChevron size={16} color={colors.textSecondary} />}
      </View>
    </Pressable>
  );
}

function MethodPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: number;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const editions = METHODS.map((m) => ({ identifier: String(m.id), englishName: m.name, language: 'de', format: 'text' as const }));
  return (
    <EditionPicker
      visible={visible}
      title={t('settings.method')}
      editions={editions}
      recommended={['13']}
      selected={String(selected)}
      onSelect={(id) => onSelect(Number(id))}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  hourRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  hourRowRtl: { flexDirection: 'row-reverse' },
  hourChip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: 999 },
  azanRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  azanRowRtl: { flexDirection: 'row-reverse' },
  azanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 999,
    overflow: 'hidden',
  },
  azanChipLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  azanChipLabelSolo: {
    paddingRight: Spacing.three,
  },
  azanChipPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingVertical: Spacing.one,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.three,
  },
  pressed: { opacity: 0.6 },
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset },
  // Kein `gap` mehr: bei aktiver Suche rendern gefilterte Sektionen zu `null`,
  // ihr AnimatedListItem-Wrapper bliebe aber ein Flex-Kind und `gap` würde
  // leere Lücken erzeugen. Abstände liegen daher an den Elementen selbst
  // (section.marginBottom, groupHeader.marginTop/Bottom, title.marginBottom).
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth, },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  // Beschriftete Gruppen-Überschrift statt namenloser Hairline: ordnet die
  // ~30 Sektionen in wenige scanbare Themenblöcke ein (Gebet / Benachrichtigungen
  // / Koran / Sprache / Lernen / Speicher / Über). Der Titel steht als eigene
  // Hierarchie-Ebene ÜBER den Sektions-Labels; eine dünne Linie füllt den Rest
  // der Zeile als ruhiges Trenn-Signal.
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  groupHeaderRtl: { flexDirection: 'row-reverse' },
  groupHeaderText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 800,
    letterSpacing: 0.4,
  },
  groupHeaderRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,124,116,0.35)',
  },
  section: { gap: Spacing.one, marginBottom: Spacing.three },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  sectionHeaderRtl: { flexDirection: 'row-reverse' },
  sectionIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { letterSpacing: 0.5 },
  sectionBody: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(11,11,13,0.06), 0 1px 2px rgba(11,11,13,0.08)' },
      default: {
        shadowColor: '#0b0b0d',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,124,116,0.35)',
  },
  rowRtl: { flexDirection: 'row-reverse' },
  rowLabel: { flex: 1 },
  rowPressed: { opacity: 0.6 },
  iconSwatch: {
    width: 16,
    height: 16,
    borderRadius: 5,
    marginRight: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,124,116,0.35)',
  },
  iconSwatchRtl: { marginRight: 0, marginLeft: Spacing.two },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,124,116,0.35)',
  },
  switchRowRtl: { flexDirection: 'row-reverse' },
  modelPicker: {
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,124,116,0.35)',
  },
  modelPickerTitle: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  modelHint: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  switchLabel: { flex: 1, gap: 2, paddingRight: Spacing.two },
  switchLabelRtl: { paddingRight: 0, paddingLeft: Spacing.two },
  rtlText: { textAlign: 'right' },
  currentValue: { marginBottom: Spacing.one, marginLeft: Spacing.two },
  currentValueRtl: { marginLeft: 0, marginRight: Spacing.two, textAlign: 'right' },
  downloadedHeader: { marginTop: Spacing.two },
  inputWrap: { marginTop: Spacing.one },
  inputBox: { borderRadius: Spacing.two, marginBottom: Spacing.one },
  textInput: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, fontSize: 15 },
  savedLocationsWrap: { marginTop: Spacing.two, marginBottom: Spacing.one },
  savedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  savedLocationRowRtl: { flexDirection: 'row-reverse' },
  savedLocationMain: { flex: 1, gap: 1 },
  savedLocationDelete: { padding: Spacing.one },
  reset: { textAlign: 'center', marginTop: Spacing.three },
  pressableWeb: { cursor: 'pointer' },
});
