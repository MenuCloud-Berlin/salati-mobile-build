import * as Notifications from 'expo-notifications';

// Tägliche Morgen-/Abend-Adhkar-Erinnerungen — eigene, feste Identifier
// (siehe Kommentar in study/reviewNotifications.ts: niemals cancelAll).
// DAILY-Trigger wiederholen sich selbst und belegen je genau 1 iOS-Slot.
export const ADHKAR_MORNING_ID = 'salatibox-adhkar-morning';
export const ADHKAR_EVENING_ID = 'salatibox-adhkar-evening';

const TEXT: Record<string, { morning: { title: string; body: string }; evening: { title: string; body: string } }> = {
  de: {
    morning: { title: 'Morgen-Adhkar', body: 'Beginne deinen Tag mit den Morgen-Bittgebeten.' },
    evening: { title: 'Abend-Adhkar', body: 'Schließe deinen Tag mit den Abend-Bittgebeten ab.' },
  },
  en: {
    morning: { title: 'Morning adhkar', body: 'Start your day with the morning supplications.' },
    evening: { title: 'Evening adhkar', body: 'End your day with the evening supplications.' },
  },
  tr: {
    morning: { title: 'Sabah zikirleri', body: 'Güne sabah zikirleriyle başla.' },
    evening: { title: 'Akşam zikirleri', body: 'Günü akşam zikirleriyle tamamla.' },
  },
  ar: {
    morning: { title: 'أذكار الصباح', body: 'ابدأ يومك بأذكار الصباح.' },
    evening: { title: 'أذكار المساء', body: 'اختم يومك بأذكار المساء.' },
  },
  es: {
    morning: { title: 'Adhkar de la mañana', body: 'Comienza tu día con las súplicas de la mañana.' },
    evening: { title: 'Adhkar de la tarde', body: 'Termina tu día con las súplicas de la tarde.' },
  },
  fr: {
    morning: { title: 'Adhkar du matin', body: 'Commence ta journée avec les invocations du matin.' },
    evening: { title: 'Adhkar du soir', body: 'Termine ta journée avec les invocations du soir.' },
  },
};

async function rescheduleOne(
  id: string,
  enabled: boolean,
  hour: number,
  text: { title: string; body: string },
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
  if (!enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: text.title, body: text.body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
}

/** Beide Adhkar-Erinnerungen entsprechend den Einstellungen neu planen. */
export async function rescheduleAdhkarReminders(opts: {
  morningEnabled: boolean;
  morningHour: number;
  eveningEnabled: boolean;
  eveningHour: number;
  locale: string;
}): Promise<void> {
  const text = TEXT[opts.locale] ?? TEXT.de;
  await rescheduleOne(ADHKAR_MORNING_ID, opts.morningEnabled, opts.morningHour, text.morning);
  await rescheduleOne(ADHKAR_EVENING_ID, opts.eveningEnabled, opts.eveningHour, text.evening);
}
