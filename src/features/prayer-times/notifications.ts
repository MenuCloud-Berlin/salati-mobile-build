import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Timings } from './api';
import { formatHHMM, parseTimeOn, PRAYERS, type NextPrayerResult, type Prayer, type TimeFormat } from './next-prayer';
import type { NotificationPrefs, NotificationToggles } from '@/features/settings/types';

// Gebetsnamen sind Eigennamen (Fajr, Dhuhr, ...) — nur der Satz drumherum
// wird lokalisiert. {p} wird durch den Gebetsnamen ersetzt.
// {time} steht im Titel (nicht nur im Body), damit die Uhrzeit auch in der
// eingeklappten/Kurz-Ansicht der System-Notification sichtbar ist — Nutzer-
// Feedback: mehrere Gebetszeiten-Notifications kamen gebündelt/verspätet
// an (Android-Batching bei fehlender Exact-Alarm-Berechtigung), ohne
// Uhrzeit in der Notification selbst war dann nicht erkennbar, für welches
// Gebet/welche Zeit sie eigentlich galt.
const PRAYER_REMINDER_TEXT: Record<string, { title: string; body: string }> = {
  de: { title: '{p}-Zeit · {time}', body: 'Es ist Zeit für das {p}-Gebet ({time}).' },
  en: { title: '{p} time · {time}', body: 'It is time for the {p} prayer ({time}).' },
  tr: { title: '{p} vakti · {time}', body: '{p} namazının vakti geldi ({time}).' },
  ar: { title: 'حان وقت {p} · {time}', body: 'حان الآن وقت صلاة {p} ({time}).' },
  es: { title: 'Hora de {p} · {time}', body: 'Es la hora de la oración de {p} ({time}).' },
  fr: { title: 'Heure de {p} · {time}', body: "C'est l'heure de la prière de {p} ({time})." },
};

// Für Arabisch die echten arabischen Gebetsnamen statt der Transliteration.
const PRAYER_NAMES_AR: Record<Prayer, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

/** Exportiert für Wiederverwendung außerhalb (live-activity.tsx, iOS). */
export function prayerName(p: Prayer, locale: string): string {
  return locale === 'ar' ? PRAYER_NAMES_AR[p] : p;
}

/**
 * Titel/Text für "nächstes Gebet, feste Uhrzeit" — gemeinsam von Androids
 * dauerhafter Notification (updateOngoingCountdown) UND der iOS Live
 * Activity (live-activity.tsx) genutzt, damit beide Plattformen exakt
 * denselben Wortlaut zeigen statt zweier getrennt gepflegter Übersetzungen.
 */
export function formatOngoingCountdownText(
  next: NextPrayerResult,
  locale: string,
  timeFormat: TimeFormat,
): { title: string; prayer: string; time: string; body: string } {
  const text = ONGOING_COUNTDOWN_TEXT[locale] ?? ONGOING_COUNTDOWN_TEXT.de;
  const time = formatHHMM(
    `${String(next.nextTs.getHours()).padStart(2, '0')}:${String(next.nextTs.getMinutes()).padStart(2, '0')}`,
    timeFormat,
  );
  const prayer = prayerName(next.nextPrayer, locale);
  return { title: text.title, prayer, time, body: text.body.replace('{p}', prayer).replace('{time}', time) };
}

/** Alle Gebets-Notifications tragen dieses Prefix — NUR diese werden beim
 * Neuplanen gelöscht (cancelAll löschte vorher auch die Lern-Erinnerung mit). */
const PRAYER_NOTIFICATION_PREFIX = 'prayer-';

/** Feste, nicht wegwischbare "nächstes Gebet"-Notification — eigene ID,
 * bleibt von rescheduleNotifications' Prefix-Löschung unberührt. */
const ONGOING_NOTIFICATION_ID = 'prayer-ongoing';

const ONGOING_COUNTDOWN_TEXT: Record<string, { title: string; body: string }> = {
  de: { title: 'Nächstes Gebet', body: '{p} um {time}' },
  en: { title: 'Next prayer', body: '{p} at {time}' },
  tr: { title: 'Sıradaki namaz', body: 'Saat {time} - {p}' },
  ar: { title: 'الصلاة القادمة', body: '{p} الساعة {time}' },
  es: { title: 'Próxima oración', body: '{p} a las {time}' },
  fr: { title: 'Prochaine prière', body: '{p} à {time}' },
};

export async function requestNotificationPermission(): Promise<boolean> {
  // expo-notifications hat auf Web keinen Scheduling-Support (Stub wirft
  // UnavailabilityError) — der Gebetszeiten-Screen ist dort unter /prayer
  // erreichbar und darf dadurch nicht crashen.
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: true },
  });
  return status === 'granted';
}

/**
 * Android-Notification-Channels sind nach Erstellung UNVERÄNDERLICH — die
 * Nutzer-Einstellungen (Ton/Vibration/Heads-up) stecken deshalb in der
 * Channel-ID; bei geänderten Prefs entsteht ein neuer Channel.
 * Heads-up ("über allen anderen Apps") = Importance MAX.
 */
