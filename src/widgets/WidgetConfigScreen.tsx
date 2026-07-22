// PER-WIDGET Konfigurations-Screen.
//
// Wird über registerWidgetConfigurationScreen (index.android.js) unter dem
// AppRegistry-Key 'RNWidgetConfigurationScreen' registriert. Android startet
// die native WidgetConfigurationActivity (AndroidManifest + android:configure
// in den 5 widgetprovider_*.xml), wenn ein Widget platziert oder über langes
// Drücken → "Konfigurieren" bearbeitet wird, und übergibt die konkrete
// widgetId.
//
// WICHTIG: Dieser Screen rendert STANDALONE — ohne expo-router, ohne
// SettingsProvider, ohne Theme-Context. Deshalb: eigenes SafeArea-Padding,
// eigenes (dunkles) Theming und Sprache/Defaults direkt aus AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps, WidgetRepresentation } from 'react-native-android-widget';

import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/features/settings/types';
import { PRAYERS } from '@/features/prayer-times/next-prayer';
import { translate } from '@/lib/translate';
import { CountdownWidget } from './CountdownWidget';
import { PrayerWidget } from './PrayerWidget';
import { QiblaWidget } from './QiblaWidget';
import { StreakWidget } from './StreakWidget';
import { WisdomWidget } from './WisdomWidget';
import {
  baseWidgetName,
  getWidgetConfig,
  resolveWidgetConfig,
  setWidgetConfig,
  widgetContentToggles,
  type ResolvedWidgetConfig,
  type WidgetContentToggle,
  type WidgetInstanceConfig,
} from './widgetConfig';
import { renderWidgetForInfo } from './widget-task-handler';
import {
  WIDGET_TEXT_COLOR_KEYS,
  WIDGET_TEXT_COLORS,
  WIDGET_THEME_KEYS,
  WIDGET_THEMES,
  widgetTextColorHex,
  type WidgetTextColor,
  type WidgetTheme,
} from './widgetTheme';

async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Beschriftung eines Widget-Typs für den Kopfbereich.
function widgetTypeLabel(base: string, t: (k: string) => string): string {
  switch (base) {
    case 'SalatiPrayer':
      return t('widgets.nextPrayer');
    case 'SalatiCountdown':
      return t('widgetConfig.typeCountdown');
    case 'SalatiWisdom':
      return t('widgets.duaOfDay');
    case 'SalatiQibla':
      return t('widgets.qibla');
    case 'SalatiStreak':
      return t('widgetConfig.typeStreak');
    default:
      return base;
  }
}

const TOGGLE_LABEL_KEY: Record<WidgetContentToggle, string> = {
  showCoords: 'widgetConfig.showCoords',
  showNextTime: 'widgetConfig.showNextTime',
  showTranslation: 'widgetConfig.showTranslation',
  showDistance: 'widgetConfig.showDistance',
};

// Repräsentativer Vorschau-Render mit Beispieldaten (keine Netz-/Storage-Last
// in der Config-Activity). Nach setResult('ok') rendert der Task-Handler das
// Widget mit echten Daten + gespeicherter Konfiguration neu.
function buildPreview(
  base: string,
  cfg: ResolvedWidgetConfig,
  settings: AppSettings,
): WidgetRepresentation | null {
  const t = (key: string) => translate(settings.language, key);
  const common = {
    theme: cfg.theme,
    transparent: cfg.transparent,
    textColor: widgetTextColorHex(cfg.textColor),
  };
  switch (base) {
    case 'SalatiPrayer':
      return (
        <PrayerWidget
          title={`${t('widgets.nextPrayer')} · ${settings.location.label}`}
          nextName={t('prayers.asr')}
          nextTime="15:42"
          rows={PRAYERS.map((p, i) => ({
            name: t(`prayers.${p.toLowerCase()}`),
            time: ['05:12', '13:05', '15:42', '18:20', '20:01'][i],
            active: i === 2,
          }))}
          showCoords={cfg.showCoords}
          showNextTime={cfg.showNextTime}
          {...common}
        />
      );
    case 'SalatiCountdown':
      return (
        <CountdownWidget
          title={`${t('widgets.nextPrayer')} · ${settings.location.label}`}
          nextName={t('prayers.asr')}
          nextTime="15:42"
          remaining={t('widgets.remaining').replace('{t}', '2h 15m')}
          showCoords={cfg.showCoords}
          showNextTime={cfg.showNextTime}
          {...common}
        />
      );
    case 'SalatiWisdom':
      return (
        <WisdomWidget
          title={t('widgets.duaOfDay')}
          arabic="رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً"
          translation="Unser Herr, gib uns im Diesseits Gutes."
          showTranslation={cfg.showTranslation}
          {...common}
        />
      );
    case 'SalatiQibla':
      return (
        <QiblaWidget
          title={t('widgets.qibla')}
          bearing="137°"
          direction={t('qibla.dir.so')}
          distance="4312 km"
          showDistance={cfg.showDistance}
          {...common}
        />
      );
    case 'SalatiStreak':
      return (
        <StreakWidget
          streak={7}
          streakLabel={t('widgets.streakLabel')}
          todayLine={t('widgets.todayLessons').replace('{n}', '2')}
          {...common}
        />
      );
    default:
      return null;
  }
}

