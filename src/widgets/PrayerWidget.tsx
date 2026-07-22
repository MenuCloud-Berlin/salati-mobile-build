'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { cardGradient, hairline, tint, WIDGET_THEMES, type WidgetTheme } from './widgetTheme';

// "use no memo" oben: react-native-android-widget ruft Widget-Komponenten
// als rohe Funktion auf (jsxTree.type(props), kein echter React-Render) -
// der React-19-Compiler (app.config.ts reactCompiler:true) transformiert
// PascalCase-Funktionen sonst auf useMemoCache-Hooks, was hier mit
// "Invalid Hook Call" crasht (live im Emulator reproduziert, Widget blieb
// leer). Betrifft auch StreakWidget.tsx/WisdomWidget.tsx.
//
// Homescreen-Widget "Gebetszeiten": nächstes Gebet groß + alle fünf Zeiten
// des Tages. Farbe/Deckkraft/Schriftgröße/Ecken/Inhalt sind PER-WIDGET über
// die Konfigurations-Activity einstellbar (WidgetConfig) — Palette/Begründung
// s. widgetTheme.ts.

export type { WidgetTheme };

export interface PrayerWidgetProps {
  title: string;
  nextName: string;
  nextTime: string;
  rows: { name: string; time: string; active: boolean; passed?: boolean }[];
  theme?: WidgetTheme;
  /** Hintergrund-Deckkraft in Prozent (0..100). Default 100 = voll deckend. */
  opacity?: number;
  /** Eckenradius der Karte in px. Default 20. */
  radius?: number;
  /** Multiplikator auf die Basis-Schriftgrößen (1 = unverändert). */
  fontScale?: number;
  /** Standort-Zeile oben zeigen (default true). */
  showCoords?: boolean;
  /** Große "nächstes Gebet"-Zeile (Name + Uhrzeit) zeigen (default true). */
  showNextTime?: boolean;
  /** Nächstes Gebet in der Zeiten-Zeile farblich hervorheben (default true). */
  highlightNext?: boolean;
  /** Countdown-Zeile ("in Xh Ym") unter den Zeiten zeigen (default false). */
  showCountdown?: boolean;
  /** Bereits formatierte Restzeit für die Countdown-Zeile (z. B. "in 2h 15m"). */
  remaining?: string;
  /**
   * Fortschritt vom vorigen zum nächsten Gebet (0..1) für die dünne
   * Fortschrittsleiste. undefined = keine Leiste (z. B. wenn kein sinnvoller
   * Bezugspunkt existiert). Reiner Anzeigewert vom letzten Widget-Update.
   */
  progress?: number;
  /** Bereits formatiertes Hijri-Datum; gesetzt = Hijri-Zeile zeigen. */
  hijri?: string;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
  /** Akzentfarben-Override (Hex); undefined = Theme-Akzentfarbe. */
  accentColor?: `#${string}`;
}

export function PrayerWidget({
  title,
  nextName,
  nextTime,
  rows,
  theme = 'dark',
  opacity = 100,
  radius = 20,
  fontScale = 1,
  showCoords = true,
  showNextTime = true,
  highlightNext = true,
  showCountdown = false,
  remaining,
  progress,
  hijri,
  textColor,
  accentColor,
}: PrayerWidgetProps) {
  const c = WIDGET_THEMES[theme];
  const text = textColor ?? c.text;
  const accent = accentColor ?? c.accent;
  const fs = (n: number) => Math.round(n * fontScale);
  // Vergangene Gebete dezent abtönen, damit die Zeit-Reihe eine klare
  // Lese-Hierarchie bekommt (erledigt → gedimmt, kommend → normal, nächstes
  // → Akzent-Pille). Basis ist die Textfarbe mit reduziertem Alpha.
  const dim = tint(text, 0.4);
  const showProgress = typeof progress === 'number' && progress >= 0 && progress <= 1;
  const p = showProgress ? Math.max(0.001, Math.min(0.999, progress as number)) : 0;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundGradient: cardGradient(theme, opacity),
        borderRadius: radius,
        borderWidth: 1,
        borderColor: hairline(theme),
        padding: 14,
      }}>
      {showCoords ? (
        <TextWidget
          text={title}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 11, color: c.muted, letterSpacing: 0.3 }}
        />
      ) : null}
      {hijri ? (
        <TextWidget text={hijri} truncate="END" maxLines={1} style={{ fontSize: 11, color: c.muted, letterSpacing: 0.3 }} />
      ) : null}
      {showNextTime ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            width: 'match_parent',
            marginTop: 6,
            marginBottom: 10,
          }}>
          <TextWidget text={nextName} style={{ fontSize: fs(24), color: accent, fontWeight: '700', letterSpacing: 0.2 }} />
          <TextWidget text={`  ${nextTime}`} style={{ fontSize: fs(24), color: text, fontWeight: '700' }} />
        </FlexWidget>
      ) : null}
      {showNextTime ? (
        <FlexWidget
          style={{ width: 'match_parent', height: 1, backgroundColor: hairline(theme, 0.16), marginBottom: 10 }}
        />
      ) : null}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
        {rows.map((r, i) => {
          const on = r.active && highlightNext;
          const nameColor = on ? accent : r.passed ? dim : c.muted;
          const timeColor = on ? accent : r.passed ? dim : text;
          return (
            <FlexWidget
              key={`${r.name}-${i}`}
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 12,
                paddingHorizontal: 6,
                paddingVertical: 5,
                backgroundColor: on ? tint(accent, 0.16) : '#00000000',
              }}>
              <TextWidget text={r.name} style={{ fontSize: 11, color: nameColor, letterSpacing: 0.2 }} />
              <TextWidget
                text={r.time}
                style={{ fontSize: fs(13), color: timeColor, fontWeight: on ? '700' : '500', marginTop: 2 }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
      {showProgress ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            height: 4,
            borderRadius: 999,
            backgroundColor: tint(text, 0.12),
            marginTop: 12,
            overflow: 'hidden',
          }}>
          <FlexWidget style={{ height: 4, flex: p, borderRadius: 999, backgroundColor: accent }} />
          <FlexWidget style={{ height: 4, flex: 1 - p }} />
        </FlexWidget>
      ) : null}
      {showCountdown && remaining ? (
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: showProgress ? 8 : 10 }}>
          <FlexWidget
            style={{
              backgroundColor: tint(accent, 0.16),
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}>
            <TextWidget text={remaining} style={{ fontSize: fs(11), color: accent, fontWeight: '600', letterSpacing: 0.2 }} />
          </FlexWidget>
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}
