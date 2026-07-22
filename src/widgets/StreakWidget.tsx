'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

// "use no memo" oben: siehe Kommentar in PrayerWidget.tsx (React-Compiler
// bricht sonst mit "Invalid Hook Call", da react-native-android-widget die
// Komponente als rohe Funktion aufruft statt sie echt zu rendern).
//
// Homescreen-Widget "Lernserie": Duolingo-Muster — die Serie sichtbar auf
// dem Homescreen ist der stärkste Trigger, die Tageslektion zu machen.
// Zwei Farbthemen wählbar — Begründung/Palette s. PrayerWidget.tsx (gleicher
// Ansatz: eigener Widget-Eintrag im Picker statt Runtime-Konfiguration).
import { WIDGET_THEMES, transparentBg, type WidgetTheme } from './widgetTheme';

export type { WidgetTheme };

export interface StreakWidgetProps {
  streak: number;
  streakLabel: string;
  todayLine: string;
  theme?: WidgetTheme;
  /** Halbtransparenter Kartenhintergrund (PER-WIDGET Transparenz-Option). */
  transparent?: boolean;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
}

export function StreakWidget({
  streak,
  streakLabel,
  todayLine,
  theme = 'dark',
  transparent = false,
  textColor,
}: StreakWidgetProps) {
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderRadius: 20,
        padding: 12,
      }}>
      <TextWidget text={`🔥 ${streak}`} style={{ fontSize: 30, color: c.accent, fontWeight: '700' }} />
      <TextWidget text={streakLabel} style={{ fontSize: 12, color: text, marginTop: 4 }} />
      <TextWidget text={todayLine} style={{ fontSize: 11, color: c.muted, marginTop: 6 }} />
    </FlexWidget>
  );
}
