import { useLocalSearchParams } from 'expo-router';
import { FlatList, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { categoryLabel, DUA_CATEGORIES, duaTranslation, duasForCategory } from '@/features/duas/hooks';
import { useTranslation } from '@/lib/i18n';

// Ohne generateStaticParams rendert `expo export --platform web` diese Route
// nur als EIN generisches, parameterloses Template — category ist dabei
// leer, categoryLabel('') liefert einen anderen Titel als der Client (der
// die echte category aus der URL liest) — Server- und Client-Markup weichen
// voneinander ab (React #418, gleiches Muster wie study/[course]/index.tsx).
export function generateStaticParams() {
  return DUA_CATEGORIES.map((c) => ({ category: c.id }));
}

export default function DuaCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const duas = duasForCategory(category ?? '');
  const { locale } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {categoryLabel(category ?? '', locale)}
        </ThemedText>

        <FlatList
          data={duas}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="default" style={styles.arabic}>
                  {item.arabic}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.transliteration}>
                  {item.transliteration}
                </ThemedText>
                {duaTranslation(item, locale) && (
                  <ThemedText type="default">{duaTranslation(item, locale)}</ThemedText>
                )}
                <ThemedText type="small" themeColor="textSecondary" style={styles.source}>
                  {item.source}
                </ThemedText>
              </ThemedView>
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
  title: { textAlign: 'center', marginBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth, },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(11,11,13,0.06), 0 1px 2px rgba(11,11,13,0.08)' },
      default: {
        shadowColor: '#0b0b0d',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  arabic: { fontSize: 22, textAlign: 'right', lineHeight: 36 },
  transliteration: { fontStyle: 'italic' },
  source: { marginTop: Spacing.one },
});
