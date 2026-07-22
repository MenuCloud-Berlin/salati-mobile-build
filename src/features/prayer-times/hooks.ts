import { useQuery } from '@tanstack/react-query';

import { useSettings } from '@/features/settings/store';

import { fetchTimingsWithRetry, fetchUpcomingTimings, type HijriDate, type Timings } from './api';
import { readTimingsCache, writeTimingsCache } from './storage';
import { useDayKey } from './useDayKey';

export interface TimingsData {
  today: Timings;
  tomorrow: Timings;
  hijri?: HijriDate;
}

export function useTimings() {
  const { settings } = useSettings();
  const { lat, lon } = settings.location;
  const { method, school } = settings;
  const dayKey = useDayKey();

  return useQuery<TimingsData>({
    // dayKey im Query-Key: erzwingt Refetch bei Tageswechsel statt nur beim
    // stündlichen Poll zu warten (Audit-Bug, siehe useDayKey.ts).
    queryKey: ['timings', lat, lon, method, school, dayKey],
    queryFn: async () => {
      const today = new Date();
      // setDate() statt +86_400_000ms: an DST-Umstellungstagen hat der lokale
      // Kalendertag nur 23 bzw. 25 Stunden — feste Millisekunden-Arithmetik
      // kann dann kurz vor Mitternacht auf den übernächsten statt den
      // nächsten Kalendertag springen (falsches "morgen" für Aladhan-Anfrage).
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [t, tm] = await Promise.all([
        fetchTimingsWithRetry(lat, lon, today, method, school),
        fetchTimingsWithRetry(lat, lon, tomorrow, method, school),
      ]);

      if (t?.timings && tm?.timings) {
        const data: TimingsData = { today: t.timings, tomorrow: tm.timings, hijri: t.hijri };
        await writeTimingsCache(lat, lon, method, school, data);
        return data;
      }

      // Netzwerk komplett fehlgeschlagen — auf Offline-Cache zurückfallen
      const cached = await readTimingsCache(lat, lon, method, school);
      if (cached) return cached;

      throw new Error('timings_unavailable');
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * 7-Tage-Fenster für die Wochenübersicht-Tabelle (app/prayer-times-week.tsx).
 * Nutzt denselben Kalender-Endpoint wie die Notification-Planung in
 * prayer-times-screen.tsx (fetchUpcomingTimings, s. api.ts) — ein eigener
 * Query-Key, da die Notification-Planung ihr Fenster in einem useEffect statt
 * über react-query lädt und nicht gecacht werden soll.
 */
export function useWeekTimings() {
  const { settings } = useSettings();
  const { lat, lon } = settings.location;
  const { method, school } = settings;
  const dayKey = useDayKey();

  return useQuery({
    queryKey: ['timings-week', lat, lon, method, school, dayKey],
    queryFn: () => fetchUpcomingTimings(lat, lon, method, school, 7),
    staleTime: 60 * 60 * 1000,
  });
}
