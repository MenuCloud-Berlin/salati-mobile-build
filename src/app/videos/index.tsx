// Video-Uebersicht: die 37 Lernvideos, nach Reihe gruppiert (Section-Header je
// Reihe — es gibt vier: Sprache/Madinah/Vokabeln/Tadschwied). Antippen oeffnet
// den Voll-Player (videos/[episode].tsx). Pro Folge Cover + Titel +
// Beschreibung + Dauer, ein Offline-Download-Button, eine Offline-Kennzeichnung
// sowie ein „Weiterschauen"-Balken, wenn die Folge schon angefangen wurde.
// Daten aus dem oeffentlichen R2-Bucket (features/video/data.ts) via react-query.
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  fetchVideoIndex,
  formatDuration,
  groupEpisodesBySeries,
  hasMultipleSeries,
  type VideoEpisode,
} from '@/features/video/data';
import { useVideoDownload } from '@/features/video/downloads';
import { useAllVideoProgress } from '@/features/video/progress';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

type ListRow =
  | { kind: 'section'; key: string; title: string }
  | { kind: 'episode'; key: string; episode: VideoEpisode; itemIndex: number; resume: number };

export default function VideoListScreen() {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['video', 'index'],
    queryFn: fetchVideoIndex,
    staleTime: 60 * 60 * 1000,
  });

  // „Weiterschauen"-Positionen: beim Zurueckkehren aus dem Player neu laden,
  // damit der Balken den aktuellen Stand zeigt.
  const { progress, reload } = useAllVideoProgress();
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const episodes = data?.episodes ?? [];
  const multiSeries = hasMultipleSeries(episodes);
  const rows: ListRow[] = [];
  let itemIndex = 0;
  for (const group of groupEpisodesBySeries(episodes)) {
    if (multiSeries) {
      rows.push({ kind: 'section', key: `s:${group.key}`, title: group.title ?? t('video.moreEpisodes') });
    }
    for (const ep of group.episodes) {
      const p = progress[String(ep.episode_no)];
      const resume = p && p.duration > 0 ? Math.min(1, p.position / p.duration) : 0;
      rows.push({ kind: 'episode', key: `e:${ep.episode_no}`, episode: ep, itemIndex: itemIndex++, resume });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}>
                <IconSymbol name="videocam" size={40} color={colors.background} />
              </View>
              <ThemedText type="title" style={styles.headerTitle}>
                {t('video.title')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.headerSubtitle}>
                {t('video.subtitle')}
              </ThemedText>
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'section' ? (
              <SectionHeader title={item.title} />
            ) : (
              <EpisodeRow episode={item.episode} index={item.itemIndex} resume={item.resume} />
            )
          }
          ListEmptyComponent={
            <View style={styles.center}>
              {isLoading ? (
                <ThemedActivityIndicator />
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {isError ? t('common.error') : t('video.empty')}
                </ThemedText>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeaderText}>
        {title.toUpperCase()}
      </ThemedText>
    </View>
  );
}

