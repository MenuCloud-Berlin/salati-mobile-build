import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

// Gebets-Tracker: pro Tag (YYYY-MM-DD) welche der 5 Gebete verrichtet wurden.
// Streak = zusammenhängende Tage mit allen 5 Gebeten, endend heute (oder
// gestern, solange heute noch läuft).

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_IDS: PrayerId[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export type TrackerData = Record<string, Partial<Record<PrayerId, boolean>>>;

export const TRACKER_STORAGE_KEY = 'salatibox:prayer-tracker';

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function togglePrayer(data: TrackerData, day: string, prayer: PrayerId): TrackerData {
  const current = data[day] ?? {};
  return { ...data, [day]: { ...current, [prayer]: !current[prayer] } };
}

export function completedCount(data: TrackerData, day: string): number {
  const d = data[day] ?? {};
  return PRAYER_IDS.filter((p) => d[p]).length;
}

export function isDayComplete(data: TrackerData, day: string): boolean {
  return completedCount(data, day) === PRAYER_IDS.length;
}

/** Streak kompletter Tage; der heutige Tag zählt mit, sobald er komplett ist. */
export function currentStreak(data: TrackerData, today: Date): number {
  let streak = 0;
  const cursor = new Date(today);
  if (!isDayComplete(data, dayKey(cursor))) {
    // Heute noch nicht komplett — Streak ab gestern zählen
    cursor.setDate(cursor.getDate() - 1);
  }
  while (isDayComplete(data, dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Letzte n Tage (älteste zuerst) mit Anzahl erledigter Gebete. */
export function lastDays(data: TrackerData, today: Date, n: number): { day: string; done: number }[] {
  const result: { day: string; done: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    result.push({ day: key, done: completedCount(data, key) });
  }
  return result;
}

export function parseTracker(raw: string | null): TrackerData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as TrackerData) : {};
  } catch {
    return {};
  }
}

export function useTracker() {
  const [data, setData] = useState<TrackerData>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      AsyncStorage.getItem(TRACKER_STORAGE_KEY).then((raw) => {
        if (!cancelled) setData(parseTracker(raw));
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const toggle = useCallback((day: string, prayer: PrayerId) => {
    setData((prev) => {
      const next = togglePrayer(prev, day, prayer);
      AsyncStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { data, toggle };
}
