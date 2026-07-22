import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HijriDate, Timings } from './api';

interface CachedTimings {
  today: Timings;
  tomorrow: Timings;
  hijri?: HijriDate;
  savedAt: number;
}

function cacheKey(lat: number, lon: number, method: number, school: 0 | 1): string {
  return `salatibox:timings:${lat.toFixed(3)}:${lon.toFixed(3)}:${method}:${school}`;
}

export async function readTimingsCache(
  lat: number,
  lon: number,
  method: number,
  school: 0 | 1,
): Promise<CachedTimings | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(lat, lon, method, school));
    if (!raw) return null;
    return JSON.parse(raw) as CachedTimings;
  } catch {
    return null;
  }
}

export async function writeTimingsCache(
  lat: number,
  lon: number,
  method: number,
  school: 0 | 1,
  data: Omit<CachedTimings, 'savedAt'>,
): Promise<void> {
  try {
    const payload: CachedTimings = { ...data, savedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(lat, lon, method, school), JSON.stringify(payload));
  } catch {
    // Speicher voll o.ä. — Cache ist best-effort, kein harter Fehler
  }
}
