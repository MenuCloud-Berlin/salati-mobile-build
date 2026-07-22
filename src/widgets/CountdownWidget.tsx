'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WIDGET_THEMES, withOpacity, type WidgetTheme } from './widgetTheme';

// "use no memo" oben: siehe Kommentar in PrayerWidget.tsx (React-Compiler
// bricht sonst mit "Invalid Hook Call", da react-native-android-widget die
// Komponente als rohe Funktion aufruft statt sie echt zu rendern).
//
// Homescreen-Widget "Countdown": kompaktes Einzel-Widget, das nur das nächste
// Gebet groß zeigt — Name, Uhrzeit und die verbleibende Zeit als Text
// (z. B. "in 2h 15m"). Das Widget tickt NICHT sekündlich (Android aktualisiert
// Widgets höchstens alle 30 Min, updatePeriodMillis); die Restzeit ist der
// Stand des letzten Updates — deshalb bewusst "in Xh Ym", kein Live-Timer.
export type { WidgetTheme };

export interface CountdownWidgetProps {
  title: string;
  nextName: string;
  nextTime: string;
  /** Verbleibende Zeit, bereits übersetzt formatiert (z. B. "in 2h 15m"). */
  remaining: string;
  theme?: WidgetTheme;
  /** Hintergrund-Deckkraft in Prozent (0..100). Default 100 = voll deckend. */
  opacity?: number;
  /** Eckenradius der Karte in px. Default 20. */
  radius?: number;
  /** Multiplikator auf die Basis-Schriftgrößen (1 = unverändert). */
  fontScale?: number;
  /** Ort/Titel-Zeile oben zeigen (default true). */
  showCoords?: boolean;
  /** Absolute Uhrzeit des nächsten Gebets zeigen (default true). */
  showNextTime?: boolean;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
  /** Akzentfarben-Override (Hex); undefined = Theme-Akzentfarbe. */
  accentColor?: `#${string}`;
}

export function CountdownWidget({
  title,
  nextName,
  nextTime,
  remaining,
  theme = 'dark',
  opacity = 100,
  radius = 20,
  fontScale = 1,
  showCoords = true,
  showNextTime = true,
  textColor,
  accentColor,
}: CountdownWidgetProps) {
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderRadius: radius,
        padding: 12,
      }}>
      {showCoords ? <TextWidget text={title} style={{ fontSize: 11, color: c.muted }} /> : null}
      <TextWidget text={nextName} style={{ fontSize: fs(22), color: accent, fontWeight: '700', marginTop: 2 }} />
      {showNextTime ? (
        <TextWidget text={nextTime} style={{ fontSize: fs(18), color: text, fontWeight: '700' }} />
      ) : null}
      <TextWidget text={remaining} style={{ fontSize: 12, color: c.muted, marginTop: 4 }} />
    </FlexWidget>
  );
}
