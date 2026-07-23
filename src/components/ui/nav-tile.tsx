// Einheitliche Navigations-Kachel (Listen-Zeile) fuer Studium (Lernen-Tab) und
// „Mehr". Vorher hatten beide Screens eigene Raster mit unterschiedlicher
// Kachelgroesse/Icon-Badge/Padding — diese Komponente vereinheitlicht die
// Darstellung (gleiche Spaltenbreite, `IconBadge.row`, Padding, Chevron) ueber
// die bestehenden Theme-Tokens, ohne ein neues Designsystem einzufuehren.
import { StyleSheet, View } from 'react-native';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, IconBadge, Spacing } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';

export function NavTile({
  label,
  icon,
  index,
  onPress,
}: {
  label: string;
  icon: IconName;
  index: number;
  onPress: () => void;
}) {
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  return (
    <AnimatedListItem index={index} style={navTileStyles.item}>
      <PressableCard onPress={onPress} style={navTileStyles.row}>
        <View style={navTileStyles.left}>
          <ThemedView type="backgroundSelected" style={navTileStyles.iconBadge}>
            <IconSymbol name={icon} size={18} color={colors.accent} />
          </ThemedView>
          <ThemedText type="default" numberOfLines={2} style={navTileStyles.label}>
            {label}
          </ThemedText>
        </View>
        <DisclosureChevron size={18} color={colors.textSecondary} />
      </PressableCard>
    </AnimatedListItem>
  );
}

// Gemeinsame Raster-Styles: flexBasis 320 / minWidth 280 -> auf schmalen Screens
// 1 Spalte, auf Foldables/Tablets automatisch 2+ (identisch zu „Mehr").
export const navTileStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  item: { flexBasis: 320, minWidth: 280, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flex: 1, minWidth: 0 },
  label: { flex: 1, minWidth: 0 },
  iconBadge: {
    width: IconBadge.row,
    height: IconBadge.row,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
