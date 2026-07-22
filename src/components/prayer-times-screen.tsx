import { Link, router } from 'expo-router';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WebTopBar } from '@/components/web-top-bar';
import { useHydrated } from '@/hooks/use-hydrated';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { HIJRI_MONTHS } from '@/features/calendar/offline';
import { fastCountdown, isRamadanMonth } from '@/features/fasting/store';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { formatClock, formatCountdown, formatHHMM, nextPrayer, PRAYERS } from '@/features/prayer-times/next-prayer';
import { formatIqama } from '@/features/prayer-times/iqama';
import type { IqamaOffsets } from '@/features/settings/types';
import {
  requestNotificationPermission,
  rescheduleNotifications,
  updateOngoingCountdown,
} from '@/features/prayer-times/notifications';
import { updatePrayerLiveActivity } from '@/features/prayer-times/live-activity';
import { fetchUpcomingTimings } from '@/features/prayer-times/api';
import { rescheduleJumuahReminder } from '@/features/prayer-times/jumuahReminder';
import { rescheduleSunnahReminders } from '@/features/prayer-times/sunnahReminders';
import { reschedulePreAdhanReminders } from '@/features/prayer-times/preAdhanReminder';
import { rescheduleVerseOfDayReminder } from '@/features/verseOfDay/notifications';
import { rescheduleUdhiyahReminder } from '@/features/udhiyah/notifications';
import { rescheduleWeeklySummary } from '@/features/weeklySummary/notifications';
import { buildPrayerIcs } from '@/features/prayer-times/ics';
import { useTimings } from '@/features/prayer-times/hooks';
import { updateIosWidget } from '@/features/prayer-times/ios-widget';
import { distanceToMeccaKm, qiblaBearing } from '@/features/qibla/bearing';
import { updateWearComplication } from '@/features/prayer-times/wear-sync';
import { azanSource } from '@/features/prayer-times/azan';
import { getTravelStatus } from '@/features/prayer-times/travelMode';
import {
  DASHBOARD_LOCKED_CARDS,
  normalizeDashboardCardOrder,
  type DashboardCardId,
} from '@/features/dashboard/dashboardCards';
import { useSettings } from '@/features/settings/store';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useSsrSafeAudioPlayer } from '@/lib/ssrSafeAudio';
import { useTranslation } from '@/lib/i18n';

// Gleiche Icon-Zuordnung wie die Fasten-Tracker-Karte (app/fasting.tsx), damit
// beide Karten für dieselbe Phase dasselbe Icon zeigen.
const RAMADAN_PHASE_ICON: Record<string, IconName> = {
  suhoor: 'moon',
  iftar: 'sunny',
  done: 'sparkles',
};

