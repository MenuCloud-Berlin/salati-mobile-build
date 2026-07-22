import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { HubBanner } from '@/components/hub-banner';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { DUA_CATEGORIES, categoryLabel, duasForCategory } from '@/features/duas/hooks';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

const CATEGORY_ICONS: Record<string, IconName> = {
  morning: 'sunny',
  evening: 'moon',
  prayer: 'body',
  eating: 'restaurant',
  sleep: 'bed',
  home: 'home',
  mosque: 'location',
  travel: 'airplane',
  protection: 'shield-checkmark',
  forgiveness: 'heart',
  distress: 'alert-circle',
  illness: 'medkit',
  family: 'people',
  quran: 'book',
  daily: 'calendar',
};

export default function DuasScreen() {
  const { t, locale } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('nav.duas')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {t('duas.offlineNote')}
        </ThemedText>

        <FlatList
          data={DUA_CATEGORIES}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<HubBanner source={require('../../../assets/images/guides/beads.jpg')} noPadding />}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <PressableCard
                onPress={() => router.push({ pathname: '/duas/[category]', params: { category: item.id } })}
                style={styles.row}>
                <ThemedView type="backgroundSelected" style={styles.iconBadge}>
                  <IconSymbol name={CATEGORY_ICONS[item.id] ?? 'hand-left'} size={16} color={colors.accent} />
                </ThemedView>
                <View style={styles.rowText}>
                  <ThemedText type="default">{categoryLabel(item.id, locale)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {duasForCategory(item.id).length === 1
                      ? t('duas.countOne')
                      : t('duas.countMany').replace('{n}', String(duasForCategory(item.id).length))}
                  </ThemedText>
                </View>
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
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth, },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: Spacing.half },
});
