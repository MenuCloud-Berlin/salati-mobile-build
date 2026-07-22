// In-App-Reels-Feed (Instagram-/TikTok-/Shorts-Stil): vertikaler Vollbild-Feed
// zum Hochwischen. Spielt die kurzen 9:16-Clips DIREKT in Salati ab — ohne
// Instagram. Daten aus dem oeffentlichen R2-Bucket (features/reels/data.ts).
//
// PERFORMANCE / KEIN 300-PLAYER-LEAK: Es wird NICHT pro Listeneintrag ein
// Video-Player erzeugt. Ein `ReelVideo` (und damit ein `useVideoPlayer`) wird
// nur fuer das sichtbare Reel + die direkten Nachbarn gemountet
// (`shouldRender = |index - active| <= 1`); alle anderen Zeilen rendern nur
// einen leichten dunklen Platzhalter mit Titel. Zusaetzlich haelt die FlatList
// per `windowSize={3}` das Mount-Fenster klein und entlaedt Entferntes
// (`removeClippedSubviews`). So existieren nie mehr als ~3 Player gleichzeitig.
//
// AUTOPLAY: Nur das sichtbare Reel spielt (via onViewableItemsChanged); die
// Nachbarn sind vorgeladen, aber pausiert. Das aktive Reel loopt.
import { useEvent } from 'expo';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useReelsIndex, type Reel } from '@/features/reels/data';
import { useTranslation } from '@/lib/i18n';

// Feste, auf beiden Themes lesbare Overlay-Farben — der Feed ist bewusst
// immer dunkel (Video fuellt den Screen).
const OVERLAY_TEXT = '#FFFFFF';
const OVERLAY_MUTED = 'rgba(255,255,255,0.72)';
const CONTROL_BG = 'rgba(0,0,0,0.42)';

