// Optionale Erinnerungen an freiwillige (Sunnah/Nafl-)Gebete: Duha, Tahajjud,
// Witr. Alle drei einzeln togglebar, Default AUS (wie reviewReminder/adhkar/
// verseOfDay — tägliche Extra-Notifications sind nicht für jeden gewünscht).
//
// Zeitpunkte sind bewusst RELATIV zu den ohnehin berechneten Gebetszeiten
// (features/prayer-times/api.ts) statt feste Uhrzeiten wie bei den Adhkar-
// Erinnerungen — Sonnenaufgang/Fajr/Isha verschieben sich übers Jahr um bis
// zu ~2h, eine feste Uhrzeit würde die Erinnerung saisonal komplett aus dem
// erlaubten Zeitfenster des jeweiligen Gebets herausdriften lassen:
//  - Duha: frühestens kurz nach Sonnenaufgang, bis vor Dhuhr. 30 Min. nach
//    Sunrise ist die klassische Faustregel ("wenn die Sonne handbreit
//    gestiegen ist") und liegt sicher im erlaubten Fenster.
//  - Tahajjud: letztes Drittel der Nacht, vor Fajr. 60 Min. vor Fajr lässt
//    genug Zeit für ein paar Rakaat vor dem Fajr-Gebet.
//  - Witr: nach Isha, vor dem Schlafengehen (für alle, die nicht ohnehin
//    Tahajjud beten und Witr dann später anhängen). 45 Min. nach Isha.
//
// Gleiches Mehrtage-Fenster + Prefix-Identifier-Muster wie die Gebetszeiten-
// Notifications (prayer-times/notifications.ts): pro Tag/Typ ein eigener
// DATE-Trigger, damit jede Erinnerung ihre korrekte, tagesaktuelle Uhrzeit
// zeigt (ein nativer DAILY-Trigger könnte den Text nicht variieren, s. auch
// Kommentar in verseOfDay/notifications.ts).
import { Platform } from 'react-native';

import type { Timings } from './api';
import type { DayTimings } from './notifications';
import { parseTimeOn } from './next-prayer';

// Nur nativ: schon der IMPORT von expo-notifications warnt auf Web in der
// Konsole (Push-Token-Listener) — Guard-require wie in zakat/reminder.ts.
const Notifications =
  Platform.OS === 'web'
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-notifications') as typeof import('expo-notifications'));

export const SUNNAH_REMINDER_PREFIX = 'sunnah-';

export const DUHA_OFFSET_MINUTES = 30;
export const TAHAJJUD_OFFSET_MINUTES = 60;
export const WITR_OFFSET_MINUTES = 45;

export type SunnahPrayer = 'duha' | 'tahajjud' | 'witr';

export interface SunnahReminderToggles {
  duha: boolean;
  tahajjud: boolean;
  witr: boolean;
}

const SUNNAH_REMINDER_TEXT: Record<string, Record<SunnahPrayer, { title: string; body: string }>> = {
  de: {
    duha: { title: 'Duha-Gebet', body: 'Zeit für das freiwillige Duha-Gebet.' },
    tahajjud: { title: 'Tahajjud', body: 'Letztes Drittel der Nacht — Zeit für Tahajjud vor Fajr.' },
    witr: { title: 'Witr-Gebet', body: 'Nicht vergessen: das Witr-Gebet vor dem Schlafengehen.' },
  },
  en: {
    duha: { title: 'Duha prayer', body: 'Time for the voluntary Duha prayer.' },
    tahajjud: { title: 'Tahajjud', body: 'Last third of the night — time for Tahajjud before Fajr.' },
    witr: { title: 'Witr prayer', body: 'Don’t forget: the Witr prayer before you sleep.' },
  },
  tr: {
    duha: { title: 'Duha namazı', body: 'Nafile Duha namazı vakti.' },
    tahajjud: { title: 'Teheccüd', body: 'Gecenin son üçte biri — Fecirden önce Teheccüd vakti.' },
    witr: { title: 'Vitir namazı', body: 'Unutma: uyumadan önce Vitir namazı.' },
  },
  ar: {
    duha: { title: 'صلاة الضحى', body: 'حان وقت صلاة الضحى التطوعية.' },
    tahajjud: { title: 'التهجد', body: 'الثلث الأخير من الليل — حان وقت التهجد قبل الفجر.' },
    witr: { title: 'صلاة الوتر', body: 'لا تنسَ صلاة الوتر قبل النوم.' },
  },
  es: {
    duha: { title: 'Oración Duha', body: 'Hora de la oración voluntaria Duha.' },
    tahajjud: { title: 'Tahajjud', body: 'Último tercio de la noche — hora del Tahajjud antes del Fajr.' },
    witr: { title: 'Oración Witr', body: 'No olvides la oración Witr antes de dormir.' },
  },
  fr: {
    duha: { title: 'Prière Duha', body: 'C’est l’heure de la prière surérogatoire Duha.' },
    tahajjud: { title: 'Tahajjud', body: 'Dernier tiers de la nuit — l’heure du Tahajjud avant le Fajr.' },
    witr: { title: 'Prière Witr', body: 'N’oublie pas la prière Witr avant de dormir.' },
  },
};

