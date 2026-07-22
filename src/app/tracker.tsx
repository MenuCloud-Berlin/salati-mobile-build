import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  PRAYER_IDS,
  completedCount,
  currentStreak,
  dayKey,
  lastDays,
  useTracker,
} from '@/features/tracker/store';
import { usePrayerQadaCount } from '@/features/tracker/qada';
import { TARAWEEH_STEP, taraweehNightsCount, taraweehTotal, useTaraweehTracker } from '@/features/tracker/taraweeh';
import { canShareStatsImage, shareStatsImage } from '@/features/tracker/statsImage';
import { isRamadanMonth } from '@/features/fasting/store';
import { useTimings } from '@/features/prayer-times/hooks';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { hapticLight } from '@/lib/haptics';
import { useTranslation } from '@/lib/i18n';
import { isRtlLocale } from '@/lib/locale-detect';

const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export default function TrackerScreen() {
  const { data, toggle } = useTracker();
  const { data: qadaData, total: qadaTotal, change: changeQada } = usePrayerQadaCount();
  const { data: taraweehData, change: changeTaraweeh } = useTaraweehTracker();
  const { data: timings } = useTimings();
  const { t, locale } = useTranslation();
  const rtl = isRtlLocale(locale);
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const now = new Date();
  const today = dayKey(now);
  const streak = currentStreak(data, now);
  const week = lastDays(data, now, 7);
  // Taraweeh-Karte nur während Ramadan sichtbar — dieselbe Erkennung wie die
  // Home-Dashboard-Karte (fasting/store.ts, prayer-times-screen.tsx).
  const isRamadan = !!timings?.hijri && isRamadanMonth(timings.hijri.month.number);
  const taraweehTonight = taraweehData[today] ?? 0;
  const taraweehNights = taraweehNightsCount(taraweehData);
  const taraweehTotalRakaat = taraweehTotal(taraweehData);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            {t('tracker.title')}
          </ThemedText>
          <View style={styles.subtitleRow}>
            {streak > 0 && <IconSymbol name="flame" size={14} color={colors.accent} />}
            <ThemedText type="small" themeColor={streak > 0 ? 'accent' : 'textSecondary'}>
              {streak > 0
                ? `${streak} ${streak === 1 ? t('tracker.streakDayOne') : t('tracker.streakDays')}`
                : t('tracker.subtitle')}
            </ThemedText>
            {canShareStatsImage && (
              <Pressable
                onPress={() =>
                  shareStatsImage({
                    title: t('tracker.title'),
                    streakLabel: `${streak} ${streak === 1 ? t('tracker.streakDayOne') : t('tracker.streakDays')}`,
                    todayLabel: `${t('tracker.today')}: ${completedCount(data, today)}/5`,
                    week: week.map((d) => ({ label: d.day.slice(8), done: d.done })),
                  }).catch(() => {})
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('tracker.shareStats')}
                style={({ pressed }) => [
                  Platform.OS === 'web' ? styles.pressableWeb : undefined,
                  pressed && styles.pressed,
                ]}>
                <IconSymbol name="share-outline" size={14} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardLabel}>
              {t('tracker.today')} · {completedCount(data, today)}/5
            </ThemedText>
            {PRAYER_IDS.map((p, index) => {
              const done = !!data[today]?.[p];
              return (
                <AnimatedListItem key={p} index={index}>
                  <Pressable
                    onPress={() => {
                      // Nur beim Setzen (nicht beim Entfernen) des Häkchens -
                      // leichtes Feedback für den positiven Moment.
                      if (!done) hapticLight();
                      toggle(today, p);
                    }}
                    style={({ pressed }) => [
                      Platform.OS === 'web' ? styles.pressableWeb : undefined,
                      pressed && styles.pressed,
                    ]}>
                    <View style={[styles.prayerRow, rtl && styles.prayerRowRtl]}>
                      <ThemedText type="default" style={rtl && styles.rtlText}>
                        {PRAYER_LABELS[p]}
                      </ThemedText>
                      <ThemedView
                        type={done ? 'backgroundSelected' : 'backgroundElement'}
                        style={[styles.checkCircle, done && styles.checkDone]}>
                        {done && <IconSymbol name="checkmark" size={16} color={colors.accent} />}
                      </ThemedView>
                    </View>
                  </Pressable>
                </AnimatedListItem>
              );
            })}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={[styles.qadaHeaderRow, rtl && styles.qadaHeaderRowRtl]}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardLabel}>
                {t('tracker.qada.title')}
              </ThemedText>
              <ThemedText type="smallBold" themeColor={qadaTotal > 0 ? 'accent' : 'textSecondary'}>
                {t('tracker.qada.total').replace('{n}', String(qadaTotal))}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
              {t('tracker.qada.desc')}
            </ThemedText>
            {PRAYER_IDS.map((p) => (
              <View key={p} style={[styles.qadaPrayerRow, rtl && styles.qadaPrayerRowRtl]}>
                <ThemedText type="default" style={[styles.qadaPrayerLabel, rtl && styles.rtlText]}>
                  {PRAYER_LABELS[p]}
                </ThemedText>
                <View style={styles.qadaRow}>
                  <Pressable
                    onPress={() => changeQada(p, -1)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('tracker.qada.decrease')} – ${PRAYER_LABELS[p]}`}
                    style={({ pressed }) => [
                      Platform.OS === 'web' ? styles.pressableWeb : undefined,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedView type="backgroundSelected" style={styles.qadaButtonSmall}>
                      <IconSymbol name="remove" size={16} color={colors.accent} />
                    </ThemedView>
                  </Pressable>
                  <ThemedText style={styles.qadaCountSmall}>{qadaData[p]}</ThemedText>
                  <Pressable
                    onPress={() => changeQada(p, 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('tracker.qada.increase')} – ${PRAYER_LABELS[p]}`}
                    style={({ pressed }) => [
                      Platform.OS === 'web' ? styles.pressableWeb : undefined,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedView type="backgroundSelected" style={styles.qadaButtonSmall}>
                      <IconSymbol name="add" size={16} color={colors.accent} />
                    </ThemedView>
                  </Pressable>
                </View>
              </View>
            ))}
            {qadaTotal === 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.qadaEmpty}>
                {t('tracker.qada.none')}
              </ThemedText>
            )}
          </ThemedView>

          {isRamadan && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardLabel}>
                {t('tracker.taraweeh.title')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                {t('tracker.taraweeh.desc')}
              </ThemedText>
              <View style={[styles.qadaPrayerRow, rtl && styles.qadaPrayerRowRtl]}>
                <ThemedText type="default" style={[styles.qadaPrayerLabel, rtl && styles.rtlText]}>
                  {t('tracker.taraweeh.tonight')}
                </ThemedText>
                <View style={styles.qadaRow}>
                  <Pressable
                    onPress={() => changeTaraweeh(today, -TARAWEEH_STEP)}
                    accessibilityRole="button"
                    accessibilityLabel={t('tracker.taraweeh.decrease')}
                    style={({ pressed }) => [
                      Platform.OS === 'web' ? styles.pressableWeb : undefined,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedView type="backgroundSelected" style={styles.qadaButtonSmall}>
                      <IconSymbol name="remove" size={16} color={colors.accent} />
                    </ThemedView>
                  </Pressable>
                  <ThemedText style={styles.qadaCountSmall}>{taraweehTonight}</ThemedText>
                  <Pressable
                    onPress={() => changeTaraweeh(today, TARAWEEH_STEP)}
                    accessibilityRole="button"
                    accessibilityLabel={t('tracker.taraweeh.increase')}
                    style={({ pressed }) => [
                      Platform.OS === 'web' ? styles.pressableWeb : undefined,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedView type="backgroundSelected" style={styles.qadaButtonSmall}>
                      <IconSymbol name="add" size={16} color={colors.accent} />
                    </ThemedView>
                  </Pressable>
                </View>
              </View>
              {taraweehNights > 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.qadaEmpty}>
                  {t('tracker.taraweeh.summary')
                    .replace('{nights}', String(taraweehNights))
                    .replace('{total}', String(taraweehTotalRakaat))}
                </ThemedText>
              )}
            </ThemedView>
          )}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardLabel}>
              {t('tracker.week')}
            </ThemedText>
            <View style={[styles.weekRow, rtl && styles.weekRowRtl]}>
              {week.map((d) => (
                <View key={d.day} style={styles.weekDay}>
                  <View style={styles.weekBarTrack}>
                    <View style={[styles.weekBarFill, { height: `${(d.done / 5) * 100}%` }]} />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {d.day.slice(8)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth, },
  title: { textAlign: 'center' },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.one,
  },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  cardLabel: { letterSpacing: 0.5 },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  prayerRowRtl: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right' },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,124,116,0.35)',
  },
  checkDone: { borderColor: Brand.gold },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekRowRtl: { flexDirection: 'row-reverse' },
  weekDay: { alignItems: 'center', gap: Spacing.one },
  weekBarTrack: {
    width: 16,
    height: 64,
    borderRadius: 8,
    backgroundColor: 'rgba(128,124,116,0.18)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weekBarFill: { width: '100%', backgroundColor: Brand.gold, borderRadius: 8 },
  pressableWeb: { cursor: 'pointer' },
  pressed: { opacity: 0.6 },
  qadaHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qadaHeaderRowRtl: { flexDirection: 'row-reverse' },
  qadaPrayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  qadaPrayerRowRtl: { flexDirection: 'row-reverse' },
  qadaPrayerLabel: { flex: 1 },
  qadaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  qadaButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qadaCountSmall: { fontSize: 18, lineHeight: 22, fontWeight: '600', minWidth: 28, textAlign: 'center' },
  qadaEmpty: { textAlign: 'center' },
});
