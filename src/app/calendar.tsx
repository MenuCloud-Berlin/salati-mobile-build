import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/screen-header';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHijriMonth } from '@/features/calendar/hooks';
import { islamicDayKeys } from '@/features/calendar/islamicDays';
import { gregorianToHijriOffline, HIJRI_MONTHS } from '@/features/calendar/offline';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

const WEEKDAY_KEYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];

interface DayCell {
  date: number;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  holidays: string[];
  isToday: boolean;
}

export default function CalendarScreen() {
  const { t, locale } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const hijriMonths = HIJRI_MONTHS[locale];
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-12
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const { data, isLoading, isError } = useHijriMonth(viewMonth, viewYear);

  const days: DayCell[] = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

    if (data) {
      return data.map((d) => ({
        date: Number(d.gregorian.day),
        hijriDay: Number(d.hijri.day),
        hijriMonth: d.hijri.month.number,
        hijriYear: Number(d.hijri.year),
        // Eigene kuratierte Tage statt d.hijri.holidays (nur Englisch +
        // tradition-spezifische Urs-Einträge, siehe islamicDays.ts).
        holidays: islamicDayKeys(d.hijri.month.number, Number(d.hijri.day)),
        isToday:
          Number(d.gregorian.day) === today.getDate() &&
          viewMonth === today.getMonth() + 1 &&
          viewYear === today.getFullYear(),
      }));
    }

    // Offline-Fallback: lokal berechnen (siehe Disclaimer in der UI)
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const h = gregorianToHijriOffline(new Date(viewYear, viewMonth - 1, d));
      return {
        date: d,
        hijriDay: h.day,
        hijriMonth: h.month,
        hijriYear: h.year,
        holidays: islamicDayKeys(h.month, h.day),
        isToday: d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear(),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, viewMonth, viewYear]);

  const leadingBlanks = (new Date(viewYear, viewMonth - 1, 1).getDay() + 6) % 7; // Mo=0
  const holidaysThisMonth = days.filter((d) => d.holidays.length > 0);

  function goPrev() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNext() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AnimatedListItem index={0}>
          <ScreenHeader title={t('nav.calendar')} />
        </AnimatedListItem>

        {isError && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
            {t('calendar.offlineNotice')}
          </ThemedText>
        )}

        <AnimatedListItem index={1} style={styles.nav}>
          <Pressable
            onPress={goPrev}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.previousMonth')}
            style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
            <IconSymbol name="chevron-back" size={22} color={colors.accent} />
          </Pressable>
          <ThemedText type="default">
            {t(`calendar.months.${viewMonth}`)} {viewYear}
          </ThemedText>
          <Pressable
            onPress={goNext}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.nextMonth')}
            style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
            <IconSymbol name="chevron-forward" size={22} color={colors.accent} />
          </Pressable>
        </AnimatedListItem>

        {isLoading && (
          <View style={styles.center}>
            <ThemedActivityIndicator />
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll}>
          <AnimatedListItem index={2}>
            <View style={styles.weekdayRow}>
              {WEEKDAY_KEYS.map((w) => (
                <ThemedText key={w} type="small" themeColor="textSecondary" style={styles.cell}>
                  {t(`calendar.weekdays.${w}`)}
                </ThemedText>
              ))}
            </View>
            <View style={styles.grid}>
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <View key={`blank-${i}`} style={styles.cell} />
              ))}
              {days.map((d) => (
                <ThemedView
                  key={d.date}
                  type={d.isToday ? 'backgroundSelected' : undefined}
                  style={[styles.cell, styles.dayCell]}>
                  <ThemedText type={d.isToday ? 'smallBold' : 'small'} themeColor={d.isToday ? 'accent' : 'text'}>
                    {d.date}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.hijriDay}>
                    {d.hijriDay}
                  </ThemedText>
                </ThemedView>
              ))}
            </View>
          </AnimatedListItem>

          <View style={styles.legend}>
            <ThemedText type="small" themeColor="textSecondary">
              {/* Ein Gregorianischer Monat überspannt fast immer zwei
                  Hijri-Monate - beide nennen statt nur den ersten
                  (Audit 2026-07-19 B9). */}
              {(() => {
                const first = days[0];
                const last = days[days.length - 1];
                if (!first) return '';
                const firstName = hijriMonths[first.hijriMonth - 1] ?? '';
                const lastName = hijriMonths[(last?.hijriMonth ?? first.hijriMonth) - 1] ?? '';
                const months = firstName === lastName ? firstName : `${firstName} / ${lastName}`;
                const years =
                  first.hijriYear === (last?.hijriYear ?? first.hijriYear)
                    ? String(first.hijriYear)
                    : `${first.hijriYear}/${last?.hijriYear}`;
                return `${months} ${years}`;
              })()}{' '}
              {t('calendar.hijriSuffix')}
            </ThemedText>
          </View>

          {holidaysThisMonth.length > 0 && (
            <AnimatedListItem index={3}>
              <ThemedView type="backgroundElement" style={styles.holidays}>
                <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>
                  {t('calendar.holidaysThisMonth')}
                </ThemedText>
                {holidaysThisMonth.map((d) => (
                  <ThemedText key={d.date} type="small" themeColor="textSecondary">
                    {d.date}. {t(`calendar.months.${viewMonth}`)} —{' '}
                    {d.holidays.map((k) => t(`calendar.days.${k}`)).join(', ')}
                  </ThemedText>
                ))}
              </ThemedView>
            </AnimatedListItem>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            {t('calendar.sightingNotice')}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  notice: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.two },
  center: { alignItems: 'center', paddingVertical: Spacing.four },
  nav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.five,
    marginBottom: Spacing.three,
  },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth, },
  weekdayRow: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: Spacing.one },
  dayCell: { borderRadius: Spacing.two },
  hijriDay: { fontSize: 11 },
  legend: { alignItems: 'center', marginTop: Spacing.three },
  holidays: { borderRadius: Spacing.three, padding: Spacing.three, marginTop: Spacing.four },
  disclaimer: { textAlign: 'center', marginTop: Spacing.four, paddingHorizontal: Spacing.three },
  pressableWeb: { cursor: 'pointer' },
  pressed: { opacity: 0.6 },
});
