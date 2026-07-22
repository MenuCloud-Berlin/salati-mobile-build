// Client-seitiger Aladhan-Aufruf — kein Next.js-Backend in Expo verfügbar.
// Portiert aus apps/device/src/app/api/timings/route.ts (dort als Server-Proxy).
//
// KRITISCH: Aladhan erwartet ein Datumssegment im Pfad (DD-MM-YYYY). Ohne
// explizites Datum wird die URL fehlgeformt und die API liefert 404 — das war
// ein realer Bug im Salatibox-Audit 2026-07-07. Immer todayAladhan()/fmtDate()
// verwenden, nie das Segment weglassen.

export interface Timings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface HijriDate {
  day: string;
  month: { number: string; en: string };
  year: string;
}

interface AlAdhanResponse {
  data?: {
    timings?: Record<string, string>;
    date?: { hijri?: HijriDate };
  };
}

export function fmtDateAladhan(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export function onlyHHMM(s: string | undefined): string {
  return s ? (s.split(' ')[0] ?? '') : '';
}

async function fetchAladhan(url: string): Promise<{ timings: Timings; hijri?: HijriDate } | null> {
  const r = await fetch(url, { headers: { 'user-agent': 'salatibox-mobile/1.0' } });
  if (!r.ok) return null;
  const j: AlAdhanResponse = await r.json();
  if (!j.data?.timings) return null;
  const t = j.data.timings;
  return {
    timings: {
      Fajr: onlyHHMM(t.Fajr),
      Sunrise: onlyHHMM(t.Sunrise),
      Dhuhr: onlyHHMM(t.Dhuhr),
      Asr: onlyHHMM(t.Asr),
      Maghrib: onlyHHMM(t.Maghrib),
      Isha: onlyHHMM(t.Isha),
    },
    hijri: j.data.date?.hijri,
  };
}

export async function fetchTimingsByCoords(
  lat: number,
  lon: number,
  date: Date,
  method: number,
  school: 0 | 1,
) {
  const url = `https://api.aladhan.com/v1/timings/${fmtDateAladhan(date)}?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}`;
  return fetchAladhan(url);
}

export async function fetchTimingsByCity(
  city: string,
  country: string,
  date: Date,
  method: number,
  school: 0 | 1,
) {
  const url = `https://api.aladhan.com/v1/timingsByCity/${fmtDateAladhan(date)}?city=${encodeURIComponent(
    city,
  )}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`;
  return fetchAladhan(url);
}

interface AlAdhanCalendarDay {
  timings?: Record<string, string>;
  date?: { gregorian?: { date?: string } }; // DD-MM-YYYY
}

/**
 * Gebetszeiten für die nächsten `count` Tage (inkl. heute) — Grundlage für
 * die Mehrtages-Notification-Planung. Nutzt den Kalender-Endpoint (1 Call
 * pro Monat statt 7 Einzel-Calls); Monatsübergang = maximal 2 Calls.
 */
export async function fetchUpcomingTimings(
  lat: number,
  lon: number,
  method: number,
  school: 0 | 1,
  count: number = 7,
  now: Date = new Date(),
): Promise<{ date: Date; timings: Timings }[]> {
  const months = new Map<string, { year: number; month: number }>();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    months.set(`${d.getFullYear()}-${d.getMonth() + 1}`, {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }
  const byDate = new Map<string, Timings>();
  for (const { year, month } of months.values()) {
    const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lon}&method=${method}&school=${school}`;
    const r = await fetch(url, { headers: { 'user-agent': 'salatibox-mobile/1.0' } });
    if (!r.ok) continue;
    const j = (await r.json()) as { data?: AlAdhanCalendarDay[] };
    for (const day of j.data ?? []) {
      const t = day.timings;
      const dateStr = day.date?.gregorian?.date;
      if (!t || !dateStr) continue;
      byDate.set(dateStr, {
        Fajr: onlyHHMM(t.Fajr),
        Sunrise: onlyHHMM(t.Sunrise),
        Dhuhr: onlyHHMM(t.Dhuhr),
        Asr: onlyHHMM(t.Asr),
        Maghrib: onlyHHMM(t.Maghrib),
        Isha: onlyHHMM(t.Isha),
      });
    }
  }
  const result: { date: Date; timings: Timings }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const timings = byDate.get(fmtDateAladhan(d));
    if (timings) result.push({ date: d, timings });
  }
  return result;
}

/** Mit 3 Versuchen (Backoff) — spiegelt das Retry-Pattern aus SalatiDashboard.tsx. */
export async function fetchTimingsWithRetry(
  lat: number,
  lon: number,
  date: Date,
  method: number,
  school: 0 | 1,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await fetchTimingsByCoords(lat, lon, date, method, school);
      if (result) return result;
    } catch {
      // retry
    }
    await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
  }
  return null;
}
