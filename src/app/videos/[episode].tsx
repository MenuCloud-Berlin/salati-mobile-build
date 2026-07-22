// Video-Voll-Player (nativ, iOS/Android): grosser 16:9-VideoView mit eigenen
// Steuerelementen — Scrubber, Play/Pause, ±15 s, Folge vor/zurueck,
// Geschwindigkeit, Vollbild (Querformat ueber die native Vollbild-Ansicht).
// Die Wiedergabe-Position wird pro Folge gemerkt (Weiterschauen) und beim
// erneuten Oeffnen wiederhergestellt. Darunter Titel, Beschreibung und Themen.
// Hintergrund-Wiedergabe ist bei Video bewusst AUS (staysActiveInBackground:
// false) — Video pausiert beim Verlassen. Der Web-Fallback (HTML5 <video>)
// liegt in [episode].web.tsx.
import { useEvent } from 'expo';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchVideoIndex, formatDuration, type VideoEpisode } from '@/features/video/data';
import { resolveVideoUri, useVideoDownload } from '@/features/video/downloads';
import { loadVideoProgress, saveVideoProgress } from '@/features/video/progress';
import { Slider } from '@/features/podcast/slider';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const SKIP_SEC = 15;

export default function VideoPlayerScreen() {
  const { episode: episodeParam } = useLocalSearchParams<{ episode: string }>();
  const episodeNo = Number(episodeParam);
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const { width: winWidth } = useWindowDimensions();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['video', 'index'],
    queryFn: fetchVideoIndex,
    staleTime: 60 * 60 * 1000,
  });

  const episodes = data?.episodes ?? [];
  const episode = episodes.find((e) => e.episode_no === episodeNo);
  const idx = episodes.findIndex((e) => e.episode_no === episodeNo);
  const prev = idx > 0 ? episodes[idx - 1] : undefined;
  const next = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : undefined;
  const dl = useVideoDownload(episode);

  // Player einmal mit leerer Quelle anlegen (Rules of Hooks: unbedingt am
  // Anfang). Die echte Quelle wird gesetzt, sobald die Folge + die aufgeloeste
  // (lokale oder Remote-) URI feststehen. 0.5 s Zeitmarken-Intervall speist den
  // eigenen Scrubber; Hintergrund-Wiedergabe ist bei Video aus.
  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const timeUpdate = useEvent(player, 'timeUpdate');
  const currentTime = timeUpdate?.currentTime ?? 0;

  const [speed, setSpeed] = useState(1);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);

  const duration = player.duration || episode?.duration_sec || 0;
  const progress = duration > 0 ? currentTime / duration : 0;
  const shownProgress = seekPreview ?? progress;

  const viewRef = useRef<VideoView>(null);

  // Geschwindigkeit auf den Player anwenden — nur im Effekt erlaubt (Property-
  // Mutation eines Hook-Werts). Nach jedem Quellwechsel (status → readyToPlay)
  // erneut, da replace() die Rate zuruecksetzen kann.
  useEffect(() => {
    // expo-video setzt die Geschwindigkeit ausschliesslich ueber diese
    // Property (kein setPlaybackRate — so auch in den Expo-Docs). Die
    // Compiler-Immutability-Regel ist hier ein False-Positive fuer den
    // absichtlich veraenderbaren Player.
    // eslint-disable-next-line react-hooks/immutability
    player.playbackRate = speed;
  }, [speed, status, player]);

  // Weiterschauen-Position wird nach dem Laden EINMAL angesprungen.
  const seekedRef = useRef(false);
  const pendingSeekRef = useRef(0);

  // Quelle + gemerkte Position laden, sobald die Folge feststeht. Lokale Datei
  // hat Vorrang (Offline). replace() laedt asynchron; der Sprung auf die
  // gemerkte Position passiert im Status-Effekt (readyToPlay).
  useEffect(() => {
    if (!episode) return;
    let cancelled = false;
    seekedRef.current = false;
    pendingSeekRef.current = 0;
    (async () => {
      const [uri, saved] = await Promise.all([
        resolveVideoUri(episode),
        loadVideoProgress(episode.episode_no),
      ]);
      if (cancelled) return;
      pendingSeekRef.current = saved;
      player.replace(uri);
      player.play();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.episode_no]);

  // Nach dem Laden (readyToPlay) einmalig auf die gemerkte Position springen.
  useEffect(() => {
    if (status !== 'readyToPlay' || seekedRef.current) return;
    seekedRef.current = true;
    const seek = pendingSeekRef.current;
    // Relativ via seekBy (Methode) statt Property-Zuweisung an den Player.
    if (seek > 1 && seek < player.duration - 2) player.seekBy(seek - player.currentTime);
  }, [status, player]);

  // Position throttled sichern (alle ~4 s), erst nachdem der Resume-Sprung
  // angewandt wurde (sonst ueberschreibt ein fruehes timeUpdate die Position
  // mit 0).
  const lastSaveRef = useRef(0);
  useEffect(() => {
    if (!episode || !seekedRef.current) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 4000) return;
    lastSaveRef.current = now;
    void saveVideoProgress(episode.episode_no, currentTime, duration);
  }, [currentTime, episode, duration]);

  // Beim Verlassen/Unmount die letzte Position sichern (Refs, damit der
  // Cleanup die aktuellen Werte sieht).
  const saveRef = useRef({ episodeNo, currentTime, duration, seeked: false });
  useEffect(() => {
    saveRef.current = { episodeNo, currentTime, duration, seeked: seekedRef.current };
  });
  useFocusEffect(
    useCallback(() => {
      return () => {
        const s = saveRef.current;
        if (s.seeked) void saveVideoProgress(s.episodeNo, s.currentTime, s.duration);
      };
    }, []),
  );

  function togglePlay() {
    if (isPlaying) player.pause();
    else player.play();
  }

  function skip(delta: number) {
    // seekBy ist relativ und eine Methode (Property-Zuweisung an den Player
    // waere ausserhalb eines Effekts nicht erlaubt).
    player.seekBy(delta);
  }

  function applySpeed(s: number) {
    // Nur den State setzen; der Effekt oben uebertraegt die Rate auf den Player.
    setSpeed(s);
  }

  function cycleSpeed() {
    const i = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    applySpeed(SPEEDS[(i + 1) % SPEEDS.length]);
  }

  function goTo(ep?: VideoEpisode) {
    if (ep) router.replace({ pathname: '/videos/[episode]', params: { episode: ep.episode_no } });
  }

  function confirmDeleteDownload() {
    Alert.alert(t('video.deleteDownloadConfirmTitle'), t('video.deleteDownloadConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('video.deleteDownload'), style: 'destructive', onPress: () => void dl.remove() },
    ]);
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ThemedActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isError || !episode) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.center]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.error')}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 16:9-Videoflaeche, an die Bildschirmbreite (bis MaxContentWidth) gebunden.
  const videoWidth = Math.min(winWidth, MaxContentWidth);
  const videoHeight = Math.round((videoWidth * 9) / 16);
  const loadingVideo = status === 'loading' || status === 'idle';
  const topics = episode.topics.filter((s) => s && s.trim().length > 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Videoflaeche */}
          <View style={[styles.videoWrap, { width: videoWidth, height: videoHeight }]}>
            <VideoView
              ref={viewRef}
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls={false}
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture
              accessibilityLabel={episode.title}
            />
            {loadingVideo && (
              <View style={styles.videoLoading} pointerEvents="none">
                <ThemedActivityIndicator />
              </View>
            )}
          </View>

          {/* Steuerleiste */}
          <View style={styles.controls}>
            <View style={styles.scrubBlock}>
              <Slider
                value={shownProgress}
                accessibilityLabel={t('video.seek')}
                onChange={(r) => setSeekPreview(r)}
                onCommit={(r) => {
                  setSeekPreview(null);
                  // Absolut anspringen via relativem seekBy (Methode statt
                  // Property-Zuweisung — Rules-of-Hooks-Immutability).
                  if (duration > 0) player.seekBy(r * duration - currentTime);
                }}
              />
              <View style={styles.timeRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDuration((seekPreview != null ? seekPreview * duration : currentTime) || 0)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDuration(duration)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.transport}>
              <CircleButton icon="play-skip-back" size={24} onPress={() => goTo(prev)} disabled={!prev} label={t('video.previous')} />
              <CircleButton icon="play-back" size={26} onPress={() => skip(-SKIP_SEC)} label="-15s" />
              <Pressable
                onPress={togglePlay}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? t('video.pause') : t('video.play')}
                style={[styles.playBtn, { backgroundColor: colors.accent }]}>
                <IconSymbol name={isPlaying ? 'pause' : 'play'} size={34} color={colors.background} />
              </Pressable>
              <CircleButton icon="play-forward" size={26} onPress={() => skip(SKIP_SEC)} label="+15s" />
              <CircleButton icon="play-skip-forward" size={24} onPress={() => goTo(next)} disabled={!next} label={t('video.next')} />
            </View>

            <View style={styles.secondaryRow}>
              <PressableCard onPress={cycleSpeed} type="backgroundElement" style={styles.pill}>
                <IconSymbol name="speedometer" size={16} color={colors.accent} />
                <ThemedText type="smallBold" themeColor="accent">
                  {speed}×
                </ThemedText>
              </PressableCard>

              {dl.supported &&
                (dl.state === 'downloading' ? (
                  <PressableCard onPress={dl.cancel} type="backgroundElement" style={styles.pill}>
                    {dl.progress > 0 ? (
                      <ThemedText type="smallBold" themeColor="accent">
                        {Math.round(dl.progress * 100)}%
                      </ThemedText>
                    ) : (
                      <ThemedActivityIndicator size="small" />
                    )}
                    <IconSymbol name="close" size={14} color={colors.textSecondary} />
                  </PressableCard>
                ) : dl.state === 'done' ? (
                  <PressableCard onPress={confirmDeleteDownload} type="backgroundElement" style={styles.pill}>
                    <IconSymbol name="cloud-done" size={16} color={colors.accent} />
                    <ThemedText type="smallBold" themeColor="accent">
                      {t('video.offline')}
                    </ThemedText>
                  </PressableCard>
                ) : (
                  <PressableCard onPress={dl.download} type="backgroundElement" style={styles.pill}>
                    <IconSymbol name="download-outline" size={16} color={colors.accent} />
                    <ThemedText type="smallBold" themeColor="accent">
                      {t('video.download')}
                    </ThemedText>
                  </PressableCard>
                ))}

              <View style={styles.flex} />

              <PressableCard
                onPress={() => viewRef.current?.enterFullscreen()}
                type="backgroundElement"
                style={styles.pill}>
                <IconSymbol name="expand" size={16} color={colors.accent} />
                <ThemedText type="smallBold" themeColor="accent">
                  {t('video.fullscreen')}
                </ThemedText>
              </PressableCard>
            </View>
          </View>

          {/* Titel + Beschreibung + Themen */}
          <View style={styles.info}>
            <ThemedText type="small" themeColor="accent" style={styles.epNo}>
              {episode.series_title ? `${episode.series_title} · ` : ''}
              {t('video.episodeLabel')} {episode.episode_no}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.title}>
              {episode.title}
            </ThemedText>
            {episode.description ? (
              <ThemedText type="default" themeColor="textSecondary" style={styles.desc}>
                {episode.description}
              </ThemedText>
            ) : null}

            {topics.length > 0 && (
              <>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.topicsLabel}>
                  {t('video.topics').toUpperCase()}
                </ThemedText>
                <View style={styles.topicsWrap}>
                  {topics.map((topic, i) => (
                    <View key={i} style={[styles.topicChip, { backgroundColor: colors.backgroundElement }]}>
                      <ThemedText type="small" themeColor="text">
                        {topic}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function CircleButton({
  icon,
  size,
  onPress,
  disabled,
  label,
}: {
  icon: IconName;
  size: number;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.circleBtn, disabled && styles.circleBtnDisabled]}>
      <IconSymbol name={icon} size={size} color={disabled ? colors.textSecondary : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.two + BackChipInset },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: Spacing.six, alignItems: 'center' },
  videoWrap: { backgroundColor: '#000', alignSelf: 'center', overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  videoLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  controls: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  scrubBlock: { width: '100%' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -Spacing.one },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.four, marginTop: Spacing.two },
  circleBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  circleBtnDisabled: { opacity: 0.35 },
  playBtn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  pill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.one, paddingHorizontal: Spacing.three },
  flex: { flex: 1 },
  info: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
    gap: Spacing.one,
  },
  epNo: { textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 22, lineHeight: 28, marginTop: Spacing.half },
  desc: { marginTop: Spacing.one, lineHeight: 22 },
  topicsLabel: { letterSpacing: 1, marginTop: Spacing.three },
  topicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  topicChip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: 999 },
});
