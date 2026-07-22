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
