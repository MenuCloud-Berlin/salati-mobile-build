// watchOS-Komplikation ("Naechstes Gebet") via WidgetKit - Uhr-Pendant zu
// targets/salati-widget/ (iOS-Homescreen-Widget). Seit watchOS 9 sind
// Komplikationen technisch WidgetKit-Widgets mit den zusaetzlichen
// .accessoryCircular/.accessoryRectangular/.accessoryInline/.accessoryCorner-
// Widget-Familien (siehe SalatiPrayerComplication.swift) - kein ClockKit
// mehr noetig.
//
// WICHTIG: braucht ein bereits vorhandenes "watch"-Target im selben Xcode-
// Projekt, um sich einzubetten - siehe targets/salati-watch/expo-target.config.js
// Kopfkommentar. Beide Targets MUESSEN zusammen existieren.
//
// App-Group MUSS identisch mit targets/salati-widget/expo-target.config.js
// und src/features/prayer-times/ios-widget.ts sein - die iPhone-App schreibt
// EINMAL in dieselbe App-Group-Datei, iOS-Widget UND Watch-Komplikation lesen
// beide von dort (keine Datenduplizierung/kein separater Schreibpfad fuer die
// Uhr - anders als bei WearOS, wo es keine geteilte App-Group zwischen
// Telefon und Uhr gibt und daher ein eigener Data-Layer-Sync noetig ist,
// siehe src/features/prayer-times/wear-sync.ts).
//
// UNGETESTET: wie targets/salati-widget/ nie mit `npx expo prebuild -p ios`
// generiert (kein macOS in dieser Session, siehe USER-TODO.md).
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch-widget',
  name: 'SalatiPrayerComplication',
  // Bundle-ID bewusst NICHT ".watch.complication": Apple Developer Portal
  // lehnt jede App-ID-Registrierung ab, die den String "complication"
  // enthaelt, mit einer irrefuehrenden "Identifier is not available"-
  // Meldung (409 ENTITY_ERROR.ATTRIBUTE.INVALID) - reproduzierbar mit
  // mehreren unbenutzten Test-Strings verifiziert, kein echter Namens-
  // konflikt. ".watch.clock" ist funktional identisch (nur ein Bezeichner)
  // und wurde erfolgreich registriert.
  bundleIdentifier: '.watch.clock',
  colors: {
    $accent: '#d4af37', // Brand.gold, siehe src/constants/theme.ts
    $widgetBackground: '#0b0b0d', // Brand.ink
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.de.salatibox.de'],
  },
  deploymentTarget: '11.0',
};
