// "Lernen"-Tab: prominenter Einstieg fuer die Lerninhalte, die vorher unter
// "Mehr" vergraben waren (User-Wunsch: Podcast, Lern-App mit 2000+ Lektionen
// und Hifz verdienen Aufmerksamkeit). Oben eine Hero-Karte fuer den Podcast,
// darunter zwei grosse Karten (Lern-App, Hifz) und ein Raster der uebrigen
// Lernwerkzeuge.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchVideoIndex } from '@/features/video/data';
import { useReelsIndex } from '@/features/reels/data';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

// „NEU"-Badges bekommen eine Dismiss-Logik (Audit 2026-07-22): nach dem ersten
// Besuch der jeweiligen Sektion ausblenden, statt dauerhaft zu leuchten und so
// ihre Signalwirkung zu verlieren. Persistiert je Sektion in AsyncStorage.
const NEW_SEEN = {
  podcast: 'salati.newSeen.podcast',
  videos: 'salati.newSeen.videos',
  reels: 'salati.newSeen.reels',
} as const;

// Medien-Karten unter der Podcast-Hero: Lernvideos + Kurz-Reels. Werden NUR
// gezeigt, wenn tatsächlich Inhalte vorhanden sind (Audit 2026-07-22): sonst
// führte eine prominente NEU-Karte in einen „kommt bald"-Leerzustand.
const MEDIA = [
  { href: '/videos', icon: 'videocam', titleKey: 'video.title', descKey: 'video.heroDesc', seenKey: NEW_SEEN.videos },
  { href: '/reels', icon: 'film', titleKey: 'video.reelsTitle', descKey: 'video.reelsDesc', seenKey: NEW_SEEN.reels },
] as const satisfies readonly { href: string; icon: IconName; titleKey: string; descKey: string; seenKey: string }[];

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

  // Echte Inhalts-Verfügbarkeit (react-query teilt den Cache mit den Ziel-
  // Screens — kein Doppel-Fetch). Leere/„noch nicht produziert"-Indizes liefern
  // eine leere Liste, dann wird die Karte samt NEU-Badge ausgeblendet.
  const { data: reelsData } = useReelsIndex();
  const { data: videoData } = useQuery({
    queryKey: ['video', 'index'],
    queryFn: fetchVideoIndex,
    staleTime: 60 * 60 * 1000,
  });
  const hasContent: Record<string, boolean> = {
    '/videos': (videoData?.episodes?.length ?? 0) > 0,
    '/reels': (reelsData?.reels?.length ?? 0) > 0,
  };
  const media = MEDIA.filter((m) => hasContent[m.href]);

  // NEU-Badge-Dismiss: gesehene Sektionen aus AsyncStorage laden; beim Öffnen
  // einer Sektion sofort als gesehen markieren.
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    AsyncStorage.multiGet(Object.values(NEW_SEEN))
      .then((pairs) => {
        const next: Record<string, boolean> = {};
        for (const [k, v] of pairs) if (v) next[k] = true;
        setSeen(next);
      })
      .catch(() => {});
  }, []);
  const openAndMarkSeen = useCallback((href: string, seenKey: string) => {
    setSeen((prev) => (prev[seenKey] ? prev : { ...prev, [seenKey]: true }));
    AsyncStorage.setItem(seenKey, '1').catch(() => {});
    router.push(href);
  }, []);

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
              onPress={() => openAndMarkSeen('/podcast', NEW_SEEN.podcast)}
              type="backgroundSelected"
              style={styles.hero}>
              <View style={[styles.heroIcon, { backgroundColor: colors.accent }]}>
                <IconSymbol name="headset" size={28} color={colors.background} />
              </View>
              <View style={styles.heroText}>
                <View style={styles.heroTitleRow}>
                  <ThemedText type="subtitle">{t('podcast.title')}</ThemedText>
                  {!seen[NEW_SEEN.podcast] && (
                    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                      <ThemedText type="small" style={{ color: colors.background, fontSize: 11 }}>
                        {t('common.new')}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('podcast.heroDesc')}
                </ThemedText>
              </View>
              <DisclosureChevron size={20} color={colors.textSecondary} />
            </PressableCard>
          </AnimatedListItem>

          {/* Medien: Videos + Reels — nur mit echtem Inhalt (kein „kommt bald"-
              Sackgassen-Einstieg mehr). NEU-Badge verschwindet nach 1. Besuch. */}
          {media.length > 0 && (
            <View style={styles.featuredGrid}>
              {media.map((item) => (
                <AnimatedListItem key={item.href} index={itemIndex++} style={styles.featuredItem}>
                  <PressableCard
                    onPress={() => openAndMarkSeen(item.href, item.seenKey)}
                    type="backgroundElement"
                    style={styles.featuredCard}>
                    <View style={styles.mediaTitleRow}>
                      <ThemedView type="backgroundSelected" style={styles.featuredIcon}>
                        <IconSymbol name={item.icon} size={22} color={colors.accent} />
                      </ThemedView>
                      {!seen[item.seenKey] && (
                        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                          <ThemedText type="small" style={{ color: colors.background, fontSize: 11 }}>
                            {t('common.new')}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText type="smallBold">{t(item.titleKey)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                      {t(item.descKey)}
                    </ThemedText>
                  </PressableCard>
                </AnimatedListItem>
              ))}
            </View>
          )}

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

          {/* Raster: uebrige Werkzeuge. Zwei-spaltige Karten mit grossem
              Icon-Badge (44) statt der frueheren duennen Zeilen mit 32er-Badge
              - groessere, gleichmaessige Tap-Ziele und visuell konsistent mit
              den Featured-/Medien-Karten darueber (User-Wunsch: groessere
              Buttons + aufgeraeumteres Studium-Menue). */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {t('lernen.more')}
          </ThemedText>
          <View style={styles.grid}>
            {GRID.map((item) => (
              <AnimatedListItem key={item.href} index={itemIndex++} style={styles.gridItem}>
                <PressableCard onPress={() => router.push(item.href)} style={styles.gridCard}>
                  <ThemedView type="backgroundSelected" style={styles.gridIcon}>
                    <IconSymbol name={item.icon} size={22} color={colors.accent} />
                  </ThemedView>
                  <ThemedText type="smallBold" numberOfLines={2}>{t(item.labelKey)}</ThemedText>
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
  mediaTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 1, paddingLeft: Spacing.one, marginTop: Spacing.one },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  gridItem: { flexBasis: 150, minWidth: 140, flexGrow: 1 },
  gridCard: { gap: Spacing.two, padding: Spacing.four, minHeight: 108, justifyContent: 'flex-start' },
  gridIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
