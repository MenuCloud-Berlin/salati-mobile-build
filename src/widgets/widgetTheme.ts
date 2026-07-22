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

// PER-WIDGET Textfarben-Override (WidgetConfig). 'default' = die Textfarbe des
// gewählten Themes bleibt unverändert; jede andere Option überschreibt den
// Haupttext (Gebetszeiten/Uhrzeit/arabischer Text/Serien-Label …). Der Akzent
// (nächstes Gebet, aktive Zeile, Streak-Zahl) bleibt bewusst die Theme-
// Akzentfarbe, damit die visuelle Hierarchie erhalten bleibt. Die Farben sind
// bewusst kräftig gewählt, damit sie auf dunklem Grund gut lesbar sind — auf
// hellem Theme kann der Nutzer eine dunkle Farbe (z. B. black) wählen.
export const WIDGET_TEXT_COLORS = {
  default: null,
  red: '#ef4444',
  orange: '#fb923c',
  gold: '#f0cf6b',
  green: '#34d399',
  blue: '#60a5fa',
  white: '#ffffff',
  black: '#111111',
} as const;

export type WidgetTextColor = keyof typeof WIDGET_TEXT_COLORS;

/** Alle Textfarben-Schlüssel als Array (für die Swatch-Auswahl im Config-Screen). */
export const WIDGET_TEXT_COLOR_KEYS = Object.keys(WIDGET_TEXT_COLORS) as WidgetTextColor[];

/**
 * Löst einen Textfarben-Schlüssel in den Hex-Wert auf. 'default' (bzw. ein
 * unbekannter/fehlender Schlüssel) ergibt undefined → das Widget nutzt weiter
 * die Theme-Textfarbe.
 */
export function widgetTextColorHex(key: WidgetTextColor | undefined): `#${string}` | undefined {
  if (!key) return undefined;
  return WIDGET_TEXT_COLORS[key] ?? undefined;
}

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

// PER-WIDGET Hintergrund-Deckkraft in festen Stufen (0/25/50/75/100 %) statt
// nur an/aus. Setzt den Alpha-Anteil des Kartenhintergrunds exakt auf den
// gewählten Prozentwert (100 % = voll deckend #RRGGBB, 0 % = unsichtbar). Ein
// bereits im Theme enthaltener Alpha-Wert (z. B. das "transparent"-Theme) wird
// verworfen und durch den gewählten Prozentwert ersetzt.
export function withOpacity(hex: string, percent: number): `#${string}` {
  const base = hex.length === 9 ? hex.slice(0, 7) : hex; // → #RRGGBB
  const stripped = base.startsWith('#') ? base.slice(1) : base;
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped >= 100) return `#${stripped}`;
  const a = Math.round((clamped / 100) * 255);
  return `#${stripped}${a.toString(16).padStart(2, '0')}`;
}

// Schriftgröße des Haupttexts als PER-WIDGET-Option (klein/mittel/groß). Der
// Wert ist ein Multiplikator auf die Basis-Schriftgrößen jedes Widgets; 1 =
// unverändert (bisheriges Aussehen), damit bestehende Widgets identisch bleiben.
export const WIDGET_FONT_SCALES = { small: 0.85, medium: 1, large: 1.2 } as const;
export type WidgetFontScale = keyof typeof WIDGET_FONT_SCALES;
export const WIDGET_FONT_SCALE_KEYS = Object.keys(WIDGET_FONT_SCALES) as WidgetFontScale[];

// Eckenradius der Widget-Karte als PER-WIDGET-Option. 'rounded' (20) ist der
// bisherige Default — bestehende Widgets bleiben damit unverändert.
export const WIDGET_CORNER_RADII = { sharp: 6, rounded: 20, round: 34 } as const;
export type WidgetCornerStyle = keyof typeof WIDGET_CORNER_RADII;
export const WIDGET_CORNER_STYLE_KEYS = Object.keys(WIDGET_CORNER_RADII) as WidgetCornerStyle[];

// Verfügbare Deckkraft-Stufen für die Auswahl im Config-Screen.
export const WIDGET_OPACITY_STEPS = [0, 25, 50, 75, 100] as const;
export type WidgetOpacity = (typeof WIDGET_OPACITY_STEPS)[number];
