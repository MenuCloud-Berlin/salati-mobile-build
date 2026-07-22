// Wochen-Rückblick: "Diese Woche gelernt" als eigener Screen vom Studium-Hub
// aus erreichbar, mit Share-Card (Web) im selben Muster wie der Gebets-
// Tracker (features/tracker/statsImage.ts).
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { loadWeeklyReview, type WeeklyReview } from '@/features/study/weeklyReview';
import { canShareWeeklyReviewImage, shareWeeklyReviewImage } from '@/features/study/weeklyReviewImage';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

export default function WeeklyReviewScreen() {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const [review, setReview] = useState<WeeklyReview | 'loading'>('loading');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadWeeklyReview().then((r) => {
        if (!cancelled) setReview(r);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (review === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.center}>
          <ThemedActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const bestPercent = review.bestRatio !== null ? Math.round(review.bestRatio * 100) : null;
  const isEmpty = review.lessonsCompleted === 0 && review.questionsAnswered === 0;

  const stats = [
    { key: 'lessons', icon: 'book' as const, value: String(review.lessonsCompleted), label: t('study.weeklyReview.lessons') },
    { key: 'questions', icon: 'help-circle' as const, value: String(review.questionsAnswered), label: t('study.weeklyReview.questions') },
    {
      key: 'best',
      icon: 'trophy' as const,
      value: bestPercent !== null ? `${bestPercent}%` : '—',
      label: t('study.weeklyReview.best'),
    },
    { key: 'streak', icon: 'flame' as const, value: String(review.streak), label: t('study.weeklyReview.streak') },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('study.weeklyReview.title')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {t('study.weeklyReview.subtitle')}
        </ThemedText>

        {isEmpty ? (
          <View style={styles.emptyBox}>
            <ThemedText style={styles.emptyEmoji}>🌱</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              {t('study.weeklyReview.empty')}
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {stats.map((stat, index) => (
                <AnimatedListItem key={stat.key} index={index} style={styles.cardWrap}>
                  <ThemedView type="backgroundElement" style={styles.card}>
                    <View style={[styles.iconCircle, { borderColor: Brand.gold }]}>
                      <IconSymbol name={stat.icon} size={20} color={Brand.gold} />
                    </View>
                    <ThemedText type="subtitle" themeColor="accent" style={styles.cardValue}>
                      {stat.value}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.cardLabel}>
                      {stat.label}
                    </ThemedText>
                  </ThemedView>
                </AnimatedListItem>
              ))}
            </View>

            {canShareWeeklyReviewImage && (
              <Pressable
                onPress={() =>
                  shareWeeklyReviewImage({
                    title: t('study.weeklyReview.title'),
                    subtitle: t('study.weeklyReview.subtitle'),
                    stats: stats.map((s) => ({ label: s.label, value: s.value })),
                  }).catch(() => {})
                }
                accessibilityRole="button"
                accessibilityLabel={t('study.weeklyReview.shareImage')}
                style={({ pressed }) => [
                  styles.shareButton,
                  Platform.OS === 'web' ? styles.pressableWeb : undefined,
                  pressed && styles.pressed,
                ]}>
                <ThemedView type="backgroundSelected" style={styles.shareButtonInner}>
                  <IconSymbol name="share-outline" size={18} color={colors.accent} />
                  <ThemedText type="smallBold" themeColor="accent">
                    {t('study.weeklyReview.shareImage')}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            )}
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset, paddingHorizontal: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
  emptyBox: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.five, paddingTop: Spacing.six },
  emptyEmoji: { fontSize: 44, lineHeight: 60 },
  emptyText: { textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  cardWrap: { flexBasis: '47%', flexGrow: 1 },
  card: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    minHeight: 150,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  cardValue: { textAlign: 'center' },
  cardLabel: { textAlign: 'center' },
  shareButton: { alignSelf: 'center', marginTop: Spacing.four },
  shareButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  pressableWeb: { cursor: 'pointer' },
  pressed: { opacity: 0.6 },
});
