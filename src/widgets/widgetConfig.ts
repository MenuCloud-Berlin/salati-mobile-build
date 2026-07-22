// PER-WIDGET-INSTANZ-Konfiguration für die Homescreen-Widgets.
//
// react-native-android-widget 0.21 unterstützt eine RN-Konfigurations-Activity
// (registerWidgetConfigurationScreen, siehe index.android.js +
// WidgetConfigScreen.tsx). Beim langen Drücken → "Konfigurieren" öffnet Android
// diese Activity und übergibt die konkrete widgetId. Die dort gewählten
// Einstellungen (Theme/Transparenz/Inhalts-Toggles) werden PRO widgetId hier in
// AsyncStorage abgelegt und vom Headless-Handler (widget-task-handler.tsx) beim
// Rendern angewendet.
//
// Auflösungsreihenfolge (resolveWidgetConfig): Instanz-Wert > globaler Default
// (AppSettings.widgetTheme bzw. sinnvolle Anzeige-Defaults). Ein Widget OHNE
// eigene Konfiguration verhält sich damit exakt wie bisher (globales Theme,
// alle Inhalte sichtbar) — 100 % abwärtskompatibel zu bereits platzierten
// Widgets.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppSettings } from '@/features/settings/types';
import type { WidgetTextColor, WidgetTheme } from './widgetTheme';

/** Pro widgetId gespeicherte Overrides. Alle Felder optional → Fallback global. */
export interface WidgetInstanceConfig {
  /** Farbthema (7 Themen inkl. transparent). Fällt auf globales Theme zurück. */
  theme?: WidgetTheme;
  /** Halbtransparenter Kartenhintergrund über dem gewählten Theme. */
  transparent?: boolean;
  /** Textfarben-Override für den Haupttext ('default' = Theme-Textfarbe). */
  textColor?: WidgetTextColor;
  /** Prayer/Countdown: Ort/Standort-Zeile zeigen. */
  showCoords?: boolean;
  /** Prayer/Countdown: "nächste Gebetszeit" zeigen. */
  showNextTime?: boolean;
  /** Wisdom: Übersetzung unter dem arabischen Text zeigen. */
  showTranslation?: boolean;
  /** Qibla: Entfernung zur Kaaba zeigen. */
  showDistance?: boolean;
}

/** Vollständig aufgelöste Konfiguration (keine optionalen Felder mehr). */
export interface ResolvedWidgetConfig {
  theme: WidgetTheme;
  transparent: boolean;
  textColor: WidgetTextColor;
  showCoords: boolean;
  showNextTime: boolean;
  showTranslation: boolean;
  showDistance: boolean;
}

const CONFIG_KEY_PREFIX = 'salati.widget.config.';

/** AsyncStorage-Key für eine konkrete widgetId. */
export function widgetConfigKey(widgetId: number): string {
  return `${CONFIG_KEY_PREFIX}${widgetId}`;
}

/**
 * "Light"-Suffix der Kompatibilitäts-Provider abstreifen, sodass der Basis-
 * Widgettyp übrig bleibt (SalatiPrayer, SalatiCountdown, …). Wird sowohl vom
 * Handler als auch vom Config-Screen genutzt, damit beide identisch mappen.
 */
export function baseWidgetName(name: string): string {
  return name.endsWith('Light') ? name.slice(0, -'Light'.length) : name;
}

/** Inhalts-Toggle-Schlüssel je Widgettyp (steuert die Optionen im Config-Screen). */
export type WidgetContentToggle = 'showCoords' | 'showNextTime' | 'showTranslation' | 'showDistance';

const CONTENT_TOGGLES: Record<string, WidgetContentToggle[]> = {
  SalatiPrayer: ['showCoords', 'showNextTime'],
  SalatiCountdown: ['showCoords', 'showNextTime'],
  SalatiWisdom: ['showTranslation'],
  SalatiQibla: ['showDistance'],
  SalatiStreak: [],
};

/** Welche Inhalts-Toggles gelten für diesen Widget-Namen (Light-Suffix egal)? */
export function widgetContentToggles(widgetName: string): WidgetContentToggle[] {
  return CONTENT_TOGGLES[baseWidgetName(widgetName)] ?? [];
}

/** Gespeicherte Instanz-Konfiguration lesen (leeres Objekt, wenn keine da). */
export async function getWidgetConfig(widgetId: number): Promise<WidgetInstanceConfig> {
  try {
    const raw = await AsyncStorage.getItem(widgetConfigKey(widgetId));
    if (!raw) return {};
    return JSON.parse(raw) as WidgetInstanceConfig;
  } catch {
    return {};
  }
}

/** Instanz-Konfiguration mergen + persistieren (partielles Update). */
export async function setWidgetConfig(
  widgetId: number,
  patch: Partial<WidgetInstanceConfig>,
): Promise<WidgetInstanceConfig> {
  const current = await getWidgetConfig(widgetId);
  const next = { ...current, ...patch };
  try {
    await AsyncStorage.setItem(widgetConfigKey(widgetId), JSON.stringify(next));
  } catch {
    // Persistenz-Fehler schluckt der Storage still — Widget bleibt nutzbar.
  }
  return next;
}

/** Instanz-Konfiguration löschen (z. B. beim Entfernen des Widgets). */
export async function clearWidgetConfig(widgetId: number): Promise<void> {
  try {
    await AsyncStorage.removeItem(widgetConfigKey(widgetId));
  } catch {
    // ignore
  }
}

/**
 * Effektive Konfiguration aus Instanz-Override + globalen Einstellungen.
 * Theme: Instanz-Theme, sonst globales AppSettings.widgetTheme.
 * Anzeige-Toggles: default true (alle Inhalte sichtbar wie bisher).
 */
export function resolveWidgetConfig(
  config: WidgetInstanceConfig,
  _widgetName: string,
  settings: AppSettings,
): ResolvedWidgetConfig {
  return {
    theme: config.theme ?? settings.widgetTheme,
    transparent: config.transparent ?? false,
    textColor: config.textColor ?? 'default',
    showCoords: config.showCoords ?? true,
    showNextTime: config.showNextTime ?? true,
    showTranslation: config.showTranslation ?? true,
    showDistance: config.showDistance ?? true,
  };
}