export function WidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const widgetId = widgetInfo.widgetId;
  const base = baseWidgetName(widgetInfo.widgetName);
  const toggles = widgetContentToggles(widgetInfo.widgetName);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [config, setConfig] = useState<WidgetInstanceConfig>({});

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [s, c] = await Promise.all([loadSettings(), getWidgetConfig(widgetId)]);
      if (!alive) return;
      setSettings(s);
      setConfig(c);
      // Erste Vorschau sofort rendern, damit das Widget nicht leer wirkt.
      const preview = buildPreview(base, resolveWidgetConfig(c, widgetInfo.widgetName, s), s);
      if (preview) renderWidget(preview);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Mount laden
  }, []);

  const t = (key: string) => translate(settings?.language ?? 'en', key);

  async function apply(patch: Partial<WidgetInstanceConfig>) {
    if (!settings) return;
    const next = await setWidgetConfig(widgetId, patch);
    setConfig(next);
    const preview = buildPreview(base, resolveWidgetConfig(next, widgetInfo.widgetName, settings), settings);
    if (preview) renderWidget(preview);
  }

  // "Fertig": vor dem Abschließen das Widget einmal mit ECHTEN Daten (statt der
  // Beispiel-Vorschau) und der frisch gespeicherten Konfiguration zeichnen, damit
  // es sofort korrekt aussieht — sonst bliebe bis zum nächsten Update-Tick die
  // Vorschau mit Beispielzeiten stehen. Fehler (z. B. offline) werden bewusst
  // geschluckt: der Task-Handler rendert beim nächsten Tick ohnehin neu.
  async function commit() {
    try {
      renderWidget(await renderWidgetForInfo(widgetInfo.widgetName, widgetId));
    } catch {
      // Vorschau bleibt bestehen — kein harter Fehler.
    }
    setResult('ok');
  }

  if (!settings) {
    return <View style={styles.screen} />;
  }

  const resolved = resolveWidgetConfig(config, widgetInfo.widgetName, settings);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('widgetConfig.title')}</Text>
        <Text style={styles.subtitle}>{widgetTypeLabel(base, t)}</Text>

        {/* Farbe / Theme */}
        <Text style={styles.sectionLabel}>{t('widgetConfig.color')}</Text>
        <View style={styles.swatchRow}>
          {WIDGET_THEME_KEYS.map((k: WidgetTheme) => {
            const c = WIDGET_THEMES[k];
            const selected = resolved.theme === k;
            return (
              <Pressable
                key={k}
                onPress={() => apply({ theme: k })}
                style={[styles.swatch, { backgroundColor: c.bg }, selected && styles.swatchSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Text style={[styles.swatchDot, { color: c.accent }]}>●</Text>
                <Text style={[styles.swatchLabel, { color: c.text }]} numberOfLines={1}>
                  {t(`widgets.theme_${k}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Transparenz */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('widgetConfig.transparent')}</Text>
          <Switch
            value={resolved.transparent}
            onValueChange={(v) => apply({ transparent: v })}
            trackColor={{ true: '#d4af37', false: '#3a3a3f' }}
            thumbColor="#f7f3ea"
          />
        </View>

        {/* Textfarbe: 'default' zeigt die Textfarbe des gewählten Themes, alle
            anderen überschreiben den Haupttext (z. B. rot). */}
        <Text style={styles.sectionLabel}>{t('widgetConfig.textColor')}</Text>
        <View style={styles.colorRow}>
          {WIDGET_TEXT_COLOR_KEYS.map((k: WidgetTextColor) => {
            const dot = WIDGET_TEXT_COLORS[k] ?? WIDGET_THEMES[resolved.theme].text;
            const selected = resolved.textColor === k;
            return (
              <Pressable
                key={k}
                onPress={() => apply({ textColor: k })}
                style={[styles.colorSwatch, selected && styles.colorSwatchSelected]}
                accessibilityRole="button"
                accessibilityLabel={k}
                accessibilityState={{ selected }}>
                <View style={[styles.colorDot, { backgroundColor: dot }]}>
                  {k === 'default' ? (
                    <Text style={[styles.colorDefaultGlyph, { color: WIDGET_THEMES[resolved.theme].bg }]}>A</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Inhalts-Toggles je Widgettyp */}
        {toggles.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>{t('widgetConfig.content')}</Text>
            {toggles.map((key) => (
              <View key={key} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t(TOGGLE_LABEL_KEY[key])}</Text>
                <Switch
                  value={resolved[key]}
                  onValueChange={(v) => apply({ [key]: v } as Partial<WidgetInstanceConfig>)}
                  trackColor={{ true: '#d4af37', false: '#3a3a3f' }}
                  thumbColor="#f7f3ea"
                />
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.hint}>{t('widgetConfig.previewHint')}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => setResult('cancel')}
          style={[styles.button, styles.buttonGhost]}
          accessibilityRole="button">
          <Text style={styles.buttonGhostText}>{t('widgetConfig.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={() => void commit()}
          style={[styles.button, styles.buttonPrimary]}
          accessibilityRole="button">
          <Text style={styles.buttonPrimaryText}>{t('widgetConfig.done')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b0b0d',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44,
  },
  content: { padding: 20, paddingBottom: 24 },
  title: { color: '#f7f3ea', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#d4af37', fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 18 },
  sectionLabel: {
    color: '#f7f3eaa6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    minWidth: 92,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: { borderColor: '#d4af37' },
  swatchDot: { fontSize: 14 },
  swatchLabel: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: { borderColor: '#d4af37' },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDefaultGlyph: { fontSize: 15, fontWeight: '800' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff1a',
  },
  toggleLabel: { color: '#f7f3ea', fontSize: 15, flexShrink: 1, paddingRight: 12 },
  hint: { color: '#f7f3ea80', fontSize: 12, marginTop: 20, lineHeight: 17 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffff1a',
  },
  button: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  buttonGhost: { backgroundColor: '#1c1c20' },
  buttonGhostText: { color: '#f7f3ea', fontSize: 15, fontWeight: '600' },
  buttonPrimary: { backgroundColor: '#d4af37' },
  buttonPrimaryText: { color: '#0b0b0d', fontSize: 15, fontWeight: '700' },
});
