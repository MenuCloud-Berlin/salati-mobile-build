'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { WIDGET_THEMES, transparentBg, type WidgetTheme } from './widgetTheme';

// "use no memo" oben: siehe Kommentar in PrayerWidget.tsx (React-Compiler
// bricht sonst mit "Invalid Hook Call", da react-native-android-widget die
// Komponente als rohe Funktion aufruft statt sie echt zu rendern).
//
// Homescreen-Widget "Qibla": Bearing zur Kaaba (Great-Circle) + Himmels-
// richtung als Wort + Entfernung — komplett offline aus dem gespeicherten
// Standort berechnet (features/qibla/bearing.ts). KEIN Live-Kompass: ein
// Homescreen-Widget hat keinen Zugriff auf den Magnetometer-Stream, daher
// das feste geografische Bearing statt einer drehenden Nadel.
export type { WidgetTheme };

export interface QiblaWidgetProps {
  title: string;
  /** Bearing als fertig formatierter String, z. B. "137°". */
  bearing: string;
  /** Himmelsrichtung als Wort, z. B. "Südosten". */
  direction: string;
  /** Entfernung zur Kaaba, z. B. "4312 km". */
  distance: string;
  theme?: WidgetTheme;
  /** Halbtransparenter Kartenhintergrund (PER-WIDGET Transparenz-Option). */
  transparent?: boolean;
  /** Entfernungs-Zeile zeigen (default true). */
  showDistance?: boolean;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
}

export function QiblaWidget({
  title,
  bearing,
  direction,
  distance,
  theme = 'dark',
  transparent = false,
  showDistance = true,
  textColor,
}: QiblaWidgetProps) {
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
      <TextWidget text={`🕋 ${title}`} style={{ fontSize: 11, color: c.accent }} />
      <TextWidget text={bearing} style={{ fontSize: 30, color: text, fontWeight: '700', marginTop: 2 }} />
      <TextWidget text={direction} style={{ fontSize: 13, color: c.accent, fontWeight: '700' }} />
      {showDistance ? (
        <TextWidget text={distance} style={{ fontSize: 11, color: c.muted, marginTop: 4 }} />
      ) : null}
    </FlexWidget>
  );
}
