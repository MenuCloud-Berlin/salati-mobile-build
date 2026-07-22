import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenHeader } from '@/components/screen-header';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { exportProgressCode, importProgressCode } from '@/features/sync/codeSync';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

type ImportState = { kind: 'idle' } | { kind: 'success'; count: number } | { kind: 'error' };

export default function SyncScreen() {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  const [exportCode, setExportCode] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' });

  const handleExport = async () => {
    setExporting(true);
    setCopied(false);
    try {
      setExportCode(await exportProgressCode());
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!exportCode) return;
    await Clipboard.setStringAsync(exportCode);
    setCopied(true);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { restoredKeys } = await importProgressCode(importText);
      setImportState({ kind: 'success', count: restoredKeys.length });
    } catch {
      setImportState({ kind: 'error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScreenHeader title={t('sync.title')} variant="modal" />
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            {t('sync.intro')}
          </ThemedText>

          <AnimatedListItem index={0}>
            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('sync.exportTitle').toUpperCase()}
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.card}>
                <Pressable
                  onPress={handleExport}
                  disabled={exporting}
                  accessibilityRole="button"
                  accessibilityLabel={t('sync.exportButton')}
                  style={styles.primaryButton}>
                  <ThemedView type="backgroundSelected" style={styles.primaryButtonInner}>
                    {exporting ? (
                      <ThemedActivityIndicator size="small" />
                    ) : (
                      <ThemedText type="smallBold" themeColor="accent">
                        {t('sync.exportButton')}
                      </ThemedText>
                    )}
                  </ThemedView>
                </Pressable>

                {exportCode && (
                  <>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.exportHint}>
                      {t('sync.exportHint')}
                    </ThemedText>
                    <ThemedView type="backgroundSelected" style={styles.codeBox}>
                      <ThemedText type="small" selectable style={styles.codeText}>
                        {exportCode}
                      </ThemedText>
                    </ThemedView>
                    <Pressable
                      onPress={handleCopy}
                      accessibilityRole="button"
                      accessibilityLabel={copied ? t('sync.copied') : t('sync.copyButton')}
                      style={styles.copyButton}>
                      <IconSymbol name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.accent} />
                      <ThemedText type="small" themeColor="accent">
                        {copied ? t('sync.copied') : t('sync.copyButton')}
                      </ThemedText>
                    </Pressable>
                  </>
                )}
              </ThemedView>
            </View>
          </AnimatedListItem>

          <AnimatedListItem index={1}>
            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                {t('sync.importTitle').toUpperCase()}
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedView type="backgroundSelected" style={styles.inputBox}>
                  <TextInput
                    value={importText}
                    onChangeText={(v) => {
                      setImportText(v);
                      setImportState({ kind: 'idle' });
                    }}
                    placeholder={t('sync.importPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    style={[styles.textInput, { color: colors.text }]}
                  />
                </ThemedView>
                <Pressable
                  onPress={handleImport}
                  disabled={importing || importText.trim().length === 0}
                  accessibilityRole="button"
                  accessibilityLabel={t('sync.importButton')}
                  style={styles.primaryButton}>
                  <ThemedView type="backgroundSelected" style={styles.primaryButtonInner}>
                    {importing ? (
                      <ThemedActivityIndicator size="small" />
                    ) : (
                      <ThemedText type="smallBold" themeColor="accent">
                        {t('sync.importButton')}
                      </ThemedText>
                    )}
                  </ThemedView>
                </Pressable>

                {importState.kind === 'success' && (
                  <ThemedText type="small" themeColor="accent" style={styles.feedback}>
                    {t('sync.importSuccess')}
                  </ThemedText>
                )}
                {importState.kind === 'error' && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.feedback}>
                    {t('sync.importError')}
                  </ThemedText>
                )}
              </ThemedView>
            </View>
          </AnimatedListItem>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.two },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: { marginBottom: Spacing.one },
  intro: { marginBottom: Spacing.three, lineHeight: 20 },
  section: { gap: Spacing.two },
  sectionLabel: { marginLeft: Spacing.one },
  card: { padding: Spacing.four, borderRadius: Spacing.three, gap: Spacing.three },
  primaryButton: { alignSelf: 'flex-start' },
  primaryButtonInner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
    minWidth: 140,
    alignItems: 'center',
  },
  exportHint: { lineHeight: 18 },
  codeBox: { padding: Spacing.three, borderRadius: Spacing.two },
  codeText: { fontFamily: 'monospace', lineHeight: 18 },
  copyButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-start' },
  inputBox: { borderRadius: Spacing.two, padding: Spacing.three, minHeight: 100 },
  textInput: { fontSize: 14, fontFamily: 'monospace', minHeight: 84 },
  feedback: { lineHeight: 18 },
});