function sunnahText(locale: string, prayer: SunnahPrayer): { title: string; body: string } {
  return (SUNNAH_REMINDER_TEXT[locale] ?? SUNNAH_REMINDER_TEXT.de)[prayer];
}

/** Duha-Erinnerung: `DUHA_OFFSET_MINUTES` NACH Sonnenaufgang. null ohne Sunrise-Daten. */
export function computeDuhaReminderTime(day: Date, timings: Timings): Date | null {
  if (!timings.Sunrise) return null;
  return new Date(parseTimeOn(timings.Sunrise, day).getTime() + DUHA_OFFSET_MINUTES * 60_000);
}

/** Tahajjud-Erinnerung: `TAHAJJUD_OFFSET_MINUTES` VOR Fajr. null ohne Fajr-Daten. */
export function computeTahajjudReminderTime(day: Date, timings: Timings): Date | null {
  if (!timings.Fajr) return null;
  return new Date(parseTimeOn(timings.Fajr, day).getTime() - TAHAJJUD_OFFSET_MINUTES * 60_000);
}

/** Witr-Erinnerung: `WITR_OFFSET_MINUTES` NACH Isha. null ohne Isha-Daten. */
export function computeWitrReminderTime(day: Date, timings: Timings): Date | null {
  if (!timings.Isha) return null;
  return new Date(parseTimeOn(timings.Isha, day).getTime() + WITR_OFFSET_MINUTES * 60_000);
}

const COMPUTE_TIME: Record<SunnahPrayer, (day: Date, timings: Timings) => Date | null> = {
  duha: computeDuhaReminderTime,
  tahajjud: computeTahajjudReminderTime,
  witr: computeWitrReminderTime,
};

/**
 * Plant (bzw. entfernt) die Sunnah-Gebets-Erinnerungen für die übergebenen
 * Tage. Löscht ausschließlich eigene (sunnah-*) Planungen (gleiches Muster
 * wie rescheduleNotifications in prayer-times/notifications.ts) — Aufrufer
 * übergibt dasselbe `days`-Fenster, das bereits für die Pflichtgebets-
 * Notifications geladen wurde.
 */
export async function rescheduleSunnahReminders(
  days: DayTimings[],
  toggles: SunnahReminderToggles,
  now: Date = new Date(),
  locale: string = 'de',
): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return; // kein Scheduling-Support, s. prayer-times/notifications.ts

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.identifier.startsWith(SUNNAH_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }

  const prayers: SunnahPrayer[] = ['duha', 'tahajjud', 'witr'];
  for (const day of days) {
    for (const prayer of prayers) {
      if (!toggles[prayer]) continue;
      const date = COMPUTE_TIME[prayer](day.date, day.timings);
      if (!date || date.getTime() <= now.getTime()) continue;

      const text = sunnahText(locale, prayer);
      await Notifications.scheduleNotificationAsync({
        identifier: `${SUNNAH_REMINDER_PREFIX}${prayer}-${date.toISOString().slice(0, 10)}`,
        content: { title: text.title, body: text.body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }
}
