// Minimale watchOS-Begleit-App - reine Huelle, deren einziger Zweck ist,
// targets/salati-watch-complication/ (die eigentliche Komplikation) als
// watchOS-Ziel im Xcode-Projekt zu verankern (siehe Kopfkommentar in
// expo-target.config.js in diesem Ordner). Die App selbst zeigt nur einen
// simplen Read-only-Blick auf dieselbe App-Group-Daten wie die Komplikation -
// keine Interaktion, kein WatchConnectivity, keine eigene Berechnung von
// Benachrichtigungen o.ae. (das bleibt Aufgabe der iPhone-App).
//
// UNGETESTET: nie kompiliert (kein macOS in dieser Session, siehe
// USER-TODO.md) - vor dem ersten echten Einsatz in Xcode oeffnen und am
// Simulator/Geraet pruefen, insbesondere ob SwiftUI's `App`/`WindowGroup`-
// Protokoll auf dieser watchOS-Deployment-Target-Version (siehe
// expo-target.config.js) ohne weitere Anpassungen startet.

import SwiftUI

private let appGroup = "group.de.salatibox.de"
private let storageKey = "salati.widget.prayerTimes"

// Spiegelt Timings/WidgetPayload aus targets/salati-widget/SalatiPrayerWidget.swift
// (iOS-Widget) - dieselbe Duplizierung aus demselben Grund: jedes Xcode-Target
// kompiliert unabhaengig, es gibt keinen geteilten Swift-Compile-Membership
// zwischen App/Widget/Watch-Targets in diesem Setup.
private struct Timings: Codable {
    let Fajr: String
    let Sunrise: String
    let Dhuhr: String
    let Asr: String
    let Maghrib: String
    let Isha: String
}

private struct WidgetPayload: Codable {
    let locationLabel: String
    let today: Timings
    let tomorrow: Timings
    let timeFormat: String
}

private func loadPayload() -> WidgetPayload? {
    guard let defaults = UserDefaults(suiteName: appGroup),
          let json = defaults.string(forKey: storageKey),
          let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

struct ContentView: View {
    var body: some View {
        let payload = loadPayload()
        VStack(spacing: 4) {
            Text(payload?.locationLabel ?? "Salati")
                .font(.caption2)
                .foregroundColor(.secondary)
            if payload != nil {
                Text("Komplikation zum Zifferblatt hinzufügen für das nächste Gebet.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
            } else {
                Text("App auf dem iPhone öffnen, um Gebetszeiten zu laden.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
    }
}

@main
struct SalatiWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
