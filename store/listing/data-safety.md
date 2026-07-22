# Data Safety & Privacy — Ausfüllhilfe (Salati, de.salatibox.app)

Stand: 2026-07-14. Grundlage: tatsächliche Datenflüsse im Code (apps/mobile), Abgleich mit
https://www.salati.pro/datenschutz. Anbieter: MenuCloud Berlin, Kontakt info@menucloud-berlin.de.

## Faktische Datenlage (Code-verifiziert)

- Kein eigenes Backend, kein Account, keine Registrierung, kein Login.
- Keine Werbe-, Analytics-, Crash- oder Tracking-SDKs in den Dependencies (kein Firebase, kein AdMob, kein Sentry o. ä.).
- Alle Nutzerdaten (Lesezeichen, Lernfortschritt, Gebets-Tracker, Einstellungen, heruntergeladenes Audio) liegen ausschließlich lokal auf dem Gerät (AsyncStorage / Dateisystem).
- Benachrichtigungen sind rein lokal geplant (`scheduleNotificationAsync`); es werden keine Push-Tokens erzeugt oder an Server gesendet.
- Standort: nur "Bei Nutzung der App" (Foreground). Background-Location ist in `app.config.ts` explizit deaktiviert (`isIosBackgroundLocationEnabled: false`, `isAndroidBackgroundLocationEnabled: false`).
- Netzwerkzugriffe gehen ausschließlich an Dritt-Inhalte-APIs, ohne Nutzerkennung:
  - `api.aladhan.com` — Gebetszeiten/Hijri-Kalender (erhält Koordinaten bzw. Stadtname als Query-Parameter)
  - `overpass-api.de`, `nominatim.openstreetmap.org` — Moschee-/Halal-Suche (erhält Koordinaten bzw. Suchtext)
  - `api.alquran.cloud`, `cdn.islamic.network`, `cdn.jsdelivr.net` — Koran-Text, Rezitations-Audio, Hadithe (keine Standort-/Personendaten)
- Die übermittelten Koordinaten werden nur zur unmittelbaren Beantwortung der Anfrage verarbeitet, nicht gespeichert und keinem Nutzer zugeordnet (es existiert keine Nutzer-ID). Das erfüllt sowohl bei Google als auch bei Apple die Ausnahme für "ephemere Verarbeitung" — die App gilt damit als "erhebt keine Daten".

---

## Google Play — Data-Safety-Formular (Play Console → App-Inhalte → Datensicherheit)

| Formularfrage | Antwort | Begründung |
|---|---|---|
| Erhebt oder teilt Ihre App eine der erforderlichen Nutzerdatentypen? | **Nein** | Standort wird zwar an AlAdhan/Overpass/Nominatim übertragen, aber nur ephemer verarbeitet (nur im Arbeitsspeicher zur Beantwortung der konkreten Anfrage, keine Speicherung, keine Nutzer-Zuordnung). Laut Play-Definition zählt ephemere Verarbeitung nicht als "Erhebung". Alle übrigen Daten bleiben auf dem Gerät (On-Device-Daten sind nicht deklarationspflichtig). |
| Werden alle Nutzerdaten bei der Übertragung verschlüsselt? | **Ja** | Alle Endpunkte sind ausschließlich HTTPS. (Frage erscheint ggf. nicht, wenn oben "Nein" gewählt ist.) |
| Bieten Sie eine Möglichkeit, die Löschung von Daten zu beantragen? | **Nicht zutreffend** | Es werden keine Daten erhoben; lokale Daten löscht der Nutzer durch Deinstallation bzw. in der App. |
| Unabhängige Sicherheitsüberprüfung (MASA)? | Nein | Nicht durchgeführt (optional). |
| Datenschutzerklärung (Store-Eintrag → URL) | `https://www.salati.pro/datenschutz` | Pflichtfeld unabhängig von "keine Erhebung". |

Ergebnis im Store-Eintrag: Badge "Keine Daten erhoben, keine Daten an Dritte weitergegeben".

Hinweis zur Konsistenz: Nicht "App greift nicht auf den Standort zu" behaupten — die App nutzt die
Standort-Berechtigung (Foreground), erhebt aber im Sinne des Formulars keine Daten. Berechtigungen
und Data Safety sind getrennte Angaben; das ist zulässig und korrekt, solange die
Datenschutzerklärung die ephemere Übermittlung an AlAdhan/OpenStreetMap erwähnt (tut sie).

## Google Play — Weitere App-Inhalte-Angaben (zur Sicherheit mitdokumentiert)

- Werbung: **Enthält keine Werbung** (kein Ad-SDK).
- Zielgruppe: Nicht primär an Kinder gerichtet (allgemeines Publikum).
- Anmeldedaten für App-Zugriff (Review): "Alle Funktionen ohne Anmeldung zugänglich" — es gibt kein Konto.

---

## Apple — App Privacy ("Privacy Nutrition Label", App Store Connect → App-Datenschutz)

| Formularfrage | Antwort | Begründung |
|---|---|---|
| "Do you or your third-party partners collect data from this app?" | **Nein → Ergebnis: "Data Not Collected"** | Apples Definition von "Collect": Daten werden vom Gerät übertragen UND länger gespeichert, als für die Beantwortung der Anfrage nötig. Die Standort-Query an AlAdhan/Overpass dient nur der unmittelbaren Anfrage und wird nicht gespeichert/verknüpft → fällt unter Apples Ausnahme (optional disclosure), zumal keine Nutzer-/Geräte-ID mitgesendet wird. Es gibt keine Third-Party-SDKs, die Daten erheben. |
| Datentypen (Location, Identifiers, Usage Data, …) | Keine auswählen | Folgt aus "Nein" oben. |
| Tracking (ATT / "Used to track you") | **Nein** | Kein Tracking über Apps/Websites hinweg, keine IDFA-Nutzung, kein ATT-Prompt nötig. |
| Privacy Policy URL | `https://www.salati.pro/datenschutz` | Pflichtfeld. |

### Privacy Manifest / Berechtigungs-Strings (technische Konsistenz)

- `NSLocationWhenInUseUsageDescription`: Zweck = Gebetszeiten, Qibla-Richtung, Moschee-/Halal-Suche in der Nähe. Kein "Always"-Zugriff beantragen (Background-Location ist deaktiviert).
- Benachrichtigungs-Berechtigung: lokale Gebets-Erinnerungen (Suhoor/Iftar, Gebetszeiten) — keine Remote-Pushes.
- `UIBackgroundModes: audio`: nur für die Wiedergabe von Rezitationen im Hintergrund — keine Datenverarbeitung.
- Required-Reason-APIs (UserDefaults/File-Timestamp via AsyncStorage/expo-file-system): werden von Expo-SDK-Privacy-Manifesten abgedeckt; beim Build prüfen, dass `PrivacyInfo.xcprivacy` der Expo-Module enthalten ist (Standard bei EAS Build).

---

## Grenzfall, den man kennen sollte (falls Review nachfragt)

Die Dritt-APIs (AlAdhan, OpenStreetMap/Overpass/Nominatim, alquran.cloud, islamic.network, jsDelivr)
sehen technisch bedingt die IP-Adresse des Geräts — wie bei jedem Internetzugriff. Weder Google noch
Apple verlangen dafür eine Deklaration als Datenerhebung, solange die App selbst bzw. ihre SDKs
nichts erheben. Die Datenschutzerklärung benennt diese Empfänger; das reicht als Absicherung.
