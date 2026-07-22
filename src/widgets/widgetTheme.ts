// Gemeinsame Farbthemen für ALLE Homescreen-Widgets (PrayerWidget/
// StreakWidget/WisdomWidget/QiblaWidget/CountdownWidget).
//
// react-native-android-widget 0.21 bietet KEINE JS-seitig ansteuerbare
// Konfigurations-Activity (widgetFeatures erlaubt nur ein natives
// 'configurable'-Flag ohne Möglichkeit, dort auf einen RN-Screen zu zeigen —
// geprüft in dessen config-plugin.type.ts). Das gewählte Theme kommt deshalb
// aus den App-Einstellungen (AppSettings.widgetTheme): der Headless-Handler
// (widget-task-handler.tsx) liest die Einstellung bei jedem Render aus
// AsyncStorage und wendet sie auf alle Widgets an. Ändert der Nutzer die
// Widget-Farbe in den Einstellungen, sehen bereits platzierte Widgets die
// neue Farbe beim nächsten Update. Die "Light"-Provider im Widget-Picker
// (app.config.ts) bleiben nur aus Kompatibilitätsgründen bestehen — die
// App-Einstellung ist ab jetzt die einzige Quelle für das Farbthema.
//
// Farbtokens pro Theme: bg (Kartenhintergrund), text (Haupttext),
// accent (nächstes Gebet / Streak-Zahl / Titel), muted (Nebentext).
// Alle 8-stelligen Hex-Werte sind RN-Style (#RRGGBBAA, Alpha zuletzt) — das
// Paket normalisiert das intern (bestehende Nutzung: muted '#f7f3eaa6').
// Kontrast: jedes Theme hält hellen Text auf dunklem bzw. dunklen Text auf
// hellem Grund (WCAG-tauglich); Akzente sind so gewählt, dass sie auf ihrem
// Grund klar lesbar bleiben (z. B. dunkles Gold #846200 auf Weiß statt
// hellem Brand-Gold).
export const WIDGET_THEMES = {
  // Standard: dunkle Karte, liegt auf beliebigen Wallpapern gut lesbar.
  dark: { bg: '#0b0b0d', text: '#f7f3ea', accent: '#d4af37', muted: '#f7f3eaa6' },
  // Helles Papier — Gold zu kontrastschwach, daher dunkles Gold #846200.
  light: { bg: '#f7f3ea', text: '#0b0b0d', accent: '#846200', muted: '#0b0b0da6' },
  // Transparent: halbtransparenter dunkler Scrim (73 % Deckung) statt voller
  // Transparenz — hält den Text auf JEDEM Wallpaper lesbar, ohne auf
  // Text-Schatten angewiesen zu sein (die das Paket nicht zuverlässig
  // rendert). Heller Text + etwas hellerer Gold-Akzent für den Glas-Look.
  transparent: { bg: '#0b0b0dbb', text: '#ffffff', accent: '#f0cf6b', muted: '#ffffffcc' },
  // Reines Schwarz (AMOLED-freundlich) — heller Text, warmes Gold.
  black: { bg: '#000000', text: '#ffffff', accent: '#e8c14f', muted: '#ffffffb3' },
  // Reines Weiß — dunkler Text, dunkles Gold für ausreichenden Kontrast.
  white: { bg: '#ffffff', text: '#111111', accent: '#8a6d00', muted: '#111111b3' },
  // Tiefes Violett (violet-800) — heller Text, sanft-lila Akzent.
  purple: { bg: '#4c1d95', text: '#f5f3ff', accent: '#ddd6fe', muted: '#f5f3ffcc' },
  // Warmes Orange (orange-800) — heller Text, cremiger Akzent.
  orange: { bg: '#9a3412', text: '#fff7ed', accent: '#ffd9a8', muted: '#fff7edcc' },
} as const;

export type WidgetTheme = keyof typeof WIDGET_THEMES;

/** Alle Theme-Schlüssel als Array (für die Auswahl in den Einstellungen). */
export const WIDGET_THEME_KEYS = Object.keys(WIDGET_THEMES) as WidgetTheme[];

// Macht den Kartenhintergrund eines beliebigen Themes halbtransparent, ohne
// die Farbe zu ändern (für die PER-WIDGET Transparenz-Option, WidgetConfig).
// Erzwingt einen Alpha-Wert von 0xbb (~73 % Deckung) — derselbe Wert wie im
// vorhandenen "transparent"-Theme, damit heller/dunkler Text auf jedem
// Wallpaper lesbar bleibt. Akzeptiert #RRGGBB und #RRGGBBAA und wirft den
// vorhandenen Alpha-Anteil weg, bevor 0xbb angehängt wird.
export function transparentBg(hex: string): `#${string}` {
  const base = hex.length === 9 ? hex.slice(0, 7) : hex; // → #RRGGBB
  const stripped = base.startsWith('#') ? base.slice(1) : base;
  return `#${stripped}bb`;
}
