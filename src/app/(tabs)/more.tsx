import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { NavTile, navTileStyles } from '@/components/ui/nav-tile';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, IconBadge, MaxContentWidth, Spacing } from '@/constants/theme';
import { LERNEN_NAV } from '@/lib/lernenNav';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

// Thematische Gruppierung statt einer flachen Liste
// (User-Feedback "App muss übersichtlicher/sortierter sein").
// `as const` hält die hrefs als Literale für expo-routers typisierte Routen.
// Die Lern-Sektion („Lernen") ist eine VERKNÜPFUNG auf dieselben Einträge wie
// im Lernen-Tab (gemeinsame Quelle lib/lernenNav.ts) — die wichtigsten Studium-
// Werkzeuge sind so an beiden Orten erreichbar, ohne Funktion zu duplizieren.
const SECTIONS = [
  {
    titleKey: 'more.sections.learning',
    items: LERNEN_NAV,
  },
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
                  {t('search.globalTitle')}
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
              <View style={navTileStyles.grid}>
                {section.items.map((item) => (
                  <NavTile
                    key={item.href}
                    index={itemIndex++}
                    label={t(item.labelKey)}
                    icon={item.icon}
                    onPress={() => router.push(item.href)}
                  />
                ))}
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
  iconBadge: {
    width: IconBadge.row,
    height: IconBadge.row,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
