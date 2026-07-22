import { router } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DisclosureChevron } from '@/components/ui/disclosure-chevron';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { ThemedSwitch } from '@/components/ui/themed-switch';
import { BackChipInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { rescheduleAdhkarReminders } from '@/features/duas/adhkarNotifications';
import { requestNotificationPermission } from '@/features/prayer-times/notifications';
import { useSettings } from '@/features/settings/store';
import {
  ADHKAR_EVENING_HOURS,
  ADHKAR_MORNING_HOURS,
  PRE_ADHAN_OFFSET_OPTIONS,
  REVIEW_REMINDER_HOUR_OPTIONS,
  VERSE_OF_DAY_HOUR_OPTIONS,
  type NotificationToggles,
} from '@/features/settings/types';
import { rescheduleVerseOfDayReminder } from '@/features/verseOfDay/notifications';
import { rescheduleWeeklySummary } from '@/features/weeklySummary/notifications';
import { useZakatReminder } from '@/features/zakat/reminder';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';
import { isRtlLocale } from '@/lib/locale-detect';

// Zentrale Übersicht ALLER Notification-Toggles der App — bisher verstreut
// über settings.tsx (Gebetszeiten/Pre-Adhan/Jumu'ah/Sunnah/Adhkar/Vers-des-
// Tages/Wiederholungs-Erinnerung/Wochenzusammenfassung) und zakat.tsx
// (Zakat-Stichtag). Bewusst KEINE eigene State-Verwaltung: liest/schreibt
// dieselben AppSettings-Felder bzw. den bestehenden useZakatReminder-Hook,
// die die einzelnen Feature-Screens bereits nutzen — reine UI-Konsolidierung,
// kein Ersatz für die Toggles dort (die bleiben erhalten). Reschedule-Aufrufe
// spiegeln exakt das Muster aus settings.tsx: Erinnerungen, die nur von
// Uhrzeit/Sprache abhängen (Vers-des-Tages/Adhkar/Wochenzusammenfassung),
// werden hier sofort neu geplant; Erinnerungen, die echte Gebetszeiten
// brauchen (Jumu'ah/Sunnah/Pre-Adhan) planen wie bisher erst beim nächsten
// Besuch des Gebetszeiten-Screens neu (components/prayer-times-screen.tsx).
// Die Reisen-Erinnerung (features/themes/journeyReminder.ts) hat KEINEN
// Schalter — auch im Original nicht, sie aktiviert sich automatisch, sobald
// eine Vers-Reise offen ist (app/themes/journeys/[id].tsx) — hier daher nur
// ein informativer Hinweis statt eines erfundenen Toggles.
const PRAYER_TOGGLE_LABELS: { id: keyof NotificationToggles; label: string }[] = [
  { id: 'fajr', label: 'Fajr' },
  { id: 'dhuhr', label: 'Dhuhr' },
  { id: 'asr', label: 'Asr' },
  { id: 'maghrib', label: 'Maghrib' },
  { id: 'isha', label: 'Isha' },
];

export default function NotificationsOverviewScreen() {
  const { settings, update } = useSettings();
  const { t, locale } = useTranslation();
  const rtl = isRtlLocale(locale);
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const { anchor: zakatAnchor, enabled: zakatEnabled, setEnabled: setZakatEnabled } = useZakatReminder(locale);

  async function toggleZakatReminder(next: boolean) {
    if (next && Platform.OS !== 'web') {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setZakatEnabled(next);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            {t('settings.notificationsOverview.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {t('settings.notificationsOverview.subtitle')}
          </ThemedText>

          <Section label={t('settings.notificationsOverview.groupPrayerTimes')} icon="moon-outline">
            {PRAYER_TOGGLE_LABELS.map((p) => (
              <ToggleRow
                key={p.id}
                rtl={rtl}
                label={p.label}
                hint={t('settings.notificationsOverview.prayerHint')}
                value={settings.notificationsEnabled[p.id]}
                onValueChange={(v) =>
                  update({ notificationsEnabled: { ...settings.notificationsEnabled, [p.id]: v } })
                }
              />
            ))}

            <ToggleRow
              rtl={rtl}
              label={t('settings.preAdhan.enable')}
              hint={t('settings.preAdhan.hint')}
              value={settings.preAdhanReminderEnabled}
              onValueChange={(v) => update({ preAdhanReminderEnabled: v })}
            />
            {settings.preAdhanReminderEnabled && (
              <ChipRow
                options={PRE_ADHAN_OFFSET_OPTIONS}
                selected={settings.preAdhanReminderOffset}
                onSelect={(min) => update({ preAdhanReminderOffset: min })}
                formatLabel={(min) => t('settings.preAdhan.minutes').replace('{n}', String(min))}
              />
            )}

            <ToggleRow
              rtl={rtl}
              label={t('settings.jumuah.enable')}
              hint={t('settings.jumuah.hint')}
              value={settings.jumuahReminderEnabled}
              onValueChange={(v) => update({ jumuahReminderEnabled: v })}
            />

            <ToggleRow
              rtl={rtl}
              label={t('settings.sunnah.duha')}
              hint={t('settings.sunnah.duhaHint')}
              value={settings.sunnahDuhaEnabled}
              onValueChange={(v) => update({ sunnahDuhaEnabled: v })}
            />
            <ToggleRow
              rtl={rtl}
              label={t('settings.sunnah.tahajjud')}
              hint={t('settings.sunnah.tahajjudHint')}
              value={settings.sunnahTahajjudEnabled}
              onValueChange={(v) => update({ sunnahTahajjudEnabled: v })}
            />
            <ToggleRow
              rtl={rtl}
              label={t('settings.sunnah.witr')}
              hint={t('settings.sunnah.witrHint')}
              value={settings.sunnahWitrEnabled}
              onValueChange={(v) => update({ sunnahWitrEnabled: v })}
            />
          </Section>

          <Section label={t('settings.notificationsOverview.groupQuran')} icon="book-outline">
            <ToggleRow
              rtl={rtl}
              label={t('settings.verseOfDay.enable')}
              hint={t('settings.verseOfDay.hint')}
              value={settings.verseOfDayReminderEnabled}
              onValueChange={(v) => {
                update({ verseOfDayReminderEnabled: v });
                rescheduleVerseOfDayReminder(
                  v,
                  settings.verseOfDayReminderHour,
                  settings.language,
                  settings.hadithLanguage,
                ).catch(() => {});
              }}
            />
            {settings.verseOfDayReminderEnabled && (
              <ChipRow
                options={VERSE_OF_DAY_HOUR_OPTIONS}
                selected={settings.verseOfDayReminderHour}
                onSelect={(h) => {
                  update({ verseOfDayReminderHour: h });
                  rescheduleVerseOfDayReminder(true, h, settings.language, settings.hadithLanguage).catch(() => {});
                }}
                formatLabel={(h) => `${h}:00`}
              />
            )}

            <ToggleRow
              rtl={rtl}
              label={t('settings.reviewReminder.enable')}
              hint={t('settings.reviewReminder.hint')}
              value={settings.reviewReminderEnabled}
              onValueChange={(v) => update({ reviewReminderEnabled: v })}
            />
            {settings.reviewReminderEnabled && (
              <ChipRow
                options={REVIEW_REMINDER_HOUR_OPTIONS}
                selected={settings.reviewReminderHour}
                onSelect={(hour) => update({ reviewReminderHour: hour })}
                formatLabel={(hour) => t(`settings.reviewReminder.hour${hour}`)}
              />
            )}

            <Pressable
              onPress={() => router.push('/themes')}
              style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.rowPressed]}>
              <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
                <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
                  <ThemedText type="default" style={rtl && styles.rtlText}>
                    {t('settings.notificationsOverview.journeyTitle')}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
                    {t('settings.notificationsOverview.journeyHint')}
                  </ThemedText>
                </View>
                <DisclosureChevron size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          </Section>

          <Section label={t('settings.notificationsOverview.groupOther')} icon="ellipsis-horizontal-circle-outline">
            <ToggleRow
              rtl={rtl}
              label={t('settings.adhkar.morning')}
              hint={t('settings.adhkar.morningHint')}
              value={settings.adhkarMorningEnabled}
              onValueChange={(v) => {
                update({ adhkarMorningEnabled: v });
                rescheduleAdhkarReminders({
                  morningEnabled: v,
                  morningHour: settings.adhkarMorningHour,
                  eveningEnabled: settings.adhkarEveningEnabled,
                  eveningHour: settings.adhkarEveningHour,
                  locale: settings.language,
                }).catch(() => {});
              }}
            />
            {settings.adhkarMorningEnabled && (
              <ChipRow
                options={ADHKAR_MORNING_HOURS}
                selected={settings.adhkarMorningHour}
                onSelect={(h) => {
                  update({ adhkarMorningHour: h });
                  rescheduleAdhkarReminders({
                    morningEnabled: settings.adhkarMorningEnabled,
                    morningHour: h,
                    eveningEnabled: settings.adhkarEveningEnabled,
                    eveningHour: settings.adhkarEveningHour,
                    locale: settings.language,
                  }).catch(() => {});
                }}
                formatLabel={(h) => `${h}:00`}
              />
            )}

            <ToggleRow
              rtl={rtl}
              label={t('settings.adhkar.evening')}
              hint={t('settings.adhkar.eveningHint')}
              value={settings.adhkarEveningEnabled}
              onValueChange={(v) => {
                update({ adhkarEveningEnabled: v });
                rescheduleAdhkarReminders({
                  morningEnabled: settings.adhkarMorningEnabled,
                  morningHour: settings.adhkarMorningHour,
                  eveningEnabled: v,
                  eveningHour: settings.adhkarEveningHour,
                  locale: settings.language,
                }).catch(() => {});
              }}
            />
            {settings.adhkarEveningEnabled && (
              <ChipRow
                options={ADHKAR_EVENING_HOURS}
                selected={settings.adhkarEveningHour}
                onSelect={(h) => {
                  update({ adhkarEveningHour: h });
                  rescheduleAdhkarReminders({
                    morningEnabled: settings.adhkarMorningEnabled,
                    morningHour: settings.adhkarMorningHour,
                    eveningEnabled: settings.adhkarEveningEnabled,
                    eveningHour: h,
                    locale: settings.language,
                  }).catch(() => {});
                }}
                formatLabel={(h) => `${h}:00`}
              />
            )}

            <ToggleRow
              rtl={rtl}
              label={t('zakat.reminder.title')}
              hint={t('zakat.reminder.desc')}
              value={zakatEnabled}
              onValueChange={toggleZakatReminder}
            />
            <Pressable
              onPress={() => router.push('/zakat')}
              style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
              <View style={[styles.linkRow, rtl && styles.switchRowRtl]}>
                <ThemedText type="small" themeColor="accent">
                  {t('settings.notificationsOverview.zakatManageLink')}
                </ThemedText>
                <DisclosureChevron size={14} color={colors.accent} />
              </View>
            </Pressable>
            {!zakatAnchor && zakatEnabled && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.zakatWarning}>
                {t('zakat.reminder.noAnchor')}
              </ThemedText>
            )}

            <ToggleRow
              rtl={rtl}
              label={t('settings.weeklySummary.enable')}
              hint={t('settings.weeklySummary.hint')}
              value={settings.weeklySummaryReminderEnabled}
              onValueChange={(v) => {
                update({ weeklySummaryReminderEnabled: v });
                rescheduleWeeklySummary(v, settings.language).catch(() => {});
              }}
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ToggleRow({
  rtl,
  label,
  hint,
  value,
  onValueChange,
}: {
  rtl: boolean;
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.switchRow, rtl && styles.switchRowRtl]}>
      <View style={[styles.switchLabel, rtl && styles.switchLabelRtl]}>
        <ThemedText type="default" style={rtl && styles.rtlText}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={rtl && styles.rtlText}>
          {hint}
        </ThemedText>
      </View>
      <ThemedSwitch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function ChipRow<T extends number>({
  options,
  selected,
  onSelect,
  formatLabel,
}: {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  formatLabel: (value: T) => string;
}) {
  return (
    <View style={styles.hourRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          style={({ pressed }) => [Platform.OS === 'web' ? styles.pressableWeb : undefined, pressed && styles.pressed]}>
          <ThemedView type={selected === opt ? 'backgroundSelected' : 'backgroundElement'} style={styles.hourChip}>
            <ThemedText type="small" themeColor={selected === opt ? 'accent' : 'text'}>
              {formatLabel(opt)}
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
    </View>
  );
}

function Section({ label, icon, children }: { label: string; icon: IconName; children: React.ReactNode }) {
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedView type="backgroundElement" style={styles.sectionIconBadge}>
          <IconSymbol name={icon} size={13} color={colors.accent} />
        </ThemedView>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
          {label.toUpperCase()}
        </ThemedText>
      </View>
      <ThemedView type="backgroundElement" style={styles.sectionBody}>
        {children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three + BackChipInset },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: { textAlign: 'center', marginBottom: Spacing.half },
  subtitle: { textAlign: 'center', marginBottom: Spacing.two },
  section: { gap: Spacing.one },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  sectionIconBadge: { width: 20, height: 20, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { letterSpacing: 0.5 },
  sectionBody: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,124,116,0.35)',
  },
  switchRowRtl: { flexDirection: 'row-reverse' },
  switchLabel: { flex: 1, gap: 2, paddingRight: Spacing.two },
  switchLabelRtl: { paddingRight: 0, paddingLeft: Spacing.two },
  rtlText: { textAlign: 'right' },
  hourRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,124,116,0.35)',
  },
  hourChip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: 999 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,124,116,0.35)',
  },
  zakatWarning: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  rowPressed: { opacity: 0.6 },
  pressed: { opacity: 0.6 },
  pressableWeb: { cursor: 'pointer' },
});
