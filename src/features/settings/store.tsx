import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { BEST_TAFSIRS, BEST_TRANSLATIONS } from '@/features/quran/api';
import { setRecitationModel } from '@/features/hifz/whisperModel';
import { detectDeviceLocale } from '@/lib/locale-detect';
import { AppSettings, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './types';

interface SettingsContextValue {
  settings: AppSettings;
  loaded: boolean;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (!raw) {
          // Erster Start — Gerätesprache übernehmen und die beste
          // Koran-Übersetzung für diese Sprache voreinstellen.
          const language = detectDeviceLocale();
          setSettings((prev) => ({
            ...prev,
            language,
            quranTranslation: BEST_TRANSLATIONS[language] ?? prev.quranTranslation,
            quranTafsirs: [BEST_TAFSIRS[language] ?? prev.quranTafsirs[0]],
            // Reise-Modus-Heimatort: der zu diesem Zeitpunkt aktive
            // (Default-)Standort dient als erste Näherung für "Heimat".
            homeLocation: prev.homeLocation ?? prev.location,
          }));
          return;
        }
        try {
          const parsed = JSON.parse(raw) as Partial<AppSettings>;
          // Migration: alter Default war ar.muyassar für ALLE Sprachen —
          // Nicht-Arabisch-Nutzer, die ihn nie angefasst haben, bekommen
          // den englischen Standard-Tafsir (bewusste Auswahl bleibt erhalten).
          if (
            parsed.language !== 'ar' &&
            parsed.quranTafsirs?.length === 1 &&
            parsed.quranTafsirs[0] === 'ar.muyassar'
          ) {
            parsed.quranTafsirs = [BEST_TAFSIRS[parsed.language ?? 'de'] ?? 'qc.169'];
          }
          // Migration: Reise-Modus-Heimatort fehlt (Update von einer älteren
          // Version ohne dieses Feld) — den aktuell aktiven Standort einmalig
          // als Heimat übernehmen UND persistieren. Ohne das Persistieren
          // würde jeder App-Start den Heimatort erneut auf den dann aktiven
          // Standort zurücksetzen und die Reise-Erkennung nie greifen.
          if (!parsed.homeLocation) {
            parsed.homeLocation = parsed.location ?? DEFAULT_SETTINGS.location;
            AsyncStorage.setItem(
              SETTINGS_STORAGE_KEY,
              JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed }),
            ).catch(() => {});
          }
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {
          // corrupt cache — ignore, keep defaults
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // whisperModel.ts hält die Modell-Wahl als synchrone Modul-Variable (damit die
  // Download-/Pfad-Funktionen nicht bei jedem Aufruf AsyncStorage lesen müssen) —
  // bei Laden und jeder Änderung der Auswahl spiegeln.
  useEffect(() => {
    setRecitationModel(settings.recitationModel);
  }, [settings.recitationModel]);

  function update(patch: Partial<AppSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function reset() {
    setSettings(DEFAULT_SETTINGS);
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS)).catch(() => {});
  }

  const value = useMemo(() => ({ settings, loaded, update, reset }), [settings, loaded]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