function EpisodeRow({ episode, index, resume }: { episode: VideoEpisode; index: number; resume: number }) {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const dl = useVideoDownload(episode);
  const downloaded = dl.state === 'done';
  const coverSource = dl.localCoverUri ?? episode.cover_url;
  const started = resume > 0.02 && resume < 0.98;

  function confirmDelete() {
    Alert.alert(t('video.deleteDownloadConfirmTitle'), t('video.deleteDownloadConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('video.deleteDownload'), style: 'destructive', onPress: () => void dl.remove() },
    ]);
  }

  return (
    <AnimatedListItem index={index % 12}>
      <PressableCard
        onPress={() => router.push({ pathname: '/videos/[episode]', params: { episode: episode.episode_no } })}
        type="backgroundElement"
        style={styles.row}>
        <View style={styles.thumbWrap}>
          {coverSource ? (
            <Image source={coverSource} style={styles.thumb} contentFit="cover" transition={150} />
          ) : (
            <ThemedView type="backgroundSelected" style={[styles.thumb, styles.coverFallback]}>
              <IconSymbol name="videocam" size={22} color={colors.accent} />
            </ThemedView>
          )}
          {/* Play-Overlay: signalisiert, dass die Kachel ein Video ist. */}
          <View style={styles.playOverlay}>
            <IconSymbol name="play" size={18} color="#FFFFFF" />
          </View>
          <View style={[styles.numBadge, { backgroundColor: colors.accent }]}>
            <ThemedText type="small" style={{ color: colors.background, fontSize: 11 }}>
              {episode.episode_no}
            </ThemedText>
          </View>
          {/* Weiterschauen-Balken am unteren Kachelrand. */}
          {started && (
            <View style={styles.resumeTrack}>
              <View style={[styles.resumeFill, { width: `${Math.round(resume * 100)}%`, backgroundColor: Brand.gold }]} />
            </View>
          )}
        </View>

        <View style={styles.rowText}>
          <ThemedText type="default" numberOfLines={2}>
            {episode.title}
          </ThemedText>
          {episode.description ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {episode.description}
            </ThemedText>
          ) : null}
          <View style={styles.metaRow}>
            <IconSymbol name="time-outline" size={14} color={colors.accent} />
            <ThemedText type="small" themeColor="accent">
              {formatDuration(episode.duration_sec)}
            </ThemedText>
            {started && (
              <View style={styles.metaBadge}>
                <IconSymbol name="play-back-circle" size={13} color={colors.accent} />
                <ThemedText type="small" themeColor="accent" style={styles.metaBadgeLabel}>
                  {t('video.continue')}
                </ThemedText>
              </View>
            )}
            {downloaded && (
              <View style={styles.metaBadge}>
                <IconSymbol name="cloud-done" size={13} color={colors.accent} />
                <ThemedText type="small" themeColor="accent" style={styles.metaBadgeLabel}>
                  {t('video.offline')}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Download-Steuerung: none -> laden, downloading -> Fortschritt/abbrechen,
            done -> loeschen. Auf Web (kein Dateisystem) ist dl.supported false. */}
        {dl.supported &&
          (dl.state === 'downloading' ? (
            <Pressable
              onPress={dl.cancel}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('video.cancelDownload')}
              style={({ pressed }) => [styles.dlBtn, pressed && styles.pressed]}>
              {dl.progress > 0 ? (
                <ThemedText type="small" themeColor="accent" style={styles.dlPct}>
                  {Math.round(dl.progress * 100)}%
                </ThemedText>
              ) : (
                <ThemedActivityIndicator size="small" />
              )}
            </Pressable>
          ) : dl.state === 'done' ? (
            <Pressable
              onPress={confirmDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('video.deleteDownload')}
              style={({ pressed }) => [styles.dlBtn, pressed && styles.pressed]}>
              <IconSymbol name="cloud-done" size={20} color={colors.accent} />
            </Pressable>
          ) : (
            <Pressable
              onPress={dl.download}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('video.download')}
              style={({ pressed }) => [styles.dlBtn, pressed && styles.pressed]}>
              <IconSymbol name="download-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}

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
  header: { alignItems: 'center', gap: Spacing.one, paddingBottom: Spacing.four, paddingTop: Spacing.two },
  headerIcon: { width: 80, height: 80, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  headerTitle: { textAlign: 'center' },
  headerSubtitle: { textAlign: 'center', paddingHorizontal: Spacing.two },
  sectionHeader: { paddingTop: Spacing.two, paddingBottom: Spacing.half, paddingHorizontal: Spacing.one },
  sectionHeaderText: { letterSpacing: 0.5 },
  center: { alignItems: 'center', paddingVertical: Spacing.five },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two },
  thumbWrap: { width: 96, height: 64 },
  // 16:9-Kachel (Video-Format) statt quadratisch wie beim Podcast.
  thumb: { width: 96, height: 64, borderRadius: 12 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  resumeTrack: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 5,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    overflow: 'hidden',
  },
  resumeFill: { height: 3, borderRadius: 2 },
  // minWidth:0 ist auf React Native Web zwingend (sonst horizontaler Overflow
  // bei langen Titeln); nativ (Yoga) ist min-width ohnehin 0.
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: 2, flexWrap: 'wrap' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: Spacing.one },
  metaBadgeLabel: { fontSize: 11 },
  dlBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dlPct: { fontSize: 11 },
  pressed: { opacity: 0.6 },
});
