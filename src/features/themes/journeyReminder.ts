// Tägliche Erinnerung für aktive Themen-Leseplaene (journeys.ts): EINE
// wiederkehrende Notification (DAILY-Trigger, wie adhkarNotifications.ts),
// solange mindestens eine Reise aktiv und noch nicht abgeschlossen ist.
// Anders als bei Khatmah/Zakat (Datums-Trigger für ein einzelnes Ereignis)
// gibt es hier potenziell mehrere aktive Reisen gleichzeitig - die Erinnerung
// bleibt bewusst generisch ("du hast eine Reise offen") statt pro Reise eine
// eigene Notification zu belegen (iOS begrenzt die Zahl geplanter lokaler
// Notifications).
import { Platform } from 'react-native';

// Nur nativ: schon der IMPORT von expo-notifications warnt auf Web in der
// Konsole (Push-Token-Listener) — Guard-require wie in app/_layout.tsx.
const Notifications =
  Platform.OS === 'web'
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-notifications') as typeof import('expo-notifications'));

export const JOURNEY_REMINDER_ID = 'salatibox-journey-reminder';

/** 19:00 lokale Zeit - Feierabend-Moment, analog zur Abend-Adhkar-Stunde. */
export const JOURNEY_REMINDER_HOUR = 19;

const JOURNEY_REMINDER_TEXT: Record<string, { title: string; body: string }> = {
  de: { title: 'Tages-Plan', body: 'Du hast heute noch einen Tag in deiner Vers-Reise offen.' },
  en: { title: 'Day plan', body: 'You still have a day open in your verse journey today.' },
  tr: { title: 'Günlük plan', body: 'Bugün ayet yolculuğunda henüz açık bir günün var.' },
  ar: { title: 'خطة اليوم', body: 'ما زال لديك يوم مفتوح في رحلة الآيات اليوم.' },
  es: { title: 'Plan diario', body: 'Todavía tienes un día pendiente en tu recorrido de versículos.' },
  fr: { title: 'Plan du jour', body: 'Il te reste un jour à faire dans ton parcours de versets aujourd’hui.' },
};

/**
 * Plant (bzw. entfernt) die tägliche Reise-Erinnerung. Muss nach jeder
 * Änderung an Start/Fortschritt/Abschluss einer Reise sowie bei jedem
 * Screen-Fokus erneut aufgerufen werden (kein Server, keine Background-
 * Task - Selbstheilung beim nächsten App-Besuch, gleiches Muster wie
 * zakat/reminder.ts und prayer-times/notifications.ts).
 */
export async function rescheduleJourneyReminder(
  hasActiveIncompleteJourney: boolean,
  enabled: boolean,
  locale: string = 'de',
): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return; // kein Scheduling-Support, s. prayer-times/notifications.ts
  await Notifications.cancelScheduledNotificationAsync(JOURNEY_REMINDER_ID).catch(() => {});
  if (!enabled || !hasActiveIncompleteJourney) return;

  const text = JOURNEY_REMINDER_TEXT[locale] ?? JOURNEY_REMINDER_TEXT.de;
  await Notifications.scheduleNotificationAsync({
    identifier: JOURNEY_REMINDER_ID,
    content: { title: text.title, body: text.body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: JOURNEY_REMINDER_HOUR,
      minute: 0,
    },
  });
}
