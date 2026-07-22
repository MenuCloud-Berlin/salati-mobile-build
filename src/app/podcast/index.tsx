// Podcast-Uebersicht: der deutsche Quran-Arabisch-Podcast (15 Folgen).
// Serien-Header + Folgenliste. Antippen oeffnet den Voll-Player
// (podcast/[episode].tsx). Daten aus dem oeffentlichen Supabase-Bucket
// (features/podcast/data.ts) via react-query — gleiches Lade-/Fehlermuster
// wie radio.tsx.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchPodcastIndex, formatDuration, type PodcastEpisode } from '@/features/podcast/data';
import { useSharedPlayer } from '@/features/quran/usePlayer';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

export default function PodcastListScreen() {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const { nowPlaying } = useSharedPlayer();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['podcast', 'index'],
    queryFn: fetchPodcastIndex,
    staleTime: 60 * 60 * 1000,
  });

  const series = data?.series;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={data?.episodes ?? []}
          keyExtractor={(e) => String(e.episode_no)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              {series?.cover_url ? (
                <Image
                  source={series.cover_url}
                  style={styles.seriesCover}
                  contentFit="cover"
                  transition={200}
                  accessibilityLabel={series.title}
                />
              ) : (
                <ThemedView type="backgroundSelected" style={[styles.seriesCover, styles.coverFallback]}>
                  <IconSymbol name="headset" size={44} color={colors.accent} />
                </ThemedView>
              )}
              <ThemedText type="title" style={styles.seriesTitle}>
                {series?.title ?? t('podcast.title')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.seriesSubtitle}>
                {series?.subtitle ?? t('podcast.subtitle')}
              </ThemedText>
              {series?.description ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.seriesDesc}>
                  {series.description}
                </ThemedText>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <EpisodeRow
              episode={item}
              index={index}
              active={nowPlaying?.title?.startsWith(`${item.episode_no}.`) ?? false}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              {isLoading ? (
                <ThemedActivityIndicator />
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {isError ? t('common.error') : t('podcast.empty')}
                </ThemedText>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function EpisodeRow({
  episode,
  index,
  active,
}: {
  episode: PodcastEpisode;
  index: number;
  active: boolean;
}) {
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  return (
    <AnimatedListItem index={index % 12}>
      <PressableCard
        onPress={() =>
          router.push({ pathname: '/podcast/[episode]', params: { episode: episode.episode_no } })
        }
        type={active ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.row}>
        <View style={styles.thumbWrap}>
          {episode.cover_url ? (
            <Image source={episode.cover_url} style={styles.thumb} contentFit="cover" transition={150} />
          ) : (
            <ThemedView type="backgroundSelected" style={[styles.thumb, styles.coverFallback]}>
              <ThemedText type="smallBold" themeColor="accent">
                {episode.episode_no}
              </ThemedText>
            </ThemedView>
          )}
          <View style={[styles.numBadge, { backgroundColor: colors.accent }]}>
            <ThemedText type="small" style={{ color: colors.background, fontSize: 11 }}>
              {episode.episode_no}
            </ThemedText>
          </View>
        </View>

        <View style={styles.rowText}>
          <ThemedText type="default" numberOfLines={2}>
            {episode.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {episode.topics.join(' · ')}
          </ThemedText>
          <View style={styles.metaRow}>
            <IconSymbol name={active ? 'volume-high' : 'play-circle'} size={14} color={colors.accent} />
            <ThemedText type="small" themeColor="accent">
              {formatDuration(episode.duration_sec)}
            </ThemedText>
          </View>
        </View>
        <DisclosureChevron size={18} color={colors.textSecondary} />
      </PressableCard>
    </AnimatedListItem>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: { alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.four, paddingTop: Spacing.two },
  seriesCover: { width: 200, height: 200, borderRadius: 24 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  seriesTitle: { textAlign: 'center', marginTop: Spacing.two },
  seriesSubtitle: { textAlign: 'center' },
  seriesDesc: { textAlign: 'center', paddingHorizontal: Spacing.two },
  center: { alignItems: 'center', paddingVertical: Spacing.five },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two },
  thumbWrap: { width: 64, height: 64 },
  thumb: { width: 64, height: 64, borderRadius: 14 },
  numBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  rowText: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: 2 },
});
