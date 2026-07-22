package de.salatibox.de;

import com.facebook.react.ReactActivityDelegate;
import com.reactnativeandroidwidget.RNWidgetConfigurationActivity;

import expo.modules.ReactActivityDelegateWrapper;

// PER-WIDGET Konfigurations-Activity. Android startet sie beim Platzieren bzw.
// beim Bearbeiten (langes Drücken → "Konfigurieren") eines Widgets, dessen
// Provider android:configure auf diese Activity zeigt (widgetprovider_*.xml).
// Die Basisklasse aus react-native-android-widget hostet den JS-Screen, der in
// index.android.js via registerWidgetConfigurationScreen registriert wird.
// Manuell gepflegt (kein expo prebuild) — analog zu den Widget-Providern unter
// de/salatibox/de/widget/.
//
// WICHTIG (Absturz-Fix): Wie MainActivity MUSS auch diese ReactActivity ihren
// ReactActivityDelegate in Expos ReactActivityDelegateWrapper hüllen. Die
// Basisklasse der Library liefert einen nackten DefaultReactActivityDelegate
// (korrekt für bare React Native, aber unvollständig für Expo). Ohne den
// Wrapper werden Expo-Module/-Lifecycle für diese Activity nicht initialisiert
// → die Konfigurations-Activity crasht beim Öffnen (New Architecture /
// bridgeless). Der Wrapper leitet getLaunchOptions() an das innere Delegate
// weiter, sodass die widgetInfo-Initial-Props (widgetId/widgetName) für den
// Config-Screen erhalten bleiben.
public class WidgetConfigurationActivity extends RNWidgetConfigurationActivity {
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new ReactActivityDelegateWrapper(
        this,
        BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
        super.createReactActivityDelegate());
  }
}
