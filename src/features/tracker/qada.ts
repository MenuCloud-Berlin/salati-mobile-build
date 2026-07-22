// Qada-Zähler für verpasste Gebete (Audit 2026-07-19 C5, Pro-Gebetsart-Ausbau
// 2026-07-21): gleiche bewusste Entscheidung wie beim Fasten-Qada
// (features/fasting/qada.ts) - rein manueller Zähler statt Ableitung aus dem
// Tages-Tracker, weil eine automatische Herleitung bei lückenhafter Nutzung
// eine religiöse Verpflichtung falsch anzeigen würde. Der Nutzer trägt die
// Zahl selbst ein und zählt sie herunter, sobald er nachgeholt hat.
//
// Getrennt nach Gebetsart (Fajr/Dhuhr/Asr/Maghrib/Isha), weil das dem
// üblichen Modell etablierter Qada-Tracker-Apps entspricht - wer z. B. nur
// Fajr regelmäßig verpasst, will das nicht mit den anderen vier Gebeten in
// einer Summe vermischen. Witr wird bewusst nicht als eigene Gebetsart
// geführt, weil der Tages-Tracker (features/tracker/store.ts, PRAYER_IDS)
// ebenfalls nur die 5 Pflichtgebete kennt.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { PRAYER_IDS, type PrayerId } from './store';

export const PRAYER_QADA_STORAGE_KEY = 'salatibox:prayer-qada-owed';

export type PrayerQadaData = Record<PrayerId, number>;

function emptyQadaData(): PrayerQadaData {
  return { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
}

export function parsePrayerQadaData(raw: string | null): PrayerQadaData {
  const empty = emptyQadaData();
  if (!raw) return empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    // Legacy-Format (vor dem Pro-Gebetsart-Ausbau): eine einzelne Zahl für
    // den Gesamtbestand. Wird nicht verworfen, sondern komplett auf Fajr
    // gebucht, damit kein bereits eingetragener Nachhol-Bedarf verloren
    // geht - der Nutzer kann die Zahl danach frei zwischen den Gebetsarten
    // verschieben.
    if (typeof parsed === 'number') {
      return Number.isFinite(parsed) && parsed >= 0 ? { ...empty, fajr: Math.floor(parsed) } : empty;
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const dict = parsed as Record<string, unknown>;
      const next = { ...empty };
      for (const id of PRAYER_IDS) {
        const n = Number(dict[id]);
        next[id] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
      }
      return next;
    }
    return empty;
  } catch {
    return empty;
  }
}

export function totalQadaOwed(data: PrayerQadaData): number {
  return PRAYER_IDS.reduce((sum, id) => sum + data[id], 0);
}

export function usePrayerQadaCount() {
  const [data, setData] = useState<PrayerQadaData>(emptyQadaData());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      AsyncStorage.getItem(PRAYER_QADA_STORAGE_KEY).then((raw) => {
        if (!cancelled) setData(parsePrayerQadaData(raw));
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const change = useCallback((prayer: PrayerId, delta: number) => {
    setData((prev) => {
      const next = { ...prev, [prayer]: Math.max(0, prev[prayer] + delta) };
      AsyncStorage.setItem(PRAYER_QADA_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { data, total: totalQadaOwed(data), change };
}
