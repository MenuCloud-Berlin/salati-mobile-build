// "Lernen"-Tab: prominenter Einstieg fuer die Lerninhalte, die vorher unter
// "Mehr" vergraben waren (User-Wunsch: Podcast, Lern-App mit 2000+ Lektionen
// und Hifz verdienen Aufmerksamkeit). Oben eine Hero-Karte fuer den Podcast,
// darunter zwei grosse Karten (Lern-App, Hifz) und ein Raster der uebrigen
// Lernwerkzeuge.
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
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

const FEATURED = [
  {
    href: '/learn',
    icon: 'school',
    titleKey: 'nav.learn',
    descKey: 'lernen.learnDesc',
  },
  {
    href: '/hifz',
    icon: 'bulb',
    titleKey: 'nav.hifz',
    descKey: 'lernen.hifzDesc',
  },
] as const satisfies readonly { href: string; icon: IconName; titleKey: string; descKey: string }[];

const GRID = [
  { href: '/study', labelKey: 'nav.study', icon: 'library' },
  { href: '/quiz', labelKey: 'nav.quiz', icon: 'game-controller' },
  { href: '/hadith', labelKey: 'nav.hadith', icon: 'book' },
  { href: '/wisdom', labelKey: 'nav.wisdom', icon: 'diamond' },
  { href: '/names', labelKey: 'nav.names', icon: 'star' },
  { href: '/radio', labelKey: 'nav.radio', icon: 'radio' },
  { href: '/getting-started', labelKey: 'nav.gettingStarted', icon: 'flag-outline' },
] as const satisfies readonly { href: string; labelKey: string; icon: IconName }[];

export default function LernenScreen() {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  let itemIndex = 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('nav.lernen')}
        </ThemedText>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {/* Hero: Podcast */}
          <AnimatedListItem index={itemIndex++}>
            <PressableCard
              onPress={() => router.push('/podcast')}
              type="backgroundSelected"
              style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: colors.accent }]}>
                <IconSymbol name="headset" size={30} color={colors.background} />
              </View>
              <View style={styles.heroText}>
                <View style={styles.heroTitleRow}>
                  <ThemedText type="subtitle">{t('podcast.title')}</ThemedText>
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <ThemedText type="small" style={{ color: colors.background, fontSize: 11 }}>
                      {t('common.new')}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('podcast.heroDesc')}
                </ThemedText>
              </View>
              <DisclosureChevron size={20} color={colors.textSecondary} />
            </PressableCard>
          </AnimatedListItem>

          {/* Featured: Lern-App + Hifz */}
          <View style={styles.featuredGrid}>
            {FEATURED.map((item) => (
              <AnimatedListItem key={item.href} index={itemIndex++} style={styles.featuredItem}>
                <PressableCard
                  onPress={() => router.push(item.href)}
                  type="backgroundElement"
                  style={styles.featuredCard}>
                  <ThemedView type="backgroundSelected" style={styles.featuredIcon}>
                    <IconSymbol name={item.icon} size={22} color={colors.accent} />
                  </ThemedView>
                  <ThemedText type="smallBold">{t(item.titleKey)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {t(item.descKey)}
                  </ThemedText>
                </PressableCard>
              </AnimatedListItem>
            ))}
          </View>

          {/* Raster: uebrige Werkzeuge */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {t('lernen.more')}
          </ThemedText>
          <View style={styles.grid}>
            {GRID.map((item) => (
              <AnimatedListItem key={item.href} index={itemIndex++} style={styles.gridItem}>
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
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  title: { textAlign: 'center', marginBottom: Spacing.three },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.five,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  heroIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: 3 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  featuredGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  featuredItem: { flexBasis: 200, flexGrow: 1, minWidth: 160 },
  featuredCard: { gap: Spacing.two, padding: Spacing.four, minHeight: 132 },
  featuredIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 1, paddingLeft: Spacing.one, marginTop: Spacing.one },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridItem: { flexBasis: 320, minWidth: 280, flexGrow: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
