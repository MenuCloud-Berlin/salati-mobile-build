import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Salati',
  slug: 'salatibox',
  owner: 'menucloudberlin',
  version: '1.29.0',
  // Play-Console-Empfehlung (Android 16, große Displays/Foldables): Orientierungs-
  // Sperren werden auf großen Displays ohnehin ignoriert. Die App-UI ist
  // durchgängig responsiv (ScrollView + MaxContentWidth-Deckelung + Flexbox-
  // Grids, Mushaf-Doppelseite ≥900px), daher Rotation/Resize freigegeben statt
  // gesperrt. WidgetConfigurationActivity bleibt separat Portrait (RN-Recreate-
  // Crash-Schutz, s. AndroidManifest.xml). Da dieses Projekt OHNE `expo prebuild`
  // baut, ist die effektive Quelle die manuell gepflegte AndroidManifest.xml —
  // dieser Wert hält nur beide Seiten konsistent, falls je neu generiert wird.
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'salatibox',
  userInterfaceStyle: 'automatic',
  description:
    'Gebetszeiten, Qibla, Koran mit wählbaren Rezitatoren und Übersetzungen, Hijri-Kalender und Duas — werbefrei.',
  ios: {
    icon: './assets/expo.icon',
    // ASC-App "Salati Islam" (6791867298) wurde vom User unter dieser ID
    // angelegt (2026-07-17) — beide Plattformen nutzen de.salatibox.de.
    bundleIdentifier: 'de.salatibox.de',
    // Apple Developer Team (siehe eas.json submit.production.ios) — von
    // @bacons/apple-targets für die Widget-Extension-Signierung benötigt
    // (targets/salati-widget/), sonst nur eine Warnung beim Prebuild, kein Fehler.
    appleTeamId: 'ZKG548NGDR',
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ['audio'],
      // Erlaubt der App, Live Activities zu starten (ActivityKit) — nötig für
      // die "nächstes Gebet"-Anzeige auf Sperrbildschirm/Dynamic Island
      // (modules/salati-live-activity + targets/salati-widget/PrayerLiveActivity.swift).
      NSSupportsLiveActivities: true,
      NSLocationWhenInUseUsageDescription:
        'Salati nutzt deinen Standort, um Gebetszeiten und die Qibla-Richtung für deinen Ort zu berechnen.',
      // Nur Standard-HTTPS/TLS zu öffentlichen APIs, keine eigene/zusätzliche
      // Verschlüsselung — Export-Compliance-Erklärung, spart den manuellen
      // Schritt in App Store Connect vor jedem Build.
      ITSAppUsesNonExemptEncryption: false,
    },
    // App-Group MUSS identisch mit targets/salati-widget/expo-target.config.js
    // sein — die App schreibt hier hinein (src/features/prayer-times/
    // ios-widget.ts), die Widget-Extension liest von dort.
    entitlements: {
      'com.apple.security.application-groups': ['group.de.salatibox.de'],
    },
  },
  android: {
    // Play-App wurde vom User an de.salatibox.de gebunden (Fehlermeldung der
    // Console 2026-07-17) — Android folgt; identisch mit der iOS-Bundle-ID.
    package: 'de.salatibox.de',
    // Exakte Alarme: ohne SCHEDULE_EXACT_ALARM stellt Android Gebets-
    // Benachrichtigungen "batterieschonend" Minuten zu spät zu (User-
    // Gerätebug 2026-07-16). USE_EXACT_ALARM bewusst NICHT: laut Play-
    // Richtlinie nur für Wecker/Kalender-Apps — Fehldeklaration riskiert
    // Ablehnung. Bis Android 13 ist SCHEDULE_EXACT_ALARM auto-granted;
    // ab 14 braucht es den Nutzer-Toggle (In-App-Hinweis folgt).
    permissions: ['android.permission.SCHEDULE_EXACT_ALARM'],
    // Play-Richtlinie Gesundheits-Apps: ACTIVITY_RECOGNITION kam transitiv
    // aus dem (ungenutzten, entfernten) expo-sensors — sicherheitshalber
    // zusätzlich hart geblockt.
    blockedPermissions: ['android.permission.ACTIVITY_RECOGNITION', 'com.google.android.gms.permission.ACTIVITY_RECOGNITION'],
    adaptiveIcon: {
      backgroundColor: '#0b0b0d',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-build-properties',
      {
        // Play-Console-Empfehlung 2026-07-19: App war unoptimiert (kein R8).
        // Aktiviert Minifizierung + Resource-Shrinking für Release-Builds
        // (persistiert über expo prebuild --clean hinweg, im Gegensatz zu
        // android/gradle.properties, das dabei gelöscht wird).
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#f7f3ea',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    [
      'expo-audio',
      {
        enableBackgroundPlayback: true,
        // Native On-Device-Rezitations-Check (whisper.rn, src/features/hifz/
        // whisperCheck.ts + speech.ts) nimmt jetzt echt über das Mikrofon auf
        // (@fugood/react-native-audio-pcm-stream) — RECORD_AUDIO wird
        // gebraucht, daher hier (wieder) true statt des früheren false, als
        // der native Rezitations-Check noch ein reiner Stub war.
        recordAudioAndroid: true,
        microphonePermission:
          'Salati nutzt das Mikrofon, um deine Koran-Rezitation im Hifz-Übungsmodus zu prüfen.',
      },
    ],
    [
      'expo-video',
      {
        // Hintergrund-Ton ist optional pro Nutzer (Player-Einstellung
        // „Im Hintergrund weiter" -> player.staysActiveInBackground). Der
        // Plugin-Schalter muss dafuer aktiv sein und schaltet die noetigen
        // nativen Capabilities frei (iOS UIBackgroundModes: audio ist gesetzt);
        // greift erst nach einem nativen Rebuild.
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    'expo-localization',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Salati nutzt deinen Standort, um Gebetszeiten und die Qibla-Richtung für deinen Ort zu berechnen.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-notifications',
      {
        // Muss ein reines Monochrom-Icon sein (weiße Silhouette, transparenter
        // Hintergrund) - Android rendert das Status-Bar-Icon ab API 21 nur aus
        // dem Alpha-Kanal. Das volle Farb-App-Icon (icon.png) hätte hier zu
        // einem weißen Klecks statt eines erkennbaren Symbols geführt.
        // android-icon-monochrome.png wird bereits für adaptiveIcon.monochromeImage
        // genutzt und ist bereits alpha-only/weiß - gleiche Datei hier wiederverwenden.
        icon: './assets/images/android-icon-monochrome.png',
        color: '#d4af37',
      },
    ],
    [
      'react-native-android-widget',
      {
        // Labels/Beschreibungen erscheinen im Android-Widget-Picker (statisch,
        // daher zweisprachig kurz); die Widget-INHALTE folgen der App-Sprache.
        //
        // resizeMode + maxResizeWidth/Height: alle Widgets sind auf dem
        // Homescreen frei skalierbar (horizontal+vertikal). minWidth/minHeight
        // bleiben die Untergrenze, targetCell* die Standardgröße beim Ablegen.
        //
        // FARBE: Das Farbthema steuert jetzt AUSSCHLIESSLICH die App-
        // Einstellung (AppSettings.widgetTheme, 7 Themen — s. src/widgets/
        // widgetTheme.ts). Die "Light"-Provider unten bleiben nur aus
        // Kompatibilität für bereits platzierte Widgets bestehen; neue Widget-
        // Typen (Countdown/Qibla) bekommen daher KEINE Light-Variante mehr.
        widgets: [
          {
            name: 'SalatiPrayer',
            label: 'Gebetszeiten · Prayer Times',
            description: 'Nächstes Gebet + alle Zeiten des Tages',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            maxResizeWidth: '400dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
          {
            name: 'SalatiWisdom',
            label: 'Dua des Tages · Daily Dua',
            description: 'Jeden Tag eine geprüfte Dua mit Übersetzung',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            maxResizeWidth: '400dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 21600000,
          },
          {
            name: 'SalatiStreak',
            label: 'Lernserie · Streak',
            description: 'Deine tägliche Lernserie auf einen Blick',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            maxResizeWidth: '250dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
          {
            name: 'SalatiCountdown',
            label: 'Countdown · Next Prayer',
            description: 'Nächstes Gebet groß + Restzeit',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            maxResizeWidth: '300dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
          {
            name: 'SalatiQibla',
            label: 'Qibla-Richtung · Qibla',
            description: 'Richtung und Entfernung zur Kaaba',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            maxResizeWidth: '250dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 21600000,
          },
          // Helle Farbthema-Varianten der drei URSPRÜNGLICHEN Widgets —
          // nur noch aus Kompatibilität registriert (das Farbthema kommt jetzt
          // aus AppSettings.widgetTheme, s. Kopfkommentar oben). Der Handler in
          // widget-task-handler.tsx leitet am Namenssuffix "Light" nur noch den
          // Widget-TYP ab; die Farbe überschreibt die App-Einstellung.
          {
            name: 'SalatiPrayerLight',
            label: 'Gebetszeiten Hell · Prayer Times Light',
            description: 'Nächstes Gebet + alle Zeiten des Tages (helles Theme)',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            maxResizeWidth: '400dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
          {
            name: 'SalatiWisdomLight',
            label: 'Dua des Tages Hell · Daily Dua Light',
            description: 'Jeden Tag eine geprüfte Dua mit Übersetzung (helles Theme)',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            maxResizeWidth: '400dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 21600000,
          },
          {
            name: 'SalatiStreakLight',
            label: 'Lernserie Hell · Streak Light',
            description: 'Deine tägliche Lernserie auf einen Blick (helles Theme)',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            maxResizeWidth: '250dp',
            maxResizeHeight: '250dp',
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Salati nutzt die Kamera, um Produkt-Barcodes für den Halal-Scanner zu erkennen.',
        // recordAudioAndroid:false spart die (hier ungenutzte) Mikrofon-Berechtigung
        // auf Android; iOS verlangt laut Plugin-Quelle trotzdem immer den
        // NSMicrophoneUsageDescription-Eintrag, unabhängig von dieser Option.
        recordAudioAndroid: false,
      },
    ],
    // Scannt targets/*/expo-target.config.js (Default: root:"./targets",
    // match:"*", siehe node_modules/@bacons/apple-targets/build/config-plugin.js)
    // und generiert daraus native Xcode-Extension-Targets — JEDER neue
    // Unterordner mit expo-target.config.js wird automatisch mit erfasst,
    // OHNE dass dieses Plugin-Array hier angepasst werden muss. Aktuell:
    //   - targets/salati-widget            iOS-Homescreen-Widget ("Nächstes Gebet")
    //   - targets/salati-watch              watchOS-Begleit-App (nur Huelle,
    //                                        siehe Kopfkommentar dort — noetig
    //                                        als Einbett-Ziel fuer die Komplikation)
    //   - targets/salati-watch-complication  Watch-Komplikation ("Nächstes Gebet")
    // Läuft nur bei `expo prebuild -p ios` (macOS/Linux) — auf diesem
    // Windows-Rechner ist der Plugin-Code-Pfad für keines dieser Targets
    // jemals tatsächlich ausgeführt/getestet worden (siehe USER-TODO.md).
    '@bacons/apple-targets',
    [
      'llama.rn',
      {
        // Native On-Device-KI (src/features/ki, app/ki-native.tsx) — GGUF-Modell
        // wird NICHT gebündelt, sondern optional zur Laufzeit heruntergeladen
        // (src/features/ki/model.ts). enableEntitlements setzt auf iOS die
        // Extended-Virtual-Addressing/Increased-Memory-Limit-Capabilities für
        // den production-Build (nötig für ein 1B-Modell im Speicher).
        enableEntitlements: true,
        entitlementsProfile: 'production',
      },
    ],
    // iOS-Gegenstück zum Android-Icon-Umschalten (features/settings/app-icon.ts).
    // Eigener, iOS-only Plugin statt expo-dynamic-app-icon direkt einzutragen —
    // siehe Kopfkommentar in plugins/withIosAlternateIcons.js, warum dessen
    // Android-Mods hier bewusst NICHT laufen sollen.
    [
      './plugins/withIosAlternateIcons',
      {
        emerald: { image: './assets/images/icon-emerald-1024.png' },
        light: { image: './assets/images/icon-light-1024.png' },
      },
    ],
    // iOS Live Activity ("nächstes Gebet" auf Sperrbildschirm/Dynamic Island):
    // Es gibt hier BEWUSST kein Plugin. Die Live Activity ist über zwei
    // konfliktfreie Bausteine gelöst, die BEIDE ohne Plugin-Eintrag
    // autolinken/gescannt werden:
    //   1. modules/salati-live-activity/  — lokales Expo-Module (App-seitiger
    //      ActivityKit-Start/Update/End), wird von expo-autolinking im
    //      modules/-Verzeichnis automatisch erfasst.
    //   2. targets/salati-widget/PrayerLiveActivity.swift — die Darstellung,
    //      Teil der bestehenden @bacons/apple-targets Widget-Extension (oben).
    // Frühere Umsetzung via 'expo-widgets' wurde entfernt: dessen eigenes
    // Xcode-Target (ExpoWidgetsTarget) kollidierte mit @bacons/apple-targets im
    // prebuild (verifiziert an EAS-Build 28, Memory
    // project_salati_expo_widgets_bacons_conflict). NSSupportsLiveActivities
    // steht in ios.infoPlist oben.
    // UNVERIFIZIERT: kein Mac/iPhone auf diesem Rechner — Swift kompiliert/läuft
    // erst am EAS-Build + TestFlight (iPhone). tsc/lint/jest + prebuild-Mod-
    // Phase sind grün.
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: 'cdb9802c-d7b7-46a0-b54b-ef6068896e4b',
    },
    router: {
      // Nur Web: Metro splittet jede Route in ein eigenes Chunk statt alles
      // ins Root-Bundle zu packen (native bundelt ohnehin alles in eine
      // JS-Datei, RN kennt kein Chunk-Splitting — { web: true } betrifft nur
      // den 'web'-Platform-Key, siehe @expo/cli metroOptions.js
      // getAsyncRoutesFromExpoConfig, das exp.extra.router.asyncRoutes[platform]
      // liest). Wirkt erst jetzt sinnvoll, seit features/study/courses.ts
      // Lektionsinhalte nur noch async per Kurs lädt statt alle 12 Kurs-JSONs
      // synchron ins Root-Bundle zu ziehen (vorheriger Versuch brachte nur
      // -12%, ein 14,7MB `__common`-Chunk blieb im Root-HTML hängen).
      //
      // Geprüft (Perf-Runde 2026-07-20): android/ios NICHT ergänzen. Offizielle
      // Doku (docs.expo.dev/router/web/async-routes) sagt explizit "Async
      // routes do not support native production apps yet" — im Production-
      // Build werden alle Suspense-Boundaries deaktiviert (keine Ladezustände),
      // d.h. der Screen würde beim Navigieren einfach leer bleiben statt lazy
      // zu laden. expo-router nutzt intern ohnehin `value.loadRoute()` pro
      // Stack.Screen-Eintrag SYNCHRON (kein React.lazy) sobald asyncRoutes für
      // die Plattform aus ist (build/useScreens.js, import_mode 'sync') — d.h.
      // auf Android/iOS werden alle ~25 Stack.Screen-Module ohnehin schon beim
      // Mounten von <Stack> in _layout.tsx eagerly ge-required, unabhängig von
      // dieser Einstellung. Ein natives Screen-Lazy-Loading ist mit Expo Router
      // 57 (noch) nicht sauber möglich — deshalb hier bewusst NICHT gebaut,
      // um keinen halbfertigen/kaputten Zustand zu riskieren.
      asyncRoutes: { web: true },
    },
  },
};

export default config;
