import type { Timings } from './api';

export const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type Prayer = (typeof PRAYERS)[number];

/** Parst "HH:MM" auf das Datum von `reference` (lokale Zeit). */
export function parseTimeOn(hhmm: string, reference: Date): Date {
  const parts = hhmm.split(':');
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const d = new Date(reference);
  d.setHours(h, m, 0, 0);
  return d;
}

export interface NextPrayerResult {
  nextIdx: number;
  nextPrayer: Prayer;
  nextTs: Date;
  diffMs: number;
}

/**
 * Bestimmt das nächste Gebet ausgehend von `now`. Wenn alle heutigen Gebete
 * vorbei sind, ist das nächste Gebet Fajr von morgen.
 */
export function nextPrayer(today: Timings, tomorrow: Timings, now: Date): NextPrayerResult {
  let idx = -1;
  for (let i = 0; i < PRAYERS.length; i++) {
    const p = PRAYERS[i] as Prayer;
    if (parseTimeOn(today[p], now) > now) {
      idx = i;
      break;
    }
  }

  let nextTs: Date;
  let nextPrayerName: Prayer;
  if (idx >= 0) {
    nextPrayerName = PRAYERS[idx] as Prayer;
    nextTs = parseTimeOn(today[nextPrayerName], now);
  } else {
    nextPrayerName = 'Fajr';
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    nextTs = parseTimeOn(tomorrow.Fajr, tmr);
  }

  return {
    nextIdx: idx,
    nextPrayer: nextPrayerName,
    nextTs,
    diffMs: Math.max(0, nextTs.getTime() - now.getTime()),
  };
}

export function formatCountdown(diffMs: number): string {
  const hh = Math.floor(diffMs / 3600000);
  const mm = Math.floor((diffMs % 3600000) / 60000);
  const ss = Math.floor((diffMs % 60000) / 1000);
  return `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
}

export type TimeFormat = '24h' | '12h';

/** Formatiert Stunde+Minute je nach Settings (24h vs. 12h mit AM/PM). */
export function formatClock(hours: number, minutes: number, format: TimeFormat): string {
  const mm = String(minutes).padStart(2, '0');
  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}:${mm}`;
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mm} ${period}`;
}

/** Formatiert einen "HH:MM"-String (Aladhan-Format) je nach Settings. */
export function formatHHMM(hhmm: string, format: TimeFormat): string {
  const [h, m] = hhmm.split(':').map(Number);
  return formatClock(h ?? 0, m ?? 0, format);
}
