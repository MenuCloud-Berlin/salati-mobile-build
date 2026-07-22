// watchOS-Begleit-App (Companion Watch App) - reine Huelle, die NUR dafuer
// existiert, damit sich targets/salati-watch-complication/ (Typ
// "watch-widget") als Komplikation einbetten kann: @bacons/apple-targets
// sucht beim Anlegen eines "watch-widget"-Targets im Xcode-Projekt nach
// einem bereits vorhandenen "watch"-Target (isWatchOSTarget()) und bettet
// die Komplikation dort ein - ohne dieses Target hier wuerde die Komplikation
// (mit einer Warnung) faelschlich in die iPhone-App eingebettet und waere auf
// der Uhr nicht sichtbar. Quelle: node_modules/@bacons/apple-targets/build/
// with-xcode-changes.js (isWatchOSExtensionTarget()-Fallback-Pfad), geprueft
// in dieser Session (siehe SalatiWatchApp.swift Kopfkommentar).
//
// Bundle-ID bewusst als ".watch" (= de.salatibox.de.watch): moderne watchOS-
// Companion-Apps (watchOS 6+, "single target"-Stil, kein WatchKit-1-Extension-
// Modell mehr) brauchen KEIN explizites WKCompanionAppBundleIdentifier-Info.plist-
// Feld - Xcode erkennt die Companion-Beziehung automatisch daran, dass die
// Bundle-ID der Uhr-App die Bundle-ID der iPhone-App als Praefix hat
// (getTargetInfoPlistForType("watch") liefert bewusst {} zurueck, siehe
// node_modules/@bacons/apple-targets/build/target.js).
//
// UNGETESTET: wie targets/salati-widget/ nie mit `npx expo prebuild -p ios`
// generiert/in Xcode geoeffnet (kein macOS in dieser Session, siehe
// USER-TODO.md).
//
// deploymentTarget explizit (nicht der Plugin-Default) fuer Klarheit direkt
// im Config-File, analog zu targets/salati-widget/expo-target.config.js.
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'SalatiWatch',
  bundleIdentifier: '.watch',
  deploymentTarget: '11.0',
  // App-Store-Ablehnung 2026-07-19 (Build 15, ITMS-90391/90713): watchOS-
  // Companion-Apps sind ein eigenes Bundle und brauchen ein eigenes
  // AppIcon.appiconset (anders als das WidgetKit-Target daneben, das das
  // Icon der iPhone-App mitbenutzt) - ohne "icon" hier generiert
  // @bacons/apple-targets keins. Selbes Icon wie die iPhone-App
  // (assets/images/icon.png, 1024x1024) wiederverwendet statt eines
  // eigenen Uhr-spezifischen Designs.
  icon: './icon.png',
};
