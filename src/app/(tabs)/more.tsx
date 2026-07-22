import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

// Thematische Gruppierung statt einer flachen 19-Einträge-Liste
// (User-Feedback "App muss übersichtlicher/sortierter sein").
// `as const` hält die hrefs als Literale für expo-routers typisierte Routen.
// Die Lern-Sektion (Podcast, Lern-App, Hifz, Quiz, Hadith, Radio, …) lebt jetzt
// im eigenen prominenten „Lernen"-Tab ((tabs)/lernen.tsx) — bewusst NICHT mehr
// hier unter „Mehr" vergraben (User-Wunsch: verdient Aufmerksamkeit).
const SECTIONS = [
  {
    titleKey: 'more.sections.practice',
    items: [
      { href: '/tracker', labelKey: 'nav.tracker', icon: 'checkmark-circle' },
      { href: '/guides', labelKey: 'nav.guides', icon: 'body' },
      { href: '/duas', labelKey: 'nav.duas', icon: 'hand-left' },
      { href: '/tasbih', labelKey: 'nav.tasbih', icon: 'repeat' },
      { href: '/fasting', labelKey: 'nav.fasting', icon: 'moon' },
      { href: '/khatmah', labelKey: 'nav.khatmah', icon: 'calendar' },
      { href: '/calendar', labelKey: 'nav.calendar', icon: 'calendar-outline' },
      { href: '/themes', labelKey: 'nav.themes', icon: 'compass-outline' },
      { href: '/themes/journeys', labelKey: 'nav.journeys', icon: 'walk-outline' },
      { href: '/achievements', labelKey: 'nav.achievements', icon: 'trophy' },
    ],
  },
  {
    titleKey: 'more.sections.tools',
    items: [
      { href: '/zakat', labelKey: 'nav.zakat', icon: 'cash' },
      { href: '/zakat-fitr', labelKey: 'nav.zakatFitr', icon: 'gift-outline' },
      { href: '/mirath', labelKey: 'nav.mirath', icon: 'people' },
      { href: '/hijri-converter', labelKey: 'nav.hijriConverter', icon: 'swap-horizontal' },
      { href: '/halal', labelKey: 'nav.halal', icon: 'restaurant' },
      { href: '/halal-scanner', labelKey: 'nav.halalScanner', icon: 'barcode' },
      { href: '/mosques', labelKey: 'nav.mosques', icon: 'location' },
    ],
  },
  {
    titleKey: 'more.sections.app',
    items: [
      { href: '/sync', labelKey: 'nav.sync', icon: 'sync' },
      { href: '/settings', labelKey: 'nav.settings', icon: 'settings' },
      { href: '/changelog', labelKey: 'nav.changelog', icon: 'sparkles-outline' },
    ],
  },
] as const satisfies readonly {
  titleKey: string;
  items: readonly { href: string; labelKey: string; icon: IconName }[];
}[];

export default function MoreScreen() {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  let itemIndex = 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('nav.more')}
        </ThemedText>

        <ScrollView contentContainerStyle={styles.list}>
          <PressableCard
              onPress={() => router.push('/search')}
              type="backgroundSelected"
              style={styles.kiCard}>
              <ThemedView type="backgroundElement" style={styles.iconBadge}>
                <IconSymbol name="search" size={18} color={colors.accent} />
              </ThemedView>
              <View style={styles.kiText}>
                <ThemedText type="smallBold" themeColor="accent">
                  {t('nav.search')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('search.moreDesc')}
                </ThemedText>
              </View>
              <DisclosureChevron size={18} color={colors.textSecondary} />
          </PressableCard>
          {/* Web: eigenständige statische Seite (public/ki.html, WebLLM/WebGPU
              im Browser). Nativ: eigener Router-Screen (ki-native.tsx) mit
              llama.rn — läuft komplett offline auf dem Gerät, kein WebGPU
              in RN-WebViews verfügbar/nötig. */}
          <PressableCard
              onPress={() => {
                if (Platform.OS === 'web') {
                  window.location.href = '/ki';
                } else {
                  router.push('/ki-native');
                }
              }}
              type="backgroundSelected"
              style={styles.kiCard}>
              <ThemedView type="backgroundElement" style={styles.iconBadge}>
                <IconSymbol name="sparkles" size={18} color={colors.accent} />
              </ThemedView>
              <View style={styles.kiText}>
                <ThemedText type="smallBold" themeColor="accent">
                  {t('landing.ctaKi')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('more.kiDesc')}
                </ThemedText>
              </View>
              <DisclosureChevron size={18} color={colors.textSecondary} />
          </PressableCard>
          {SECTIONS.map((section) => (
            <View key={section.titleKey} style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                {t(section.titleKey)}
              </ThemedText>
              <View style={styles.grid}>
                {section.items.map((item) => {
                  const index = itemIndex++;
                  return (
                    <AnimatedListItem key={item.href} index={index} style={styles.gridItem}>
                      <PressableCard onPress={() => router.push(item.href)} style={styles.row}>
                        <View style={styles.rowLeft}>
                          <ThemedView type="backgroundSelected" style={styles.iconBadge}>
                            <IconSymbol name={item.icon} size={18} color={colors.accent} />
                          </ThemedView>
                          <ThemedText type="default">{t(item.labelKey)}</ThemedText>
                        </View>
                        <DisclosureChevron size={18} color={colors.textSecondary} />
                      </PressableCard>
                    </AnimatedListItem>
                  );
                })}
              </View>
            </View>
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={styles.credit}>
            Salati · {t('common.credit')}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  kiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  kiText: { flex: 1, gap: 2 },
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  title: { textAlign: 'center', marginBottom: Spacing.three },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.five,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  section: { gap: Spacing.two },
  credit: { textAlign: 'center', marginTop: Spacing.two },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 1, paddingLeft: Spacing.one },
  // Reines Flexbox-Grid ohne JS-Breakpoint: schmale Screens 1 Spalte,
  // Foldables/Tablets automatisch 2+, unabhängig von useWindowDimensions
  // (das auf dem Static-Web-Export unzuverlässig aktualisierte).
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridItem: { flexBasis: 320, minWidth: 280, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
