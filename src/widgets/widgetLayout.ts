// Gemeinsame Layout-/Deep-Link-Helfer für ALLE Homescreen-Widgets.
//
// 1) DEEP-LINKS: Ein Tap auf ein Widget öffnet NICHT mehr die App im
//    zuletzt gesehenen Zustand (früher clickAction="OPEN_APP"), sondern
//    springt gezielt zum passenden Screen. Umgesetzt über
//    clickAction="OPEN_URI" + clickActionData={{ uri }} am Widget-Root:
//    react-native-android-widget feuert nativ ein ACTION_VIEW-Intent mit
//    FLAG_ACTIVITY_NEW_TASK auf die URI (RNWidgetProvider.openUri) — Expo
//    Router hängt das App-Schema 'salatibox' (app.config.ts) automatisch an
//    das file-based Routing, sodass die URI wie jeder externe Deep-Link zur
//    Route navigiert, egal ob die App kalt startet oder nur im Hintergrund
//    lag. Die Pfade folgen 1:1 dem Routing (Route-Group "(tabs)" taucht in
//    der URL nicht auf), s. src/lib/deepLinks.ts.
//      - '' (leerer Pfad) -> (tabs)/index.tsx = Gebetszeiten-Tab (Home).
//      - 'qibla'          -> (tabs)/qibla.tsx  = Qibla-Tab.
//      - 'duas'           -> duas/index.tsx    = Dua-Übersicht.
//      - 'study'          -> study/index.tsx   = Lern-Hub (die Streak zählt
//                            genau diese Kurse, s. features/study/streak.ts).
//
// 2) withAlpha: leitet aus einem 6-stelligen Theme-Akzent eine
//    halbtransparente Tönung ab (#RRGGBB + AA -> #RRGGBBAA, RN-Alpha zuletzt;
//    das Paket normalisiert das, s. widgetTheme.ts). Für Pillen/Hero-Flächen,
//    damit die Widgets auf allen 7 Themen einen ruhigen Akzent-Untergrund
//    bekommen statt harter Blöcke.
//
// 3) Größen-Helfer: react-native-android-widget übergibt dem Task-Handler die
//    aktuelle Widget-Größe in DP (widgetInfo.width/height). Damit rendern die
//    Widgets je nach Größe ein anderes Layout (kompakt / breit / hoch), statt
//    unten einen leeren Balken zu lassen.

const SCHEME = 'salatibox';

export const WIDGET_DEEP_LINKS = {
  /** Gebetszeiten-Tab (Home-Index) — leerer Pfad öffnet (tabs)/index.tsx. */
  prayer: `${SCHEME}://`,
  /** Countdown zeigt ebenfalls Gebetszeiten -> gleicher Tab. */
  countdown: `${SCHEME}://`,
  qibla: `${SCHEME}://qibla`,
  duas: `${SCHEME}://duas`,
  /** Lern-Hub: die Streak aggregiert genau die study-Kurse + Koran-Lernen. */
  study: `${SCHEME}://study`,
} as const;

/** #RRGGBB + 2-stelliges Alpha -> #RRGGBBAA (typsicher als HexColor). */
export function withAlpha(hex: string, alpha: string): `#${string}` {
  return `${hex}${alpha}` as `#${string}`;
}

export interface WidgetSize {
  width: number;
  height: number;
}

// --- Größen-adaptives Layout -------------------------------------------------
// react-native-android-widget übergibt dem Task-Handler die aktuelle Widget-
// Größe in DP (WidgetInfo.width/height). In Portrait meldet das Paket die real
// sichtbare Höhe als OPTION_APPWIDGET_MAX_HEIGHT (RNWidgetUtil.getWidgetHeight)
// — also die tatsächliche Zellenhöhe, nicht einen aufgeblähten Maximalwert.
// Typische Launcher-Zeilenhöhen: 1 Zelle ~40–70dp, 2 Zellen ~110–150dp,
// 3+ Zellen ~180dp+. Daraus leiten wir drei Dichtestufen ab, damit ein flaches
// Widget (z. B. 4×1) die wichtigste Info kompakt zeigt statt unten abzuschneiden.

/**
 * Höhen-Kategorie eines Widgets aus der verfügbaren DP-Höhe:
 *  - 'compact' (< 100dp, ~1 Zelle): nur die Kern-Info in einer Zeile.
 *  - 'medium'  (100–175dp, ~2 Zellen): Kern-Info + eine kompakte Detailzeile.
 *  - 'tall'    (>= 175dp, 3+ Zellen): volles Layout mit allen Extras.
 * Fehlt die Höhe (0/undefined — z. B. direkt bei WIDGET_ADDED, bevor der
 * Launcher gemessen hat), fällt alles defensiv auf 'tall' zurück → das
 * bisherige Voll-Layout, sodass nichts regressiert.
 */
export type WidgetHeightBucket = 'compact' | 'medium' | 'tall';

export function heightBucket(height: number | undefined): WidgetHeightBucket {
  if (!height || height <= 0) return 'tall';
  if (height < 100) return 'compact';
  if (height < 175) return 'medium';
  return 'tall';
}

/**
 * Auto-Schriftfaktor aus der verfügbaren Breite: schmale Widgets (z. B. 2–3
 * Zellen breit) bekommen proportional kleinere Schrift/Abstände, damit z. B.
 * die 5-Spalten-Zeitenreihe des Gebetszeiten-Widgets nicht überläuft. Ab ~250dp
 * (4 Zellen) bleibt der Faktor 1.0 (unverändert). Fehlt die Breite → 1.0.
 * Wird auf die vom Nutzer gewählte Schriftgröße MULTIPLIZIERT, nicht ersetzt.
 */
export function widthScale(width: number | undefined): number {
  if (!width || width <= 0) return 1;
  if (width >= 250) return 1;
  if (width <= 140) return 0.8;
  return 0.8 + ((width - 140) / (250 - 140)) * 0.2;
}
