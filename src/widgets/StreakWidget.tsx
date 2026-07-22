'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

// "use no memo" oben: siehe Kommentar in PrayerWidget.tsx (React-Compiler
// bricht sonst mit "Invalid Hook Call", da react-native-android-widget die
// Komponente als rohe Funktion aufruft statt sie echt zu rendern).
//
// Homescreen-Widget "Lernserie": Duolingo-Muster — die Serie sichtbar auf
// dem Homescreen ist der stärkste Trigger, die Tageslektion zu machen.
// Farbe/Deckkraft/Schriftgröße/Ecken/Inhalt sind PER-WIDGET über die
// Konfigurations-Activity einstellbar (WidgetConfig).
import { cardGradient, hairline, WIDGET_THEMES, type WidgetTheme } from './widgetTheme';

export type { WidgetTheme };

export interface StreakWidgetProps {
  streak: number;
  streakLabel: string;
  todayLine: string;
  theme?: WidgetTheme;
  /** Hintergrund-Deckkraft in Prozent (0..100). Default 100 = voll deckend. */
  opacity?: number;
  /** Eckenradius der Karte in px. Default 20. */
  radius?: number;
  /** Multiplikator auf die Basis-Schriftgrößen (1 = unverändert). */
  fontScale?: number;
  /** Serien-Zahl besonders groß darstellen (default false). */
  streakLarge?: boolean;
  /** Label unter der Zahl zeigen (default true). */
  showStreakLabel?: boolean;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
  /** Akzentfarben-Override (Hex) für die Serien-Zahl; undefined = Theme-Akzentfarbe. */
  accentColor?: `#${string}`;
}

export function StreakWidget({
  streak,
  streakLabel,
  todayLine,
  theme = 'dark',
  opacity = 100,
  radius = 20,
  fontScale = 1,
  streakLarge = false,
  showStreakLabel = true,
  textColor,
  accentColor,
}: StreakWidgetProps) {
  const c = WIDGET_THEMES[theme];
  const text = textColor ?? c.text;
  const accent = accentColor ?? c.accent;
  const fs = (n: number) => Math.round(n * fontScale);
  const streakSize = fs(streakLarge ? 44 : 30);
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
        backgroundGradient: cardGradient(theme, opacity),
        borderRadius: radius,
        borderWidth: 1,
        borderColor: hairline(theme),
        padding: 12,
      }}>
      <TextWidget text={`🔥 ${streak}`} style={{ fontSize: streakSize, color: accent, fontWeight: '700', letterSpacing: 0.2 }} />
      {showStreakLabel ? (
        <TextWidget text={streakLabel} style={{ fontSize: 12, color: text, marginTop: 4, letterSpacing: 0.2 }} />
      ) : null}
      <TextWidget text={todayLine} style={{ fontSize: 11, color: c.muted, marginTop: 6 }} />
    </FlexWidget>
  );
}
