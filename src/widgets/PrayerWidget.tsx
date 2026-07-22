'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WIDGET_THEMES, transparentBg, type WidgetTheme } from './widgetTheme';

// "use no memo" oben: react-native-android-widget ruft Widget-Komponenten
// als rohe Funktion auf (jsxTree.type(props), kein echter React-Render) -
// der React-19-Compiler (app.config.ts reactCompiler:true) transformiert
// PascalCase-Funktionen sonst auf useMemoCache-Hooks, was hier mit
// "Invalid Hook Call" crasht (live im Emulator reproduziert, Widget blieb
// leer). Betrifft auch StreakWidget.tsx/WisdomWidget.tsx.
//
// Homescreen-Widget "Gebetszeiten": nächstes Gebet groß + alle fünf Zeiten
// des Tages. Zwei Farbthemen wählbar — Begründung/Palette s. widgetTheme.ts.

export type { WidgetTheme };

export interface PrayerWidgetProps {
  title: string;
  nextName: string;
  nextTime: string;
  rows: { name: string; time: string; active: boolean }[];
  theme?: WidgetTheme;
  /** Halbtransparenter Kartenhintergrund (PER-WIDGET Transparenz-Option). */
  transparent?: boolean;
  /** Ort/Standort-Zeile oben zeigen (default true). */
  showCoords?: boolean;
  /** Große "nächstes Gebet"-Zeile (Name + Uhrzeit) zeigen (default true). */
  showNextTime?: boolean;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
}

export function PrayerWidget({
  title,
  nextName,
  nextTime,
  rows,
  theme = 'dark',
  transparent = false,
  showCoords = true,
  showNextTime = true,
  textColor,
}: PrayerWidgetProps) {
  const c = WIDGET_THEMES[theme];
  const bg = transparent ? transparentBg(c.bg) : c.bg;
  const text = textColor ?? c.text;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: bg,
        borderRadius: 20,
        padding: 14,
      }}>
      {showCoords ? <TextWidget text={title} style={{ fontSize: 11, color: c.muted }} /> : null}
      {showNextTime ? (
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            width: 'match_parent',
            marginTop: 2,
            marginBottom: 8,
          }}>
          <TextWidget text={nextName} style={{ fontSize: 20, color: c.accent, fontWeight: '700' }} />
          <TextWidget text={`  ${nextTime}`} style={{ fontSize: 20, color: text, fontWeight: '700' }} />
        </FlexWidget>
      ) : null}
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
        {rows.map((r) => (
          <FlexWidget key={r.name} style={{ flexDirection: 'column', alignItems: 'center' }}>
            <TextWidget text={r.name} style={{ fontSize: 11, color: r.active ? c.accent : c.muted }} />
            <TextWidget
              text={r.time}
              style={{ fontSize: 13, color: r.active ? c.accent : text, fontWeight: r.active ? '700' : '400' }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
