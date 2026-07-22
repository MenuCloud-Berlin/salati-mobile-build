'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { cardGradient, hairline, WIDGET_THEMES, type WidgetTheme } from './widgetTheme';

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
  /** Hintergrund-Deckkraft in Prozent (0..100). Default 100 = voll deckend. */
  opacity?: number;
  /** Eckenradius der Karte in px. Default 20. */
  radius?: number;
  /** Multiplikator auf die Basis-Schriftgrößen (1 = unverändert). */
  fontScale?: number;
  /** Gradzahl (Bearing) zeigen (default true). */
  showBearing?: boolean;
  /** Himmelsrichtung als Wort zeigen (default true). */
  showDirection?: boolean;
  /** Entfernungs-Zeile zeigen (default true). */
  showDistance?: boolean;
  /** Textfarben-Override (Hex) für den Haupttext; undefined = Theme-Textfarbe. */
  textColor?: `#${string}`;
  /** Akzentfarben-Override (Hex); undefined = Theme-Akzentfarbe. */
  accentColor?: `#${string}`;
}

export function QiblaWidget({
  title,
  bearing,
  direction,
  distance,
  theme = 'dark',
  opacity = 100,
  radius = 20,
  fontScale = 1,
  showBearing = true,
  showDirection = true,
  showDistance = true,
  textColor,
  accentColor,
}: QiblaWidgetProps) {
  const c = WIDGET_THEMES[theme];
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
        backgroundGradient: cardGradient(theme, opacity),
        borderRadius: radius,
        borderWidth: 1,
        borderColor: hairline(theme),
        padding: 12,
      }}>
      <TextWidget text={`🕋 ${title}`} style={{ fontSize: 11, color: accent, fontWeight: '600', letterSpacing: 0.3 }} />
      {showBearing ? (
        <TextWidget text={bearing} style={{ fontSize: fs(30), color: text, fontWeight: '700', marginTop: 2 }} />
      ) : null}
      {showDirection ? (
        <TextWidget text={direction} style={{ fontSize: fs(13), color: accent, fontWeight: '700' }} />
      ) : null}
      {showDistance ? (
        <TextWidget text={distance} style={{ fontSize: 11, color: c.muted, marginTop: 4 }} />
      ) : null}
    </FlexWidget>
  );
}
