// "Erste Schritte"-Übersicht für Konvertiten/Neu-Muslime: reine Navigation/
// Kuration zu bereits VORHANDENEN Inhalten der App (kein neuer religiöser
// Fachinhalt — dafür ist die App nicht die richtige Quelle, siehe
// USER-TODO "religiös gegenprüfen"). Reihenfolge pädagogisch sinnvoll für
// jemanden, der gerade die Schahada gesprochen hat oder kurz davor steht:
// 1) Bedeutung des Glaubensbekenntnisses (Aqida-Grundlagenkurs deckt das ab),
// 2) Wudu-Anleitung (Guides), 3) erstes Gebet (how-to-pray-Guide),
// 4) Gebetszeiten einrichten (Onboarding-Flow, wiederverwendbar), 5) ein paar
// grundlegende Duas, 6) Koran-Lesen-Kurs beginnt selbst mit dem Alphabet.
// Verlinkt von onboarding.tsx (Willkommens-Schritt) und (tabs)/more.tsx.
import { router, type Href } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { resolveText } from '@/features/guides/hooks';
import { PRAY_ALONG_ENTRY } from '@/features/pray-along/prayers';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

interface Step {
  id: string;
  icon: IconName;
  href: Href;
}

// Hrefs zeigen 1:1 auf bereits bestehende Screens - diese Seite fügt keinen
// neuen Inhalt hinzu, nur eine kuratierte Reihenfolge + Erklärung.
const STEPS: Step[] = [
  { id: 'shahada', icon: 'ribbon-outline', href: '/study/aqida' },
  { id: 'wudu', icon: 'water', href: { pathname: '/guides/[guide]', params: { guide: 'wudu' } } },
  { id: 'howToPray', icon: 'body', href: { pathname: '/guides/[guide]', params: { guide: 'how-to-pray' } } },
  { id: 'prayerTimes', icon: 'time-outline', href: '/onboarding' },
  { id: 'duas', icon: 'hand-left', href: '/duas' },
  { id: 'alphabet', icon: 'language', href: '/learn' },
];

export default function GettingStartedScreen() {
  const { t, locale } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('gettingStarted.title')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {t('gettingStarted.subtitle')}
        </ThemedText>

        <FlatList
          data={STEPS}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.headerCtas}>
              {/* Ruhiger Lern-Modus (Schritt für Schritt, arab. + Umschrift) */}
              <PressableCard
                onPress={() => router.push('/learn-to-pray')}
                type="backgroundSelected"
                style={styles.prayAlongCta}>
                <ThemedView type="backgroundElement" style={styles.numberBadge}>
                  <IconSymbol name="school-outline" size={18} color={colors.accent} />
                </ThemedView>
                <View style={styles.rowText}>
                  <ThemedText type="default" themeColor="accent">
                    {t('learnToPray.title')}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('learnToPray.subtitle')}
                  </ThemedText>
                </View>
                <DisclosureChevron size={18} color={colors.textSecondary} />
              </PressableCard>
              {/* Mitbet-Modus (während des Gebets) */}
              <PressableCard
                onPress={() => router.push('/pray-along')}
                type="backgroundSelected"
                style={styles.prayAlongCta}>
                <ThemedView type="backgroundElement" style={styles.numberBadge}>
                  <IconSymbol name="play" size={18} color={colors.accent} />
                </ThemedView>
                <View style={styles.rowText}>
                  <ThemedText type="default" themeColor="accent">
                    {resolveText(PRAY_ALONG_ENTRY.title, locale)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {resolveText(PRAY_ALONG_ENTRY.subtitle, locale)}
                  </ThemedText>
                </View>
                <DisclosureChevron size={18} color={colors.textSecondary} />
              </PressableCard>
            </View>
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <PressableCard onPress={() => router.push(item.href)} style={styles.row}>
                <ThemedView type="backgroundSelected" style={styles.numberBadge}>
                  <IconSymbol name={item.icon} size={18} color={colors.accent} />
                </ThemedView>
                <View style={styles.rowText}>
                  <ThemedText type="default">{t(`gettingStarted.steps.${item.id}.title`)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t(`gettingStarted.steps.${item.id}.desc`)}
                  </ThemedText>
                </View>
                <DisclosureChevron size={18} color={colors.textSecondary} />
              </PressableCard>
            </AnimatedListItem>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: Spacing.three, paddingHorizontal: Spacing.four },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: Spacing.half },
  headerCtas: { gap: Spacing.two },
  prayAlongCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
});
