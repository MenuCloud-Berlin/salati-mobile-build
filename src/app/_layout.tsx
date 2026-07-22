import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalBackButton } from '@/components/global-back-button';
import { MiniPlayer } from '@/components/mini-player';
import { SettingsProvider } from '@/features/settings/store';
import { SharedPlayerProvider } from '@/features/quran/usePlayer';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { installGlobalErrorHandler } from '@/lib/errorLog';
import { QUERY_PERSIST_MAX_AGE, queryClient, queryPersister } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();
installGlobalErrorHandler();

// Nur nativ: schon der IMPORT von expo-notifications wirft auf Web eine
// Konsolen-Warnung (Push-Token-Listener) — deshalb require im Guard statt
// Top-Level-Import; lokale Notifications plant die App auf Web ohnehin nicht.
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  // KFGQPC HAFS Uthmanic Script (arabischer Koran-Text, s. constants/theme.ts
  // ArabicFont + assets/fonts/CREDITS.md) — Standard-Expo-Muster: Rendering
  // erst nach Font-Load (oder -Fehler), sonst zeigt der Koran-Text kurz mit
  // Fallback-Font auf. Die native Splash bleibt bis dahin sichtbar
  // (preventAutoHideAsync oben), AnimatedSplashOverlay übernimmt danach wie
  // gehabt das Ausblenden.
  const [fontsLoaded, fontError] = useFonts({
    KFGQPCHafs: require('@/assets/fonts/kfgqpc-hafs.ttf'),
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, maxAge: QUERY_PERSIST_MAX_AGE }}>
        <SettingsProvider>
          <SharedPlayerProvider>
            <ThemedApp />
          </SharedPlayerProvider>
        </SettingsProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

/**
 * Zentraler Tap-Handler für lokale Notifications mit einem `deepLink`-Feld im
 * `data`-Payload (z. B. features/verseOfDay/notifications.ts) — springt über
 * die native `Linking`-API zur passenden Stelle in der App. Expo Router
 * verdrahtet deren `scheme` (s. app.config.ts, 'salatibox') automatisch mit
 * dem file-based Routing, ein `Linking.openURL('salatibox://…')` navigiert
 * dadurch genau wie ein von außen geöffneter Deep-Link (s. deepLinks.ts).
 * EIN einziger Listener hier statt eines eigenen pro Notification-Feature —
 * künftige Notification-Typen müssen nur denselben `data.deepLink`-Payload
 * mitgeben, kein zweiter Listener nötig.
 */
function useNotificationDeepLinkHandler() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    function openDeepLink(data: unknown) {
      const deepLink = (data as { deepLink?: unknown } | null | undefined)?.deepLink;
      if (typeof deepLink === 'string' && deepLink.length > 0) {
        Linking.openURL(deepLink).catch(() => {});
      }
    }

    // App lief bereits (Vordergrund/Hintergrund) und wurde per Tap geöffnet/fokussiert.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openDeepLink(response.notification.request.content.data);
    });
    // Kalter Start: App war komplett beendet, Tap auf die Notification hat sie erst gestartet —
    // dieser Fall löst KEIN addNotificationResponseReceivedListener-Event aus.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      openDeepLink(response?.notification.request.content.data);
    });

    return () => sub.remove();
  }, []);
}

// useResolvedScheme() braucht die Settings (themeOverride) — muss deshalb
// innerhalb von SettingsProvider gerendert werden, nicht in RootLayout selbst.
function ThemedApp() {
  const colorScheme = useResolvedScheme();
  useNotificationDeepLinkHandler();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="storage" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications-overview" options={{ presentation: 'modal' }} />
        <Stack.Screen name="dashboard-reorder" options={{ presentation: 'modal' }} />
        <Stack.Screen name="duas" />
        <Stack.Screen name="hadith" />
        <Stack.Screen name="search" />
        <Stack.Screen name="learn" />
        <Stack.Screen name="quiz" />
        <Stack.Screen name="hifz" />
        <Stack.Screen name="tasbih" />
        <Stack.Screen name="dhikr-after-salah" />
        <Stack.Screen name="guides" />
        <Stack.Screen name="pray-along" />
        <Stack.Screen name="learn-to-pray" />
        <Stack.Screen name="wisdom" />
        <Stack.Screen name="tracker" />
        <Stack.Screen name="fasting" />
        <Stack.Screen name="khatmah" />
        <Stack.Screen name="zakat" />
        <Stack.Screen name="zakat-fitr" />
        <Stack.Screen name="mirath" />
        <Stack.Screen name="hijri-converter" />
        <Stack.Screen name="names" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="prayer-times-week" />
        <Stack.Screen name="radio" />
        <Stack.Screen name="podcast" />
        <Stack.Screen name="halal" />
        <Stack.Screen name="halal-scanner" />
        <Stack.Screen name="mosques" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="getting-started" />
        <Stack.Screen name="themes" />
        <Stack.Screen name="ki-native" />
        <Stack.Screen name="sync" options={{ presentation: 'modal' }} />
        <Stack.Screen name="impressum" options={{ presentation: 'modal' }} />
        <Stack.Screen name="datenschutz" options={{ presentation: 'modal' }} />
        <Stack.Screen name="agb" options={{ presentation: 'modal' }} />
        <Stack.Screen name="changelog" options={{ presentation: 'modal' }} />
      </Stack>
      <GlobalBackButton />
      <MiniPlayer />
    </ThemeProvider>
  );
}
