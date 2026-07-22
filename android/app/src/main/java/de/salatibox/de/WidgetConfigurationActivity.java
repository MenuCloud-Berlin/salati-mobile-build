package de.salatibox.de;

import com.reactnativeandroidwidget.RNWidgetConfigurationActivity;

// PER-WIDGET Konfigurations-Activity. Android startet sie beim Platzieren bzw.
// beim Bearbeiten (langes Drücken → "Konfigurieren") eines Widgets, dessen
// Provider android:configure auf diese Activity zeigt (widgetprovider_*.xml).
// Die Basisklasse aus react-native-android-widget hostet den JS-Screen, der in
// index.android.js via registerWidgetConfigurationScreen registriert wird.
// Manuell gepflegt (kein expo prebuild) — analog zu den Widget-Providern unter
// de/salatibox/de/widget/.
public class WidgetConfigurationActivity extends RNWidgetConfigurationActivity {
}