export function prayerChannelId(prefs: NotificationPrefs): string {
  return `prayer-s${prefs.sound ? 1 : 0}v${prefs.vibrate ? 1 : 0}h${prefs.headsUp ? 1 : 0}`;
}

async function ensurePrayerChannel(prefs: NotificationPrefs): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  const id = prayerChannelId(prefs);
  await Notifications.setNotificationChannelAsync(id, {
    name: 'Gebetszeiten · Prayer times',
    importance: prefs.headsUp
      ? Notifications.AndroidImportance.MAX
      : Notifications.AndroidImportance.DEFAULT,
    // Native Channel-API (expo-notifications 57): 'sound' fehlt im Objekt =>
    // System-Standardton, 'sound: null' => stumm, 'sound: "<name>"' => sucht
    // eine eigene Sound-Resource mit diesem Namen. Der String 'default' war
    // hier fälschlich als Custom-Sound-Dateiname gedacht (existiert nicht),
    // loggte bei jedem Channel-Erstellen "Custom sound 'default' not found"
    // UND lieferte für sound:true vermutlich gar keinen Ton statt des
    // System-Standardtons. undefined lässt den Key beim Bridge-Marshalling
    // weg (=> Standardton), null erzwingt explizit Stille.
    sound: prefs.sound ? undefined : null,
    vibrationPattern: prefs.vibrate ? [0, 300, 200, 300] : undefined,
    enableVibrate: prefs.vibrate,
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  return id;
}

export interface DayTimings {
  /** Kalendertag, auf den sich die Zeiten beziehen */
  date: Date;
  timings: Timings;
}

/**
 * Plant lokale Gebets-Notifications für MEHRERE Tage im Voraus (statt nur
 * heute — vorher gab es keine Benachrichtigungen mehr, sobald die App einen
 * Tag lang nicht geöffnet wurde). iOS erlaubt 64 geplante Notifications:
 * 5 Gebete × 7 Tage = 35 + Lern-Erinnerung bleibt im Rahmen.
 * Löscht ausschließlich eigene (prayer-*) Planungen.
 */
export async function rescheduleNotifications(
  days: DayTimings[],
  enabled: NotificationToggles,
  prefs: NotificationPrefs,
  now: Date = new Date(),
  locale: string = 'de',
  timeFormat: TimeFormat = '24h',
): Promise<void> {
  if (Platform.OS === 'web') return; // kein Scheduling-Support, s. o.

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.identifier.startsWith(PRAYER_NOTIFICATION_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const channelId = await ensurePrayerChannel(prefs);
  const text = PRAYER_REMINDER_TEXT[locale] ?? PRAYER_REMINDER_TEXT.de;

  for (const day of days) {
    for (const prayer of PRAYERS) {
      if (!enabled[prayer.toLowerCase() as keyof NotificationToggles]) continue;
      const time = day.timings[prayer];
      if (!time) continue;
      const date = parseTimeOn(time, day.date);
      if (date.getTime() <= now.getTime()) continue; // schon vorbei — nicht planen
      const displayTime = formatHHMM(time, timeFormat);

      await Notifications.scheduleNotificationAsync({
        identifier: `${PRAYER_NOTIFICATION_PREFIX}${date.toISOString().slice(0, 10)}-${prayer}`,
        content: {
          title: text.title.replace('{p}', prayerName(prayer, locale)).replace('{time}', displayTime),
          body: text.body.replace('{p}', prayerName(prayer, locale)).replace('{time}', displayTime),
          sound: prefs.sound,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId,
        },
      });
    }
  }
}

/**
 * Dauerhafte "nächstes Gebet"-Notification (Android-only, Opt-in über
 * prefs.ongoingCountdown). Zeigt eine feste Uhrzeit statt eines live
 * tickenden Countdowns — expo-notifications exponiert Androids
 * Chronometer-Style nicht, ein falscher "Live"-Anspruch wäre irreführend.
 * Aufrufer soll dies NUR bei Wechsel des nächsten Gebets neu aufrufen
 * (nicht sekündlich), sonst entsteht unnötiger Schedule-Spam.
 */
export async function updateOngoingCountdown(
  next: NextPrayerResult,
  prefs: NotificationPrefs,
  locale: string,
  timeFormat: TimeFormat,
): Promise<void> {
  if (Platform.OS !== 'android') return; // iOS hat kein Ongoing/Sticky-Äquivalent hierfür
  if (!prefs.ongoingCountdown) {
    await Notifications.cancelScheduledNotificationAsync(ONGOING_NOTIFICATION_ID).catch(() => {});
    await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID).catch(() => {});
    return;
  }
  const channelId = await ensurePrayerChannel(prefs);
  const text = formatOngoingCountdownText(next, locale, timeFormat);
  await Notifications.scheduleNotificationAsync({
    identifier: ONGOING_NOTIFICATION_ID,
    content: {
      title: text.title,
      body: text.body,
      sticky: true,
      autoDismiss: false,
      sound: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(), channelId },
  });
}
