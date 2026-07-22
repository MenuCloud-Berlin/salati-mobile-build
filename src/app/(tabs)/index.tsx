// Natives Home: Gebetszeiten (auf Web ersetzt index.web.tsx dies durch die
// Landingpage; der Screen selbst bleibt dort unter /prayer erreichbar).
//
// Erststart-Weiche (Audit C2): beim allerersten Mount das Onboarding-Flag
// prüfen und einmalig zum skippbaren Einrichtungs-Flow umleiten. Bewusst
// HIER statt im Root-Layout (kein Eingriff in die Stack-Initialisierung)
// und nur in useEffect (SSR-/Hydration-sicher, kein Top-Level-Storage-Zugriff).
// Auf Web greift die Weiche nie: isOnboardingDone() liefert dort immer true
// UND diese Datei wird auf Web ohnehin durch index.web.tsx ersetzt.
import { router } from 'expo-router';
import { useEffect } from 'react';

import PrayerTimesScreen from '@/components/prayer-times-screen';
import { isOnboardingDone } from '@/features/onboarding/flag';

export default function HomeTab() {
  useEffect(() => {
    let cancelled = false;
    isOnboardingDone().then((done) => {
      if (!cancelled && !done) router.replace('/onboarding');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <PrayerTimesScreen />;
}
