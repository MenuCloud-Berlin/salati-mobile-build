import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import type { WidgetRepresentation, WidgetTaskHandlerProps } from 'react-native-android-widget';

import duasData from '@/features/duas/data/duas.json';
import { parseLearnProgress, LEARN_PROGRESS_STORAGE_KEY } from '@/features/learn/progress';
import { fetchTimingsWithRetry, type HijriDate, type Timings } from '@/features/prayer-times/api';
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
  resolveTimeFormat,
  resolveWidgetConfig,
  type ResolvedWidgetConfig,
} from './widgetConfig';
import {
  WIDGET_CORNER_RADII,
  WIDGET_FONT_SCALES,
  widgetTextColorHex,
} from './widgetTheme';
import { WisdomWidget } from './WisdomWidget';

// Gemeinsame Darstellungs-Props (Theme/Deckkraft/Ecken/Schriftgröße/Farben)
// aus der aufgelösten Konfiguration — für alle Widget-Typen identisch, daher
// einmal zentral gemappt und in jedes Widget gespreadet.
function styleProps(cfg: ResolvedWidgetConfig) {
  return {
    theme: cfg.theme,
    opacity: cfg.backgroundOpacity,
    radius: WIDGET_CORNER_RADII[cfg.cornerStyle],
    fontScale: WIDGET_FONT_SCALES[cfg.fontScale],
    textColor: widgetTextColorHex(cfg.textColor),
    accentColor: widgetTextColorHex(cfg.accentColor),
  };
}

/** Hijri-Datum knapp formatieren, z. B. "12 Rajab 1447". */
function formatHijri(hijri: HijriDate): string {
  return `${hijri.day} ${hijri.month.en} ${hijri.year}`;
}

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
  hijri?: HijriDate;
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
    const fresh: CachedTimings = {
      dateKey,
      today: today.timings,
      tomorrow: tomorrow.timings,
      hijri: today.hijri,
    };
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

// Baut die Zeiten-Zeilen (5 Pflichtgebete; optional Sonnenaufgang nach Fajr).
// `active` markiert das nächste Gebet für die farbliche Hervorhebung — der
// Sonnenaufgang ist kein Gebet und daher nie aktiv.
function prayerRows(
  data: CachedTimings,
  nextIdx: number,
  timeFormat: '24h' | '12h',
  showSunrise: boolean,
  t: (key: string) => string,
): { name: string; time: string; active: boolean }[] {
  const rows: { name: string; time: string; active: boolean }[] = [];
  PRAYERS.forEach((p, i) => {
    rows.push({
      name: t(`prayers.${p.toLowerCase()}`),
      time: formatHHMM(data.today[p], timeFormat),
      active: i === nextIdx,
    });
    if (showSunrise && p === 'Fajr') {
      rows.push({
        name: t('prayer.sunrise'),
        time: formatHHMM(data.today.Sunrise, timeFormat),
        active: false,
      });
    }
  });
  return rows;
}

async function renderPrayerWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const timeFormat = resolveTimeFormat(cfg, settings);
  const data = await loadTimings(settings);
  if (!data) {
    return (
      <PrayerWidget
        title={settings.location.label}
        nextName={t('widgets.offline')}
        nextTime=""
        rows={PRAYERS.map((p) => ({ name: t(`prayers.${p.toLowerCase()}`), time: '--:--', active: false }))}
        showCoords={cfg.showCoords}
        showNextTime={cfg.showNextTime}
        highlightNext={cfg.highlightNext}
        {...styleProps(cfg)}
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
    <PrayerWidget
      title={`${t('widgets.nextPrayer')} · ${settings.location.label}`}
      nextName={t(`prayers.${next.nextPrayer.toLowerCase()}`)}
      nextTime={formatHHMM(next.nextIdx >= 0 ? data.today[next.nextPrayer] : data.tomorrow.Fajr, timeFormat)}
      rows={prayerRows(data, next.nextIdx, timeFormat, cfg.showSunrise, t)}
      showCoords={cfg.showCoords}
      showNextTime={cfg.showNextTime}
      highlightNext={cfg.highlightNext}
      showCountdown={cfg.showCountdown}
      remaining={t('widgets.remaining').replace('{t}', compact)}
      hijri={cfg.showHijri && data.hijri ? formatHijri(data.hijri) : undefined}
      {...styleProps(cfg)}
    />
  );
}

