'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WIDGET_THEMES, withOpacity, type WidgetTheme } from './widgetTheme';

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
  rows: { name: string; time: string; active: boolean }[];
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
  hijri,
  textColor,
  accentColor,
}: PrayerWidgetProps) {
  const c = WIDGET_THEMES[theme];
  const bg = withOpacity(c.bg, opacity);
  const text = textColor ?? c.text;
  const accent = accentColor ?? c.accent;
  const fs = (n: number) => Math.round(n * fontScale);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: bg,
        borderRadius: radius,
        padding: 14,
      }}>
      {showCoords ? <TextWidget text={title} style={{ fontSize: 11, color: c.muted }} /> : null}
      {hijri ? <TextWidget text={hijri} style={{ fontSize: 11, color: c.muted }} /> : null}
      {showNextTime ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            width: 'match_parent',
            marginTop: 2,
            marginBottom: 8,
          }}>
          <TextWidget text={nextName} style={{ fontSize: fs(20), color: accent, fontWeight: '700' }} />
          <TextWidget text={`  ${nextTime}`} style={{ fontSize: fs(20), color: text, fontWeight: '700' }} />
        </FlexWidget>
      ) : null}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
        {rows.map((r, i) => {
          const on = r.active && highlightNext;
          return (
            <FlexWidget key={`${r.name}-${i}`} style={{ flexDirection: 'column', alignItems: 'center' }}>
              <TextWidget text={r.name} style={{ fontSize: 11, color: on ? accent : c.muted }} />
              <TextWidget
                text={r.time}
                style={{ fontSize: fs(13), color: on ? accent : text, fontWeight: on ? '700' : '400' }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
      {showCountdown && remaining ? (
        <TextWidget text={remaining} style={{ fontSize: 11, color: c.muted, marginTop: 8 }} />
      ) : null}
    </FlexWidget>
  );
}
