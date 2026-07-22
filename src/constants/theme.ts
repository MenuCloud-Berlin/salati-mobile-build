/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Salatibox-Markenpalette (identisch zu apps/device/src/app/globals.css)
export const Brand = {
  gold: '#d4af37',
  goldSoft: '#c9a96e',
  ink: '#0b0b0d',
  paper: '#f7f3ea',
} as const;

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.paper,
    backgroundElement: '#F0EAD9',
    backgroundSelected: '#E8DFC7',
    // iOS-„systemGroupedBackground": ruhiger, leicht dunklerer Grund, VOR dem
    // die abgerundeten Inset-Karten (backgroundElement) heller stehen — genau
    // die Ebenen-Staffelung der iOS-Einstellungen (Seite dunkler, Karte heller).
    groupedBackground: '#E4DCC7',
    textSecondary: '#6B6455',
    // Dunkleres Gold für Text/Icons im Light Mode: Brand.gold (#d4af37) hat
    // auf Paper nur 1.9:1 Kontrast (WCAG-Fail) — #846200 erreicht 5.1:1 auf
    // Paper und 4.7:1 auf Karten. Dekorative Flächen (Progress-Fill, Nadel,
    // Rahmen) nutzen weiter Brand.gold direkt.
    accent: '#846200',
  },
  dark: {
    text: Brand.paper,
    background: Brand.ink,
    backgroundElement: '#1A1A1D',
    backgroundSelected: '#242427',
    // Im Dark Mode ist die Seite (ink, fast schwarz) dunkler als die Karten
    // (#1A1A1D) — wieder die iOS-Staffelung, nur invertiert.
    groupedBackground: Brand.ink,
    textSecondary: 'rgba(247,243,234,0.65)',
    accent: Brand.gold,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// KFGQPC HAFS Uthmanic Script — der offizielle Koran-Font des King Fahd
// Glorious Quran Printing Complex (Madinah, Saudi-Arabien; fonts.qurancomplex.gov.sa,
// deren offizielles Entwickler-Portal qurancomplex.gov.sa/en/techquran/dev/ Fonts
// genau für diesen Zweck bereitstellt). Bezogen als offizieller Font-Mirror von
// github.com/thetruetruth/quran-data-kfgqpc (hafs/font/hafs.18.ttf, Font-interner
// Name "KFGQPC HAFS Uthmanic Script Regular", geprüft per Font-Name-Tabelle).
// Einbindung erfolgt auf ausdrückliche Anweisung des Produktinhabers, der die
// Lizenzfrage als geklärt erklärt hat — siehe assets/fonts/CREDITS.md für Details.
// Registrierung/Laden via useFonts in app/_layout.tsx.
export const ArabicFont = 'KFGQPCHafs';

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Web-only: Platz für den schwebenden Zurück-Chip auf Stack-Routen —
 * ohne diesen Versatz überlappt der Chip die Seitentitel (36px Chip
 * + 16px Abstand; nativ gibt es den Chip nicht). */
export const BackChipInset = Platform.OS === 'web' ? 44 : 0;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Einheitliche Icon-Badge-Größenskala (Audit 2026-07-22: vorher 32↔44 wild
 * gemischt). `row` = kompakte Listen-Zeile (Mehr, Moscheen, Studium-Hub,
 * Erste-Schritte), `card` = große Feature-/Raster-Karte (Lernen). Bewusst
 * kompakt (Apple-Maß): lieber ruhig-dicht als aufgeblasen.
 */
export const IconBadge = {
  row: 40,
  card: 44,
} as const;
