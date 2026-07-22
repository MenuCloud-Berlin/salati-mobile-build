// Web-Variante: expo-notifications hat auf Web weder Scheduling-Support noch
// Push-Token-Handling — schon der IMPORT des Moduls warf auf jeder Seite eine
// Konsolen-Warnung ("Listening to push token changes..."). Daher hier ein
// import-freier No-op mit identischer Signatur (Metro-Platform-Split).
import type { Timings } from './api';
import type { NextPrayerResult, TimeFormat } from './next-prayer';
import type { NotificationPrefs, NotificationToggles } from '@/features/settings/types';

export interface DayTimings {
  date: Date;
  timings: Timings;
}

export function prayerChannelId(prefs: NotificationPrefs): string {
  return `prayer-s${prefs.sound ? 1 : 0}v${prefs.vibrate ? 1 : 0}h${prefs.headsUp ? 1 : 0}`;
}

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function rescheduleNotifications(
  _days: DayTimings[],
  _enabled: NotificationToggles,
  _prefs: NotificationPrefs,
  _now: Date = new Date(),
  _locale: string = 'de',
): Promise<void> {
  // Web: keine lokalen Notifications — bewusst leer.
}

export async function updateOngoingCountdown(
  _next: NextPrayerResult,
  _prefs: NotificationPrefs,
  _locale: string,
  _timeFormat: TimeFormat,
): Promise<void> {
  // Web: kein Ongoing-Notification-Äquivalent — bewusst leer.
}