export default function PrayerTimesScreen() {
  const { settings, update } = useSettings();
  // Voller Adhan (User-Wunsch): spielt in der App, nicht als System-Ton
  // (Formatlimits der OS-Benachrichtigungstöne, s. AzanChoice-Kommentar).
  const azanPlayer = useSsrSafeAudioPlayer(azanSource(settings.azanChoice) ?? undefined);
  function playAzan() {
    azanPlayer.seekTo(0);
    azanPlayer.play();
  }
  const { t, locale } = useTranslation();
  const { data, isLoading, isError, refetch } = useTimings();
  const { requestLocation, loading: locLoading } = useDeviceLocation();
  const [now, setNow] = useState(() => new Date());
  // Hydration-Guard (Web/Static-Export): die Uhr ist im vorgerenderten HTML
  // auf die Build-Zeit eingebacken — bis zur Hydration neutralen Platzhalter
  // zeigen, sonst React-#418-Hydration-Mismatch auf jedem Seitenaufruf.
  const mounted = useHydrated();
  // Tablet/Desktop: mehr Bühne für den Hero, Karten nebeneinander.
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  // Reise-Modus: `homeLocation` bleibt fix, `location` ist der aktuell für
  // die Gebetszeiten-Berechnung genutzte Standort — weicht er >85 km vom
  // Heimatort ab, gilt der Nutzer als "auf Reisen" (s. features/prayer-times/travelMode.ts).
  const travelStatus = useMemo(
    () => getTravelStatus(settings.homeLocation, { lat: settings.location.lat, lon: settings.location.lon }),
    [settings.homeLocation, settings.location.lat, settings.location.lon],
  );
  const showTravelBanner = settings.travelModeEnabled && travelStatus.isTraveling;

  // Nutzer-eigene Karten-Reihenfolge/Sichtbarkeit (Einstellungen ->
  // Dashboard anpassen, siehe app/dashboard-reorder.tsx). normalize... füllt
  // fehlende Karten-IDs robust auf (App-Update mit neuer Karte, altes
  // Storage-Format), damit nie eine Karte verschwindet.
  const visibleCardIds = useMemo(
    () =>
      normalizeDashboardCardOrder(settings.dashboardCardOrder).filter(
        (id) => DASHBOARD_LOCKED_CARDS.includes(id) || !settings.dashboardHiddenCards.includes(id),
      ),
    [settings.dashboardCardOrder, settings.dashboardHiddenCards],
  );

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Notifications neu planen, sobald frische Timings da sind — für die
  // nächsten 7 Tage im Voraus (vorher nur heute: wer die App einen Tag nicht
  // öffnete, bekam gar keine Benachrichtigung mehr; User-Gerätebug 2026-07-16).
  useEffect(() => {
    if (!data?.today || Platform.OS === 'web') return;
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      const week = await fetchUpcomingTimings(
        settings.location.lat,
        settings.location.lon,
        settings.method,
        settings.school,
        7,
      );
      const days = week.length > 0 ? week : [{ date: new Date(), timings: data.today }];
      await rescheduleNotifications(
        days,
        settings.notificationsEnabled,
        settings.notificationPrefs,
        new Date(),
        locale,
        settings.timeFormat,
      );
      // Jumu'ah-, Sunnah- und Pre-Adhan-Erinnerungen nutzen dasselbe schon
      // geladene 7-Tage-Fenster — kein zusätzlicher Netzwerk-Request nötig.
      await rescheduleJumuahReminder(days, settings.jumuahReminderEnabled, new Date(), locale, settings.timeFormat);
      await rescheduleSunnahReminders(
        days,
        {
          duha: settings.sunnahDuhaEnabled,
          tahajjud: settings.sunnahTahajjudEnabled,
          witr: settings.sunnahWitrEnabled,
        },
        new Date(),
        locale,
      );
      await reschedulePreAdhanReminders(
        days,
        settings.preAdhanReminderEnabled,
        settings.notificationsEnabled,
        settings.preAdhanReminderOffset,
        new Date(),
        locale,
        settings.timeFormat,
      );
    })();
  }, [
    data?.today,
    settings.notificationsEnabled,
    settings.timeFormat,
    settings.notificationPrefs,
    settings.location.lat,
    settings.location.lon,
    settings.method,
    settings.school,
    settings.jumuahReminderEnabled,
    settings.sunnahDuhaEnabled,
    settings.sunnahTahajjudEnabled,
    settings.sunnahWitrEnabled,
    settings.preAdhanReminderEnabled,
    settings.preAdhanReminderOffset,
    locale,
  ]);

  // Vers/Hadith-des-Tages-Erinnerung selbstheilend neu planen — analog zu den
  // Gebets-Notifications oben: der Start-Tab wird praktisch bei jedem
  // App-Besuch gerendert, das rollierende Mehrtage-Fenster (s. features/
  // verseOfDay/notifications.ts) bleibt dadurch auch ohne Settings-Besuch
  // gefüllt. No-op-Skip, solange die Erinnerung nicht aktiviert ist (Opt-in,
  // Default aus).
  useEffect(() => {
    if (!settings.verseOfDayReminderEnabled || Platform.OS === 'web') return;
    rescheduleVerseOfDayReminder(
      true,
      settings.verseOfDayReminderHour,
      locale,
      settings.hadithLanguage,
    ).catch(() => {});
  }, [settings.verseOfDayReminderEnabled, settings.verseOfDayReminderHour, settings.hadithLanguage, locale]);

  // Wochenzusammenfassung selbstheilend neu planen — gleiches Prinzip wie
  // oben bei Vers/Hadith: der WEEKLY-Trigger legt den Text einmal beim
  // Scheduling fest (s. features/weeklySummary/notifications.ts), ein
  // Besuch des Start-Tabs hält die eingebetteten Zahlen aktuell, ohne dass
  // der Nutzer extra die Einstellungen öffnen muss.
  useEffect(() => {
    if (!settings.weeklySummaryReminderEnabled || Platform.OS === 'web') return;
    rescheduleWeeklySummary(true, locale).catch(() => {});
  }, [settings.weeklySummaryReminderEnabled, locale]);

  // Udhiyah/Qurbani-Erinnerung selbstheilend neu planen — gleiches Prinzip
  // wie Wochenzusammenfassung oben: der Termin liegt fest (ein paar Tage vor
  // Eid al-Adha, s. features/udhiyah/eidAdha.ts), ein Besuch des Start-Tabs
  // sorgt dafür, dass nach jedem verstrichenen Eid al-Adha automatisch fürs
  // nächste Hijri-Jahr neu geplant wird, ohne dass der Nutzer die
  // Einstellungen erneut öffnen muss.
  useEffect(() => {
    if (!settings.udhiyahReminderEnabled || Platform.OS === 'web') return;
    rescheduleUdhiyahReminder(true, locale).catch(() => {});
  }, [settings.udhiyahReminderEnabled, locale]);

  const next = useMemo(() => {
    if (!data) return null;
    return nextPrayer(data.today, data.tomorrow, now);
  }, [data, now]);

  // Ramadan-Suhoor/Iftar-Karte: nur sichtbar während des Hijri-Monats Ramadan
  // (Erkennung wiederverwendet aus features/fasting/store.ts, dieselbe Stelle
  // die auch der Fasten-Tracker für seine Countdown-Karte nutzt). Läuft am
  // selben `now`-Sekundentakt mit wie der Hero-Countdown oben, kein eigenes
  // Interval nötig.
  const ramadanCountdown = useMemo(() => {
    if (!data?.today || !data.hijri || !isRamadanMonth(data.hijri.month.number)) return null;
    return fastCountdown(data.today.Fajr, data.today.Maghrib, now);
  }, [data, now]);

  // Dauerhafte "nächstes Gebet"-Notification (Opt-in, Android) — bewusst
  // NICHT an `now` gekoppelt (das würde bei jedem Sekunden-Tick neu planen).
  // Nur wenn sich das nächste Gebet selbst ändert (max. 5x/Tag), wird die
  // Notification-Anzeige aktualisiert.
  const nextPrayerTs = next?.nextTs.getTime();
  useEffect(() => {
    if (!next) return;
    updateOngoingCountdown(next, settings.notificationPrefs, locale, settings.timeFormat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next?.nextPrayer, nextPrayerTs, settings.notificationPrefs, locale, settings.timeFormat]);

  // iOS Live Activity ("nächstes Gebet") — Pendant zur obigen Android-
  // Ongoing-Notification, gleiches Prinzip (nur bei Wechsel des nächsten
  // Gebets aktualisieren, nicht sekündlich). No-op auf Android/Web, s.
  // live-activity.ts (Metro-Platform-Split, live-activity.ios.tsx hat die
  // echte Implementierung).
  useEffect(() => {
    if (!next) return;
    updatePrayerLiveActivity(next, settings.notificationPrefs, locale, settings.timeFormat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next?.nextPrayer, nextPrayerTs, settings.notificationPrefs, locale, settings.timeFormat]);

  // iOS-Homescreen-Widget (WidgetKit-Extension, targets/salati-widget/) mit
  // frischen Zeiten versorgen — no-op auf Android/Web (Guard in ios-widget.ts).
  // Android hat sein Pendant bereits über react-native-android-widget +
  // src/widgets/widget-task-handler.tsx, der eigenständig AsyncStorage liest.
  useEffect(() => {
    if (!data) return;
    updateIosWidget({
      locationLabel: settings.location.label,
      today: data.today,
      tomorrow: data.tomorrow,
      timeFormat: settings.timeFormat,
      qiblaBearing: qiblaBearing(settings.location.lat, settings.location.lon),
      qiblaDistanceKm: distanceToMeccaKm(settings.location.lat, settings.location.lon),
      widgetTheme: settings.widgetTheme,
    });
  }, [
    data,
    settings.location.label,
    settings.location.lat,
    settings.location.lon,
    settings.timeFormat,
    settings.widgetTheme,
  ]);

  // WearOS-Tile (android/wear/, siehe wear-sync.ts) mit frischen Zeiten
  // versorgen — no-op auf iOS/Web und solange das native Bridge-Modul nicht
  // gebaut ist (siehe Kommentar in wear-sync.ts).
  useEffect(() => {
    if (!data) return;
    updateWearComplication({
      locationLabel: settings.location.label,
      today: data.today,
      tomorrow: data.tomorrow,
      timeFormat: settings.timeFormat,
    });
  }, [data, settings.location.label, settings.timeFormat]);

  // 30 Tage Gebetszeiten als .ics: Web = Download, nativ = System-Share-Sheet
  // (Datei -> Kalender-App importieren).
  async function exportIcs() {
    const days = await fetchUpcomingTimings(
      settings.location.lat,
      settings.location.lon,
      settings.method,
      settings.school,
      30,
    );
    if (days.length === 0) return;
    const names = Object.fromEntries(
      PRAYERS.map((p) => [p, t(`prayers.${p.toLowerCase()}`)]),
    ) as Record<(typeof PRAYERS)[number], string>;
    const ics = buildPrayerIcs(days, names, settings.location.label);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'salati-gebetszeiten.ics';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sharing = require('expo-sharing') as typeof import('expo-sharing');
      const path = `${FileSystem.cacheDirectory}salati-gebetszeiten.ics`;
      await FileSystem.writeAsStringAsync(path, ics);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/calendar', dialogTitle: t('prayer.icsExport') });
      }
    } catch {
      // Sharing nicht verfügbar (z. B. Modul fehlt im alten Build) — still.
    }
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

  // Home-Dashboard-Karten (Einstellungen -> Dashboard anpassen, siehe
  // app/dashboard-reorder.tsx): Hero/Ramadan-Karte/Reise-Banner/Gebetszeiten-
  // Tabelle werden hier je einmal gebaut und unten anhand von
  // `visibleCardIds` in Nutzer-Reihenfolge gerendert — Hero und Tabelle sind
  // Kernfunktion und daher immer dabei (DASHBOARD_LOCKED_CARDS), Ramadan-
  // Karte/Reise-Banner bleiben zusätzlich an ihre bisherige fachliche
  // Sichtbarkeitsbedingung geknüpft (nur während Ramadan bzw. auf Reisen).
  const heroCard = (
          <ImageBackground
            source={require('../../assets/images/guides/kaaba.jpg')}
            style={[styles.hero, wide && styles.heroWide]}
            imageStyle={styles.heroImage}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroTop}>
              {/* Hero-Karte hat eine feste Bildhöhe (styles.hero) — bei sehr
                  großer System-Schriftgröße würde ungebremstes Skalieren den
                  Text über das Foto hinaus wachsen lassen (Nutzerfund: bei
                  font_scale 2.0 überlappte "Maghrib · 21:24" sichtbar die
                  Kaaba-Aufnahme). maxFontSizeMultiplier=1.3 auf diesem reinen
                  UI-Chrome-Text (Uhrzeit/Ort/Countdown, kein Lesetext) hält
                  die Karte intakt, während Nutzer weiterhin eine spürbar
                  größere Schrift bekommen (Apple/Google-Empfehlung: Cap für
                  UI-Chrome, unbegrenzt nur für Lesetext). */}
              <ThemedText type="small" style={styles.heroMuted} maxFontSizeMultiplier={1.3}>
                {settings.location.label}
              </ThemedText>
              <View style={styles.heroActions}>
                <Pressable
                  onPress={() => router.push('/search')}
                  style={({ pressed }) => [
                    styles.settingsBtn,
                    Platform.OS === 'web' ? styles.pressableWeb : undefined,
                    pressed && styles.pressed,
                  ]}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.search')}>
                  <IconSymbol name="search" size={18} color="#f7f3ea" />
                </Pressable>
                <Link href="/settings" asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.settingsBtn,
                      Platform.OS === 'web' ? styles.pressableWeb : undefined,
                      pressed && styles.pressed,
                    ]}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('nav.settings')}>
                    <IconSymbol name="settings-outline" size={18} color="#f7f3ea" />
                  </Pressable>
                </Link>
              </View>
            </View>
            <View style={styles.heroBottom}>
              <ThemedText type="title" style={styles.heroClock} maxFontSizeMultiplier={1.3}>
                {mounted ? formatClock(now.getHours(), now.getMinutes(), settings.timeFormat) : '--:--'}
              </ThemedText>
              {mounted && next && (
                <View style={styles.heroNext}>
                  <ThemedText type="smallBold" style={styles.heroGold} maxFontSizeMultiplier={1.3}>
                    {t(`prayers.${next.nextPrayer.toLowerCase()}`)}
                    {' · '}
                    {formatHHMM(
                      next.nextIdx >= 0 && data ? data.today[next.nextPrayer] : (data?.tomorrow.Fajr ?? ''),
                      settings.timeFormat,
                    )}
                  </ThemedText>
                  <ThemedText type="small" style={styles.heroMuted} maxFontSizeMultiplier={1.3}>
                    {t('prayer.timeLeft').replace('{time}', formatCountdown(next.diffMs))}
                  </ThemedText>
                </View>
              )}
            </View>
          </ImageBackground>
  );

  const ramadanCard: ReactNode = mounted && ramadanCountdown && (
            <PressableCard
              onPress={() => router.push('/fasting')}
              style={styles.ramadanCard}
              accessibilityLabel={t('fasting.ramadanCard.heading')}>
              <View style={styles.ramadanRow}>
                <IconSymbol
                  name={RAMADAN_PHASE_ICON[ramadanCountdown.phase] ?? 'moon'}
                  size={18}
                  color={Brand.gold}
                />
                <ThemedText type="smallBold" themeColor="accent" style={styles.ramadanHeading}>
                  {t('fasting.ramadanCard.heading')}
                </ThemedText>
                <DisclosureChevron size={16} color={colors.textSecondary} />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {ramadanCountdown.phase === 'suhoor'
                  ? t('fasting.untilSuhoorEnd')
                  : ramadanCountdown.phase === 'iftar'
                    ? t('fasting.untilIftar')
                    : t('fasting.afterIftar')}
              </ThemedText>
              {ramadanCountdown.phase !== 'done' && (
                <ThemedText type="default" themeColor="accent" style={styles.ramadanCountdown}>
                  {formatCountdown(ramadanCountdown.msRemaining)}
                </ThemedText>
              )}
            </PressableCard>
  );

  const travelCard: ReactNode = showTravelBanner && (
            <ThemedView type="backgroundElement" style={styles.travelCard}>
              <View style={styles.travelRow}>
                <IconSymbol name="airplane-outline" size={20} color={colors.accent} />
                <View style={styles.travelText}>
                  <ThemedText type="smallBold" themeColor="accent">
                    {t('prayer.travel.banner').replace('{km}', String(Math.round(travelStatus.distanceKm)))}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('prayer.travel.qasrDesc')}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
  );

  const prayerTableCard = (
    <>
      {isLoading && (
        <View style={styles.center}>
          <ThemedActivityIndicator />
          <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
            {t('prayer.loading')}
          </ThemedText>
        </View>
      )}

      {isError && !isLoading && (
        <View style={styles.center}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('prayer.unavailable')}
          </ThemedText>
        </View>
      )}

      {data && (
            <>
              <ThemedView type="backgroundElement" style={[styles.table, wide && styles.tableWide]}>
                {/* Shuruq als reine Info-Zeile nach Fajr (Audit 2026-07-19 D4):
                    kein Gebet, daher nie als "nächstes" markiert und optisch
                    zurückgenommen - die Zeit steckt längst in der API-Antwort. */}
                {(['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map((p, i) => {
                  const prayerIdx = p === 'Sunrise' ? -1 : PRAYERS.indexOf(p);
                  const isNext = prayerIdx >= 0 && next?.nextIdx === prayerIdx;
                  const isInfo = p === 'Sunrise';
                  // Iqama (Beginn des Gemeinschaftsgebets) gibt es nur für die
                  // 5 Pflichtgebete, nicht für die Shuruq-Infozeile.
                  const showIqama = settings.iqamaEnabled && !isInfo;
                  return (
                    <AnimatedListItem key={p} index={i}>
                      {/* Nächstes Gebet bekommt zusätzlich zum Farbton eine
                          linke Akzentkante + ein Uhr-Icon - reine Farbe allein
                          war auf hellen Themes zu subtil, um auf den ersten
                          Blick als "das hier ist wichtig" zu lesen. */}
                      <View style={[styles.row, isNext && styles.rowNext]}>
                        <View style={styles.rowLabelGroup}>
                          {isNext && <IconSymbol name="time-outline" size={14} color={Brand.gold} />}
                          <ThemedText
                            type={isNext ? 'smallBold' : isInfo ? 'small' : 'default'}
                            themeColor={isNext ? 'accent' : isInfo ? 'textSecondary' : 'text'}>
                            {isInfo ? t('prayer.sunrise') : t(`prayers.${p.toLowerCase()}`)}
                          </ThemedText>
                        </View>
                        <View style={styles.timeCol}>
                          <ThemedText
                            type={isNext ? 'smallBold' : isInfo ? 'small' : 'default'}
                            themeColor={isNext ? 'accent' : isInfo ? 'textSecondary' : 'text'}>
                            {formatHHMM(data.today[p], settings.timeFormat)}
                          </ThemedText>
                          {showIqama && (
                            <ThemedText type="small" themeColor="textSecondary">
                              {t('prayer.iqama')}{' '}
                              {formatIqama(
                                data.today[p],
                                settings.iqamaOffsets[p.toLowerCase() as keyof IqamaOffsets],
                                now,
                                settings.timeFormat,
                              )}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    </AnimatedListItem>
                  );
                })}
              </ThemedView>

              {data.hijri && (
                <View style={styles.hijriRow}>
                  <IconSymbol name="moon-outline" size={13} color={colors.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {data.hijri.day}. {HIJRI_MONTHS[locale][Number(data.hijri.month.number) - 1] ?? data.hijri.month.en}{' '}
                    {data.hijri.year} {t('calendar.hijriSuffix')}
                  </ThemedText>
                </View>
              )}
            </>
      )}
    </>
  );

  const cardContent: Record<DashboardCardId, ReactNode> = {
    hero: heroCard,
    ramadanCard,
    travelBanner: travelCard,
    prayerTable: prayerTableCard,
  };

  return (
    <ThemedView style={styles.container}>
      {Platform.OS === 'web' && <WebTopBar />}
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {visibleCardIds.map((id) => (
            <Fragment key={id}>{cardContent[id]}</Fragment>
          ))}

          {/* Aktionsleiste (Audit 2026-07-22): ≥44pt Chips statt gedrängter
              Text-Links; die Primäraktion (Wochenübersicht) ist als gefüllter
              Akzent-Chip hervorgehoben, der Rest als ruhige Sekundär-Chips. */}
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push('/prayer-times-week')}
              accessibilityRole="button"
              accessibilityLabel={t('prayer.weekView')}
              style={({ pressed }) => [
                styles.actionChip,
                { backgroundColor: colors.accent },
                Platform.OS === 'web' ? styles.pressableWeb : undefined,
                pressed && styles.pressed,
              ]}>
              <IconSymbol name="grid-outline" size={16} color={colors.background} />
              <ThemedText type="smallBold" style={{ color: colors.background }}>
                {t('prayer.weekView')}
              </ThemedText>
            </Pressable>
            {settings.azanChoice !== 'default' && (
              <Pressable
                onPress={playAzan}
                accessibilityRole="button"
                accessibilityLabel={t('prayer.playAzan')}
                style={({ pressed }) => [styles.actionChip, styles.actionChipSecondary, Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
                <IconSymbol name="musical-notes-outline" size={16} color={colors.accent} />
                <ThemedText type="smallBold" themeColor="accent">
                  {t('prayer.playAzan')}
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={exportIcs}
              accessibilityRole="button"
              accessibilityLabel={t('prayer.icsExport')}
              style={({ pressed }) => [styles.actionChip, styles.actionChipSecondary, Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
              <IconSymbol name="calendar-outline" size={16} color={colors.accent} />
              <ThemedText type="smallBold" themeColor="accent">
                {t('prayer.icsExport')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={useMyLocation}
              accessibilityRole="button"
              accessibilityLabel={t('common.useLocation')}
              style={({ pressed }) => [styles.actionChip, styles.actionChipSecondary, Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
              <IconSymbol name="locate-outline" size={16} color={colors.accent} />
              <ThemedText type="smallBold" themeColor="accent">
                {locLoading ? t('common.locating') : t('common.useLocation')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => refetch()}
              accessibilityRole="button"
              accessibilityLabel={t('common.refresh')}
              style={({ pressed }) => [styles.actionChip, styles.actionChipSecondary, Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
              <IconSymbol name="refresh-outline" size={16} color={colors.textSecondary} />
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('common.refresh')}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const cardShadow = Platform.select({
  web: { boxShadow: '0 1px 3px rgba(11,11,13,0.06), 0 1px 2px rgba(11,11,13,0.08)' },
  default: {
    shadowColor: '#0b0b0d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
}) as object;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  heroActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // Höherer Scrim + feiner Ring, damit die Icons auch über hellen Bildstellen
    // der Kaaba-Aufnahme klar lesbar bleiben (Audit 2026-07-22).
    backgroundColor: 'rgba(11,11,13,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(247,243,234,0.35)',
  },
  pressed: { opacity: 0.6 },
  hero: {
    width: '100%',
    height: 230,
    borderRadius: Spacing.four,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  heroWide: { height: 300 },
  heroImage: { borderRadius: Spacing.four },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,13,0.45)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBottom: { gap: Spacing.one },
  heroClock: { color: '#f7f3ea', fontSize: 44, lineHeight: 50 },
  heroNext: { gap: 2 },
  heroGold: { color: '#d4af37' },
  heroMuted: { color: 'rgba(247,243,234,0.85)' },
  center: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  travelCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    width: '100%',
    maxWidth: 400,
    ...cardShadow,
  },
  travelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  travelText: { flex: 1, gap: 2 },
  ramadanCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.one,
  },
  ramadanRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  ramadanHeading: { flex: 1 },
  ramadanCountdown: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  table: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.one,
    ...cardShadow,
  },
  tableWide: { maxWidth: 560 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  rowNext: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderLeftWidth: 3,
    borderLeftColor: Brand.gold,
    paddingLeft: Spacing.two - 3,
  },
  rowLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  timeCol: { alignItems: 'flex-end', gap: 1 },
  hijriRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 44,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  actionChipSecondary: {
    // Neutraler, in beiden Themes ruhiger Chip-Grund.
    backgroundColor: 'rgba(128,124,116,0.14)',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: Spacing.two,
    rowGap: Spacing.two,
    marginTop: Spacing.two,
  },
  pressableWeb: { cursor: 'pointer' },
});
