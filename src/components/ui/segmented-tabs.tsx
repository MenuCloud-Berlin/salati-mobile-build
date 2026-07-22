// Kleiner Pill-Umschalter für zwei bis drei gleichrangige Ansichten
// innerhalb eines Screens (z. B. Themen-Sammlungen vs. Tages-Pläne).
// Bewusst generisch statt feature-spezifisch, damit er auch anderswo
// wiederverwendbar bleibt.
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export interface SegmentedTab {
  key: string;
  label: string;
}

export interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function SegmentedTabs({ tabs, activeKey, onChange }: SegmentedTabsProps) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
            <ThemedView type={active ? 'backgroundSelected' : 'backgroundElement'} style={styles.pill}>
              <ThemedText type="smallBold" themeColor={active ? 'accent' : 'textSecondary'}>
                {tab.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  pressableWeb: { cursor: 'pointer' },
  pressed: { opacity: 0.7 },
});
