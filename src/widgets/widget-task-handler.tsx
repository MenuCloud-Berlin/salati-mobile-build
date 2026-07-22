import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import duasData from '@/features/duas/data/duas.json';
import { parseLearnProgress, LEARN_PROGRESS_STORAGE_KEY } from '@/features/learn/progress';
import { fetchTimingsWithRetry, type Timings } from '@/features/prayer-times/api';
import { formatHHMM, nextPrayer, PRAYERS } from '@/features/prayer-times/next-prayer';
import { qiblaBearing, distanceToMeccaKm } from '@/features/qibla/bearing';
import { cardinalKey } from '@/features/qibla/cardinal';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/features/settings/types';
import { COURSE_META } from '@/features/study/courses';
import { computeLearningStreak } from '@/features/study/streak';
import { translate } from '@/lib/translate';
import { CountdownWidget } from './CountdownWidget';
import { PrayerWidget } from './PrayerWidget';
import { QiblaWidget } from './QiblaWidget';
import { StreakWidget } from './StreakWidget';
import {
  baseWidgetName,
  getWidgetConfig,
  resolveWidgetConfig,
  type ResolvedWidgetConfig,
} from './widgetConfig';
import { WisdomWidget } from './WisdomWidget';

// Headless-Handler: läuft OHNE UI-Kontext (kein SettingsProvider, kein
// React-Query) — alle Daten kommen direkt aus AsyncStorage bzw. der
// Aladhan-API, mit Offline-Fallback auf die zuletzt gecachten Zeiten.

const WIDGET_TIMINGS_CACHE_KEY = 'salatibox:widget-timings';

async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface CachedTimings {
  dateKey: string;
  today: Timings;
  tomorrow: Timings;
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function loadTimings(settings: AppSettings): Promise<CachedTimings | null> {
  const now = new Date();
  const dateKey = localDateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const { lat, lon } = settings.location;
  const [today, tomorrow] = await Promise.all([
    fetchTimingsWithRetry(lat, lon, now, settings.method, settings.school),
    fetchTimingsWithRetry(lat, lon, tomorrowDate, settings.method, settings.school),
  ]);
  if (today && tomorrow) {
    const fresh: CachedTimings = { dateKey, today: today.timings, tomorrow: tomorrow.timings };
    await AsyncStorage.setItem(WIDGET_TIMINGS_CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
    return fresh;
  }
  // Offline: letzten Stand nur verwenden, wenn er vom heutigen Tag ist —
  // gestrige Zeiten wären still falsch.
  try {
    const raw = await AsyncStorage.getItem(WIDGET_TIMINGS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedTimings;
    return cached.dateKey === dateKey ? cached : null;
  } catch {
    return null;
  }
}

async function renderPrayerWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const data = await loadTimings(settings);
  if (!data) {
    return (
      <PrayerWidget
        title={settings.location.label}
        nextName={t('widgets.offline')}
        nextTime=""
        rows={PRAYERS.map((p) => ({ name: t(`prayers.${p.toLowerCase()}`), time: '--:--', active: false }))}
        theme={cfg.theme}
        transparent={cfg.transparent}
        showCoords={cfg.showCoords}
        showNextTime={cfg.showNextTime}
      />
    );
  }
  const next = nextPrayer(data.today, data.tomorrow, new Date());
  return (
    <PrayerWidget
      title={`${t('widgets.nextPrayer')} · ${settings.location.label}`}
      nextName={t(`prayers.${next.nextPrayer.toLowerCase()}`)}
      nextTime={formatHHMM(
        next.nextIdx >= 0 ? data.today[next.nextPrayer] : data.tomorrow.Fajr,
        settings.timeFormat,
      )}
      rows={PRAYERS.map((p, i) => ({
        name: t(`prayers.${p.toLowerCase()}`),
        time: formatHHMM(data.today[p], settings.timeFormat),
        active: i === next.nextIdx,
      }))}
      theme={cfg.theme}
      transparent={cfg.transparent}
      showCoords={cfg.showCoords}
      showNextTime={cfg.showNextTime}
    />
  );
}

async function renderCountdownWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const data = await loadTimings(settings);
  if (!data) {
    return (
      <CountdownWidget
        title={t('widgets.nextPrayer')}
        nextName={t('widgets.offline')}
        nextTime="--:--"
        remaining=""
        theme={cfg.theme}
        transparent={cfg.transparent}
        showCoords={cfg.showCoords}
        showNextTime={cfg.showNextTime}
      />
    );
  }
  const now = new Date();
  const next = nextPrayer(data.today, data.tomorrow, now);
  const totalMin = Math.floor(next.diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const compact = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <CountdownWidget
      title={`${t('widgets.nextPrayer')} · ${settings.location.label}`}
      nextName={t(`prayers.${next.nextPrayer.toLowerCase()}`)}
      nextTime={formatHHMM(
        next.nextIdx >= 0 ? data.today[next.nextPrayer] : data.tomorrow.Fajr,
        settings.timeFormat,
      )}
      remaining={t('widgets.remaining').replace('{t}', compact)}
      theme={cfg.theme}
      transparent={cfg.transparent}
      showCoords={cfg.showCoords}
      showNextTime={cfg.showNextTime}
    />
  );
}

function renderQiblaWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const { lat, lon } = settings.location;
  const bearing = qiblaBearing(lat, lon);
  const km = Math.round(distanceToMeccaKm(lat, lon));
  return (
    <QiblaWidget
      title={t('widgets.qibla')}
      bearing={`${Math.round(bearing)}°`}
      direction={t(`qibla.dir.${cardinalKey(bearing)}`)}
      distance={`${km} km`}
      theme={cfg.theme}
      transparent={cfg.transparent}
      showDistance={cfg.showDistance}
    />
  );
}

