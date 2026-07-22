import { router } from 'expo-router';
import { FlatList, Pressable, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { COLLECTIONS } from '@/features/hadith/api';
import { hadithOfTheDay, useHadithCollection } from '@/features/hadith/hooks';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useSettings } from '@/features/settings/store';
import { useTranslation } from '@/lib/i18n';

export default function HadithScreen() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  // An-Nawawi 40: klein, kuratiert, keine Themen-Auswahl nötig — passend für
  // eine tägliche Reflexion (analog zu wisdomOfTheDay()).
  const { data: nawawi } = useHadithCollection('nawawi', settings.hadithLanguage);
  const today = nawawi ? hadithOfTheDay(nawawi.hadiths) : undefined;

  function shareToday() {
    if (!today) return;
    Share.share({
      message: `${today.arabic}\n\n${today.translation}\n\n— ${t('hadith.todaySource').replace('{n}', String(today.hadithnumber))}`,
    }).catch(() => {});
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.title}>
            {t('nav.hadith')}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/hadith/search')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.search')}
            style={styles.searchIcon}>
            <IconSymbol name="search" size={20} color={colors.accent} />
          </Pressable>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {t('hadith.languagesNote')}
        </ThemedText>

        <FlatList
          data={COLLECTIONS}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            today ? (
              <PressableCard
                onPress={() =>
                  router.push({
                    pathname: '/hadith/[collection]/[number]',
                    params: { collection: 'nawawi', number: String(today.hadithnumber) },
                  })
                }
                type="backgroundSelected"
                style={styles.todayCard}>
                <View style={styles.todayLabel}>
                  <IconSymbol name="sparkles" size={14} color={colors.accent} />
                  <ThemedText type="smallBold" themeColor="accent">
                    {t('hadith.today')}
                  </ThemedText>
                </View>
                <ThemedText style={styles.arabic} numberOfLines={3}>
                  {today.arabic}
                </ThemedText>
                <ThemedText type="default" numberOfLines={4}>
                  {today.translation}
                </ThemedText>
                <View style={styles.sourceRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    — {t('hadith.todaySource').replace('{n}', String(today.hadithnumber))}
                  </ThemedText>
                  <Pressable onPress={shareToday} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('wisdom.share')}>
                    <IconSymbol name="share-outline" size={13} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </PressableCard>
            ) : null
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <PressableCard
                onPress={() => router.push({ pathname: '/hadith/[collection]', params: { collection: item.id } })}
                style={styles.row}>
                <ThemedText type="default">{item.name}</ThemedText>
                <DisclosureChevron size={18} color={colors.textSecondary} />
              </PressableCard>
            </AnimatedListItem>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  searchIcon: { position: 'absolute', right: Spacing.four },
  subtitle: { textAlign: 'center', marginBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth, },
  todayCard: { padding: Spacing.four, gap: Spacing.two, marginBottom: Spacing.two },
  todayLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arabic: { fontSize: 20, lineHeight: 34, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
  },
});