export default function ReelsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch, isRefetching } = useReelsIndex();

  const reels = data?.reels ?? [];

  // Vollbild-Seitenhoehe = gesamte Fensterhoehe (randloses Video). Ueber
  // useState an die Orientierungs-/Resize-Events koppeln waere Overkill fuer
  // einen vertikalen Reels-Feed (portrait) — Dimensions.get reicht.
  const { height, width } = Dimensions.get('window');

  const [activeIndex, setActiveIndex] = useState(0);
  // Respektvoller Start: gemutet, mit gut sichtbarem Unmute-Button. Ton-Zustand
  // gilt global fuer den ganzen Feed.
  const [muted, setMuted] = useState(true);

  // useCallback (stabile Identitaet) statt useRef.current — FlatList erlaubt
  // kein Wechseln von onViewableItemsChanged zur Laufzeit; setActiveIndex ist
  // stabil, also keine deps.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems.find((v) => v.isViewable && v.index != null);
      if (first?.index != null) setActiveIndex(first.index);
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Reel; index: number }) => (
      <ReelItem
        reel={item}
        height={height}
        width={width}
        isActive={index === activeIndex}
        shouldRender={Math.abs(index - activeIndex) <= 1}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
      />
    ),
    [activeIndex, muted, height, width, insets.top, insets.bottom],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: height, offset: height * index, index }),
    [height],
  );

  // --- Nicht-Feed-Zustaende (immer dunkel, damit kein Theme-Flackern) --------
  if (isLoading) {
    return (
      <View style={styles.fullDark}>
        <StatusBar style="light" />
        <BackButton insetsTop={insets.top} />
        <ActivityIndicator size="large" color={Brand.gold} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.fullDark}>
        <StatusBar style="light" />
        <BackButton insetsTop={insets.top} />
        <View style={styles.centerBox}>
          <IconSymbol name="cloud-offline-outline" size={40} color={OVERLAY_MUTED} />
          <ThemedText type="subtitle" style={styles.stateTitle}>
            {t('reels.errorTitle')}
          </ThemedText>
          <ThemedText type="small" style={styles.stateText}>
            {t('reels.errorDesc')}
          </ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel={t('reels.retry')}
          >
            {isRefetching ? (
              <ActivityIndicator size="small" color={Brand.ink} />
            ) : (
              <ThemedText type="smallBold" style={styles.retryLabel}>
                {t('reels.retry')}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  if (reels.length === 0) {
    // "Reels kommen bald" — index.json existiert noch nicht oder ist leer.
    return (
      <View style={styles.fullDark}>
        <StatusBar style="light" />
        <BackButton insetsTop={insets.top} />
        <View style={styles.centerBox}>
          <IconSymbol name="film-outline" size={44} color={OVERLAY_MUTED} />
          <ThemedText type="subtitle" style={styles.stateTitle}>
            {t('reels.comingSoonTitle')}
          </ThemedText>
          <ThemedText type="small" style={styles.stateText}>
            {t('reels.comingSoonDesc')}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullDark}>
      <StatusBar style="light" hidden />
      <FlatList
        data={reels}
        keyExtractor={(r) => r.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        // Mount-Fenster klein halten -> nie mehr als ~3 Player leben.
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />
      <BackButton insetsTop={insets.top} />
    </View>
  );
}

// --- Ein Reel (eine Vollbild-Seite) ------------------------------------------

interface ReelItemProps {
  reel: Reel;
  height: number;
  width: number;
  isActive: boolean;
  shouldRender: boolean;
  muted: boolean;
  onToggleMute: () => void;
  insetsTop: number;
  insetsBottom: number;
}

function ReelItem({
  reel,
  height,
  width,
  isActive,
  shouldRender,
  muted,
  onToggleMute,
  insetsTop,
  insetsBottom,
}: ReelItemProps) {
  const { t } = useTranslation();

  const onShare = useCallback(() => {
    const parts = [reel.title, reel.series_title].filter(Boolean);
    Share.share({
      message: parts.length ? `${parts.join(' — ')}\n${reel.video_url}` : reel.video_url,
      url: reel.video_url,
    }).catch(() => {});
  }, [reel]);

  return (
    <View style={[styles.page, { height, width }]}>
      {shouldRender ? (
        <ReelVideo reel={reel} isActive={isActive} muted={muted} />
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Overlay: Text faellt durch (box-none), nur die Buttons fangen Taps —
          Taps auf leere Flaeche erreichen so den Play/Pause-Layer im Video. */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Ton-Toggle oben rechts */}
        <View style={[styles.topRow, { top: insetsTop + Spacing.two }]} pointerEvents="box-none">
          <Pressable
            style={styles.circleButton}
            onPress={onToggleMute}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={muted ? t('reels.unmute') : t('reels.mute')}
          >
            <IconSymbol name={muted ? 'volume-mute' : 'volume-high'} size={20} color={OVERLAY_TEXT} />
          </Pressable>
        </View>

        {/* Untere Info + Teilen */}
        <View
          style={[styles.bottomRow, { paddingBottom: insetsBottom + Spacing.four }]}
          pointerEvents="box-none"
        >
          <View style={styles.info} pointerEvents="none">
            {!!reel.series_title && (
              <ThemedText type="smallBold" style={styles.series} numberOfLines={1}>
                {reel.series_title}
              </ThemedText>
            )}
            {!!reel.title && (
              <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>
                {reel.title}
              </ThemedText>
            )}
            {!!reel.description && (
              <ThemedText type="small" style={styles.desc} numberOfLines={3}>
                {reel.description}
              </ThemedText>
            )}
          </View>

          <Pressable
            style={styles.shareButton}
            onPress={onShare}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('reels.share')}
          >
            <IconSymbol name="share-social" size={24} color={OVERLAY_TEXT} />
            <ThemedText type="small" style={styles.shareLabel}>
              {t('reels.share')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// --- Der eigentliche Video-Layer (haelt den Player) --------------------------

interface ReelVideoProps {
  reel: Reel;
  isActive: boolean;
  muted: boolean;
}

function ReelVideo({ reel, isActive, muted }: ReelVideoProps) {
  const player = useVideoPlayer(reel.video_url, (p: VideoPlayer) => {
    p.loop = true;
    p.muted = muted;
    p.timeUpdateEventInterval = 0.25;
  });

  // Play/Pause-Status direkt vom Player abonnieren (kein eigener State ->
  // kein set-state-in-effect). `player` ist ueber Renders stabil.
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
    oldIsPlaying: undefined,
  });

  // Aktiv <-> inaktiv: nur das sichtbare Reel spielt. Ein pausierter Nachbar
  // wird auf 0 zurueckgespult, damit er beim Draufwischen von vorn beginnt.
  useEffect(() => {
    if (isActive) {
      // eslint-disable-next-line react-hooks/immutability -- Video-Player ist ein externes, mutables Objekt
      player.currentTime = 0;
      player.play();
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [isActive, player]);

  // Ton global umschalten.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- Video-Player ist ein externes, mutables Objekt
    player.muted = muted;
  }, [muted, player]);

  // Fortschritt: nur der aktive Player feuert timeUpdate (Rest pausiert).
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const duration = player.duration;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const onTap = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      {/* Tap-Layer fuer Play/Pause (liegt unter dem Info-/Button-Overlay) */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} accessibilityRole="button" />
      {isActive && !isPlaying && (
        <View style={styles.pauseBadge} pointerEvents="none">
          <IconSymbol name="play" size={44} color={OVERLAY_TEXT} />
        </View>
      )}
      {/* Duenner Fortschrittsbalken ganz unten */}
      <View style={styles.progressTrack} pointerEvents="none">
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

// --- Kleine UI-Bausteine -----------------------------------------------------

function BackButton({ insetsTop }: { insetsTop: number }) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={[styles.backButton, { top: insetsTop + Spacing.two }]}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/lernen'))}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('reels.back')}
    >
      <IconSymbol name="chevron-back" size={24} color={OVERLAY_TEXT} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullDark: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  page: { backgroundColor: '#000' },
  placeholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topRow: { position: 'absolute', right: Spacing.three, flexDirection: 'row', gap: Spacing.two },
  bottomRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  info: { flex: 1, gap: Spacing.one },
  series: { color: Brand.gold },
  title: { color: OVERLAY_TEXT, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6 },
  desc: { color: OVERLAY_MUTED },
  shareButton: { alignItems: 'center', gap: 2, paddingVertical: Spacing.one },
  shareLabel: { color: OVERLAY_TEXT },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CONTROL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: Spacing.three,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CONTROL_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pauseBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressFill: { height: '100%', backgroundColor: Brand.gold },
  centerBox: { alignItems: 'center', paddingHorizontal: Spacing.four, gap: Spacing.two },
  stateTitle: { color: OVERLAY_TEXT, textAlign: 'center' },
  stateText: { color: OVERLAY_MUTED, textAlign: 'center' },
  retryButton: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: Brand.gold,
    minWidth: 120,
    alignItems: 'center',
  },
  retryLabel: { color: Brand.ink },
});
