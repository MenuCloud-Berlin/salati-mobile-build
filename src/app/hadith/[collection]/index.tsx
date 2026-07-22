import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { COLLECTIONS } from '@/features/hadith/api';
import { useHadithBooks, useHadithCollection, useHadithSearch } from '@/features/hadith/hooks';
import { useSettings } from '@/features/settings/store';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';
import { isRtlLocale } from '@/lib/locale-detect';

// Ohne generateStaticParams rendert `expo export --platform web` diese Route
// nur als EIN generisches, parameterloses Template — der Server kennt
// collection dabei nicht (COLLECTIONS.find(...) -> undefined), der Titel
// bleibt leer. Der Client liest collection danach aus der echten URL und
// rendert den echten Sammlungsnamen — Server- und Client-Markup weichen
// voneinander ab (React #418, gleiches Muster wie study/[course]/index.tsx).
export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ collection: c.id }));
}

export default function HadithCollectionScreen() {
  const { collection } = useLocalSearchParams<{ collection: string }>();
  const { settings, update } = useSettings();
  const { t, locale } = useTranslation();
  const rtl = isRtlLocale(locale);
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  const meta = COLLECTIONS.find((c) => c.id === collection);
  const { data, isLoading, isError } = useHadithCollection(collection, settings.hadithLanguage);
  const books = useHadithBooks(data?.hadiths, data?.meta.sections);
  const searched = useHadithSearch(data?.hadiths, query);
  const filtered =
    query.trim() === '' && selectedBook !== null
      ? searched.filter((h) => h.reference.book === selectedBook)
      : searched;
  const showBookList = query.trim() === '' && selectedBook === null && books.length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {meta?.name ?? collection}
          </ThemedText>
          <Pressable
            onPress={() =>
              update({
                hadithLanguage:
                  settings.hadithLanguage === 'en' ? 'tr' : settings.hadithLanguage === 'tr' ? 'ar' : 'en',
              })
            }
            style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.chipPressed]}>
            <ThemedView type="backgroundElement" style={styles.langChip}>
              <ThemedText type="small">
                {settings.hadithLanguage === 'ar' ? 'عربي' : settings.hadithLanguage === 'tr' ? 'TR' : 'EN'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (text.trim() !== '') setSelectedBook(null);
          }}
          placeholder={t('common.search')}
          placeholderTextColor={colors.textSecondary}
          style={[styles.search, { color: colors.text }]}
        />

        {selectedBook !== null && query.trim() === '' && (
          <Pressable
            onPress={() => setSelectedBook(null)}
            style={({ pressed }) => [styles.backToBooks, rtl && styles.backToBooksRtl, pressed && styles.chipPressed]}>
            <IconSymbol name={rtl ? 'chevron-forward' : 'chevron-back'} size={16} color={colors.accent} />
            <ThemedText type="small" themeColor="accent">
              {t('hadith.backToBooks')}
            </ThemedText>
          </Pressable>
        )}

        {isLoading && (
          <View style={styles.center}>
            <ThemedActivityIndicator />
          </View>
        )}
        {isError && (
          <View style={styles.center}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('hadith.loadError')}
            </ThemedText>
          </View>
        )}

        {data && showBookList && (
          <FlatList
            data={books}
            keyExtractor={(b) => String(b.book)}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                <PressableCard onPress={() => setSelectedBook(item.book)} style={styles.bookRow}>
                  <ThemedText type="small" numberOfLines={2} style={styles.bookTitle}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.count}
                  </ThemedText>
                </PressableCard>
              </AnimatedListItem>
            )}
          />
        )}

        {data && !showBookList && (
          <FlatList
            data={filtered}
            keyExtractor={(h) => String(h.hadithnumber)}
            contentContainerStyle={styles.list}
            renderItem={({ item, index }) => (
              <AnimatedListItem index={index}>
                <PressableCard
                  onPress={() =>
                    router.push({
                      pathname: '/hadith/[collection]/[number]',
                      params: { collection, number: String(item.hadithnumber) },
                    })
                  }
                  style={styles.row}>
                  <ThemedText type="small" themeColor="textSecondary">
                    #{item.hadithnumber}
                  </ThemedText>
                  <ThemedText type="small" numberOfLines={2}>
                    {item.translation || item.arabic}
                  </ThemedText>
                </PressableCard>
              </AnimatedListItem>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  title: { textAlign: 'center' },
  langChip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
  search: {
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  center: { alignItems: 'center', paddingVertical: Spacing.five },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth, },
  row: { padding: Spacing.three, gap: Spacing.one },
  bookRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three },
  bookTitle: { flex: 1, marginRight: Spacing.two },
  backToBooks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  backToBooksRtl: { flexDirection: 'row-reverse' },
  chipPressed: { opacity: 0.6 },
  pressableWeb: { cursor: 'pointer' },
});