async function renderCountdownWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const timeFormat = resolveTimeFormat(cfg, settings);
  const data = await loadTimings(settings);
  if (!data) {
    return (
      <CountdownWidget
        title={t('widgets.nextPrayer')}
        nextName={t('widgets.offline')}
        nextTime="--:--"
        remaining=""
        showCoords={cfg.showCoords}
        showNextTime={cfg.showNextTime}
        {...styleProps(cfg)}
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
      nextTime={formatHHMM(next.nextIdx >= 0 ? data.today[next.nextPrayer] : data.tomorrow.Fajr, timeFormat)}
      remaining={t('widgets.remaining').replace('{t}', compact)}
      showCoords={cfg.showCoords}
      showNextTime={cfg.showNextTime}
      {...styleProps(cfg)}
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
      showBearing={cfg.showBearing}
      showDirection={cfg.showDirection}
      showDistance={cfg.showDistance}
      {...styleProps(cfg)}
    />
  );
}

interface DuaEntry {
  arabic: string;
  translations: Record<string, string>;
  source?: string;
}

function renderWisdomWidget(settings: AppSettings, cfg: ResolvedWidgetConfig) {
  const t = (key: string) => translate(settings.language, key);
  const duas = (duasData as { duas: DuaEntry[] }).duas;
  // 'daily' = feste, über den Tag stabile Rotation (Tag-des-Jahres); 'random' =
  // bei jedem Widget-Update eine andere Dua.
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - startOfYear.getTime()) / 86400000);
  const idx = cfg.duaSelection === 'random' ? Math.floor(Math.random() * duas.length) : dayOfYear % duas.length;
  const dua = duas[idx];
  return (
    <WisdomWidget
      title={t('widgets.duaOfDay')}
      arabic={dua.arabic}
      translation={dua.translations[settings.language] ?? dua.translations.en ?? ''}
      source={dua.source}
      showArabic={cfg.showArabic}
      showTranslation={cfg.showTranslation}
      showSource={cfg.showSource}
      {...styleProps(cfg)}
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
      streakLarge={cfg.streakLarge}
      showStreakLabel={cfg.showStreakLabel}
      {...styleProps(cfg)}
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

/**
 * Rendert das zu (widgetName, widgetId) passende Widget mit ECHTEN Daten +
 * der pro-Instanz aufgelösten Konfiguration (Theme/Transparenz/Textfarbe/
 * Inhalts-Toggles). Gemeinsame Render-Logik für a) den Headless-Task-Handler
 * (WIDGET_UPDATE) und b) das sofortige Neu-Rendern nach einer Änderung
 * (Config-Screen "Fertig" bzw. Theme-Wechsel in den Einstellungen →
 * requestWidgetUpdate, s. refresh.android.ts).
 */
export async function renderWidgetForInfo(
  widgetName: string,
  widgetId: number,
): Promise<WidgetRepresentation> {
  const settings = await loadSettings();
  const instance = await getWidgetConfig(widgetId);
  const cfg = resolveWidgetConfig(instance, widgetName, settings);
  switch (baseWidgetName(widgetName)) {
    case 'SalatiWisdom':
      return renderWisdomWidget(settings, cfg);
    case 'SalatiStreak':
      return renderStreakWidget(settings, cfg);
    case 'SalatiCountdown':
      return renderCountdownWidget(settings, cfg);
    case 'SalatiQibla':
      return renderQiblaWidget(settings, cfg);
    case 'SalatiPrayer':
    default:
      return renderPrayerWidget(settings, cfg);
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(
        await renderWidgetForInfo(props.widgetInfo.widgetName, props.widgetInfo.widgetId),
      );
      break;
    default:
      // WIDGET_DELETED/WIDGET_CLICK: Klick öffnet die App bereits über
      // clickAction="OPEN_APP" am Widget-Root — nichts zu tun.
      break;
  }
}
