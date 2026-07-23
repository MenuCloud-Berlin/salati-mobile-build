// „Lernen"-Tab (Studium): prominenter Einstieg fuer die Lerninhalte. Das Raster
// ist jetzt EINHEITLICH mit dem „Mehr"-Tab (gemeinsame NavTile-Komponente,
// gleiche Kachelgroesse/Icon-Badge/Padding/Spalten) und speist sich aus EINER
// gemeinsamen Liste (lib/lernenNav.ts), sodass dieselben Eintraege auch im
// „Mehr"-Tab als Verknuepfung erscheinen. Podcast/Videos/Reels liegen nicht
// mehr einzeln hier, sondern gebuendelt hinter der ersten „Medien"-Kachel, die
// den Medien-Hub (/media) oeffnet.
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NavTile, navTileStyles } from '@/components/ui/nav-tile';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { LERNEN_NAV } from '@/lib/lernenNav';
import { useTranslation } from '@/lib/i18n';

export default function LernenScreen() {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {t('nav.lernen')}
        </ThemedText>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View style={navTileStyles.grid}>
            {LERNEN_NAV.map((item, index) => (
              <NavTile
                key={item.href}
                index={index}
                label={t(item.labelKey)}
                icon={item.icon}
                onPress={() => router.push(item.href)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  title: { textAlign: 'center', marginBottom: Spacing.three },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