interface DuaEntry {
  arabic: string;
  translations: Record<string, string>;
}

function renderWisdomWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const duas = (duasData as { duas: DuaEntry[] }).duas;
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - startOfYear.getTime()) / 86400000);
  const dua = duas[dayOfYear % duas.length];
  return (
    <WisdomWidget
      title={t('widgets.duaOfDay')}
      arabic={dua.arabic}
      translation={dua.translations[settings.language] ?? dua.translations.en ?? ''}
      theme={cfg.theme}
      transparent={cfg.transparent}
      showTranslation={cfg.showTranslation}
    />
  );
}

async function renderStreakWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const [learnRaw, ...courseRaws] = await Promise.all([
    AsyncStorage.getItem(LEARN_PROGRESS_STORAGE_KEY),
    ...COURSE_META.map((c) => AsyncStorage.getItem(c.storageKey)),
  ]);
  const allProgress = [parseLearnProgress(learnRaw), ...courseRaws.map(parseLearnProgress)];
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const passedTimestamps: number[] = [];
  let today = 0;
  for (const progress of allProgress) {
    for (const r of Object.values(progress)) {
      if (r.total > 0 && r.score / r.total >= 0.7) {
        passedTimestamps.push(r.completedAt);
        if (r.completedAt >= startOfDay.getTime()) today++;
      }
    }
  }
  return (
    <StreakWidget
      streak={computeLearningStreak(passedTimestamps)}
      streakLabel={t('widgets.streakLabel')}
      todayLine={t('widgets.todayLessons').replace('{n}', String(today))}
      theme={cfg.theme}
      transparent={cfg.transparent}
    />
  );
}

// Konfiguration wird PRO widgetId aufgelöst (widgetConfig.ts): der Nutzer setzt
// Theme/Transparenz/Inhalts-Toggles je platziertem Widget über die
// Konfigurations-Activity (langes Drücken → Konfigurieren). Fehlt für eine
// widgetId ein Override, greift der globale Default (AppSettings.widgetTheme,
// alle Inhalte sichtbar) — bestehende Widgets verhalten sich unverändert.
// Die "Light"-Provider im Picker (Namenssuffix "Light") leiten weiterhin
// denselben Widget-TYP ab wie ihr Basisname (baseWidgetName in widgetConfig.ts).

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const name = props.widgetInfo.widgetName;
  const base = baseWidgetName(name);
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const settings = await loadSettings();
      const instance = await getWidgetConfig(props.widgetInfo.widgetId);
      const cfg = resolveWidgetConfig(instance, name, settings);
      if (base === 'SalatiPrayer') props.renderWidget(await renderPrayerWidget(settings, cfg));
      else if (base === 'SalatiWisdom') props.renderWidget(renderWisdomWidget(settings, cfg));
      else if (base === 'SalatiStreak') props.renderWidget(await renderStreakWidget(settings, cfg));
      else if (base === 'SalatiCountdown') props.renderWidget(await renderCountdownWidget(settings, cfg));
      else if (base === 'SalatiQibla') props.renderWidget(renderQiblaWidget(settings, cfg));
      break;
    }
    default:
      // WIDGET_DELETED/WIDGET_CLICK: Klick öffnet die App bereits über
      // clickAction="OPEN_APP" am Widget-Root — nichts zu tun.
      break;
  }
}
