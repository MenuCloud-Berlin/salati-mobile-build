import { Platform } from 'react-native';

import { rescheduleNotifications } from './notifications';
import type { NotificationPrefs, NotificationToggles } from '@/features/settings/types';

// jest hoisted: jest.mock() laeuft vor allen Imports oben, unabhaengig von
// der Quelltext-Reihenfolge (babel-plugin-jest-hoist) - Deklaration hier
// unten haelt import/first zufrieden, ohne die Hoisting-Semantik zu aendern.
const mockSchedule = jest.fn().mockResolvedValue('id');
const mockGetAllScheduled = jest.fn().mockResolvedValue([]);
const mockCancel = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  getAllScheduledNotificationsAsync: (...args: unknown[]) => mockGetAllScheduled(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancel(...args),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { MAX: 5, DEFAULT: 3 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidNotificationPriority: { LOW: 2 },
}));

const ENABLED: NotificationToggles = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
const PREFS: NotificationPrefs = {
  sound: true,
  vibrate: true,
  headsUp: false,
  ongoingCountdown: false,
  liveActivity: false,
};

describe('rescheduleNotifications — Uhrzeit in Titel/Body (Nutzerfund)', () => {
  beforeEach(() => {
    mockSchedule.mockClear();
  });

  test('Titel und Body enthalten die formatierte Gebetszeit (24h)', async () => {
    const day = { date: new Date('2026-07-18T00:00:00'), timings: { Fajr: '04:15', Sunrise: '05:50', Dhuhr: '13:05', Asr: '16:40', Maghrib: '20:10', Isha: '21:45' } };
    await rescheduleNotifications([day], ENABLED, PREFS, new Date('2026-07-17T00:00:00'), 'de', '24h');

    const fajrCall = mockSchedule.mock.calls.find((c) => (c[0].identifier as string).endsWith('-Fajr'));
    expect(fajrCall).toBeDefined();
    expect(fajrCall![0].content.title).toContain('04:15');
    expect(fajrCall![0].content.body).toContain('04:15');
  });

  test('Titel und Body enthalten die formatierte Gebetszeit (12h)', async () => {
    const day = { date: new Date('2026-07-18T00:00:00'), timings: { Fajr: '04:15', Sunrise: '05:50', Dhuhr: '13:05', Asr: '16:40', Maghrib: '20:10', Isha: '21:45' } };
    await rescheduleNotifications([day], ENABLED, PREFS, new Date('2026-07-17T00:00:00'), 'de', '12h');

    const dhuhrCall = mockSchedule.mock.calls.find((c) => (c[0].identifier as string).endsWith('-Dhuhr'));
    expect(dhuhrCall).toBeDefined();
    expect(dhuhrCall![0].content.title).toContain('1:05');
    expect(dhuhrCall![0].content.body).toContain('1:05');
  });

  test('kein {time}-Platzhalter bleibt uneingesetzt stehen', async () => {
    const day = { date: new Date('2026-07-18T00:00:00'), timings: { Fajr: '04:15', Sunrise: '05:50', Dhuhr: '13:05', Asr: '16:40', Maghrib: '20:10', Isha: '21:45' } };
    await rescheduleNotifications([day], ENABLED, PREFS, new Date('2026-07-17T00:00:00'), 'de', '24h');

    for (const call of mockSchedule.mock.calls) {
      expect(call[0].content.title).not.toContain('{time}');
      expect(call[0].content.body).not.toContain('{time}');
      expect(call[0].content.title).not.toContain('{p}');
      expect(call[0].content.body).not.toContain('{p}');
    }
  });

  test('Web: kein Scheduling-Aufruf (kein Support, s. Kommentar in notifications.ts)', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'web' });
    const day = { date: new Date('2026-07-18T00:00:00'), timings: { Fajr: '04:15', Sunrise: '05:50', Dhuhr: '13:05', Asr: '16:40', Maghrib: '20:10', Isha: '21:45' } };
    await rescheduleNotifications([day], ENABLED, PREFS, new Date('2026-07-17T00:00:00'), 'de', '24h');
    expect(mockSchedule).not.toHaveBeenCalled();
    Object.defineProperty(Platform, 'OS', { get: () => original });
  });
});
