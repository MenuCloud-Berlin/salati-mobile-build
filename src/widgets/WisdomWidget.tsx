'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WIDGET_THEMES, transparentBg, type WidgetTheme } from './widgetTheme';

// "use no memo" oben: siehe Kommentar in PrayerWidget.tsx (React-Compiler
// bricht sonst mit "Invalid Hook Call", da react-native-android-widget die
// Komponente als rohe Funktion aufruft statt sie echt zu rendern).
//
// Homescreen-Widget "Dua des Tages": rotiert täglich durch die 47 geprüften
// Duas der App (Hisnul-Muslim-Kern-Set) — komplett offline, keine API nötig.
// Zwei Farbthemen wählbar — Begründung/Palette s. widgetTheme.ts.
export type { WidgetTheme };

export interface WisdomWidgetProps {
  title: string;
  arabic: string;
  translation: string;
  theme?: WidgetTheme;
  /** Halbtransparenter Kartenhintergrund (PER-WIDGET Transparenz-Option). */
  transparent?: boolean;
  /** Übersetzungs-Zeile unter dem arabischen Text zeigen (default true). */
  showTranslation?: boolean;
}

export function WisdomWidget({
  title,
  arabic,
  translation,
  theme = 'dark',
  transparent = false,
  showTranslation = true,
}: WisdomWidgetProps) {
  const c = WIDGET_THEMES[theme];
  const bg = transparent ? transparentBg(c.bg) : c.bg;
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
      <TextWidget text={title} style={{ fontSize: 11, color: c.accent }} />
      <TextWidget
        text={arabic}
        truncate="END"
        maxLines={2}
        style={{ fontSize: 17, color: c.text, marginTop: 6, marginBottom: 6 }}
      />
      {showTranslation ? (
        <TextWidget text={translation} truncate="END" maxLines={3} style={{ fontSize: 12, color: c.muted }} />
      ) : null}
    </FlexWidget>
  );
}
