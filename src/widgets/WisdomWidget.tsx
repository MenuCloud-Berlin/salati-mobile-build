'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WIDGET_THEMES, withOpacity, type WidgetTheme } from './widgetTheme';

// "use no memo" oben: siehe Kommentar in PrayerWidget.tsx (React-Compiler
// bricht sonst mit "Invalid Hook Call", da react-native-android-widget die
// Komponente als rohe Funktion aufruft statt sie echt zu rendern).
//
// Homescreen-Widget "Dua des Tages": rotiert täglich (oder zufällig) durch die
// geprüften Duas der App (Hisnul-Muslim-Kern-Set) — komplett offline, keine
// API nötig. Farbe/Deckkraft/Schriftgröße/Ecken/Inhalt sind PER-WIDGET über
// die Konfigurations-Activity einstellbar (WidgetConfig).
export type { WidgetTheme };

export interface WisdomWidgetProps {
  title: string;
  arabic: string;
  translation: string;
  /** Quelle (Überlieferung/Sure); gesetzt + showSource = Quellen-Zeile zeigen. */
  source?: string;
  theme?: WidgetTheme;
  /** Hintergrund-Deckkraft in Prozent (0..100). Default 100 = voll deckend. */
  opacity?: number;
  /** Eckenradius der Karte in px. Default 20. */
  radius?: number;
  /** Multiplikator auf die Basis-Schriftgrößen (1 = unverändert). */
  fontScale?: number;
  /** Arabischen Text zeigen (default true). */
  showArabic?: boolean;
  /** Übersetzungs-Zeile unter dem arabischen Text zeigen (default true). */
  showTranslation?: boolean;
  /** Quellen-Zeile zeigen (default false). */
  showSource?: boolean;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
  /** Akzentfarben-Override (Hex) für den Titel; undefined = Theme-Akzentfarbe. */
  accentColor?: `#${string}`;
}

export function WisdomWidget({
  title,
  arabic,
  translation,
  source,
  theme = 'dark',
  opacity = 100,
  radius = 20,
  fontScale = 1,
  showArabic = true,
  showTranslation = true,
  showSource = false,
  textColor,
  accentColor,
}: WisdomWidgetProps) {
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
      <TextWidget text={title} style={{ fontSize: 11, color: accent }} />
      {showArabic ? (
        <TextWidget
          text={arabic}
          truncate="END"
          maxLines={2}
          style={{ fontSize: fs(17), color: text, marginTop: 6, marginBottom: 6 }}
        />
      ) : null}
      {showTranslation ? (
        <TextWidget text={translation} truncate="END" maxLines={3} style={{ fontSize: fs(12), color: c.muted }} />
      ) : null}
      {showSource && source ? (
        <TextWidget text={source} truncate="END" maxLines={1} style={{ fontSize: 10, color: c.muted, marginTop: 6 }} />
      ) : null}
    </FlexWidget>
  );
}
