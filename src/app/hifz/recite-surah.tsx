import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedActivityIndicator } from '@/components/themed-activity-indicator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackChipInset, Brand, Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  recognizeArabicContinuous,
  recognitionAvailable,
  type ContinuousController,
} from '@/features/hifz/speech';
import type { RevealedWord } from '@/features/hifz/reciteProgress';
import { whisperSupported } from '@/features/hifz/whisperCheck';
import {
  aktuelleModellGroesse,
  istWhisperModellHeruntergeladen,
  whisperModellHerunterladen,
} from '@/features/hifz/whisperModel';
import { useSurahReading } from '@/features/quran/hooks';
import { useSettings } from '@/features/settings/store';
import { formatBytes } from '@/features/settings/storage';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { backOr } from '@/lib/nav';
import { useTranslation } from '@/lib/i18n';

// „Leerer Mushaf – ganze Sure" (K, User-Wunsch 2026-07-22): die ganze Sure ist
// verdeckt; man startet das Modell, sagt „Bismillah…" und rezitiert durchgehend.
// Das Modell läuft KONTINUIERLICH und deckt Verse Wort für Wort auf, sobald es
// sie korrekt erkennt (falsch → trotzdem aufgedeckt, aber markiert). Läuft bis
// Sure fertig oder Stopp gedrückt (recognizeArabicContinuous).
export default function ReciteSurahScreen() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const surahNumber = Number(surah);
  const { settings } = useSettings();
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];

  const { data, isLoading } = useSurahReading(surahNumber, settings.quranTranslation, settings.quranReciter);
  const ayahs = useMemo(() => data?.ayahs ?? [], [data]);

  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [modelDlPct, setModelDlPct] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const controllerRef = useRef<ContinuousController | null>(null);

  useEffect(() => {
    if (!whisperSupported()) return;
    let cancelled = false;
    istWhisperModellHeruntergeladen().then((d) => {
      if (!cancelled) setModelReady(d);
    });
    return () => {
      cancelled = true;
      controllerRef.current?.stop().catch(() => undefined);
    };
  }, []);

  // Erwarteter Gesamttext (alle Verse) + Wort-Grenzen je Vers für das Zurück-
  // Mappen der flachen Wort-Ausrichtung auf die einzelnen Verse.
  const verseWordCounts = useMemo(
    () => ayahs.map((a) => a.arabic.split(/\s+/).filter(Boolean).length),
    [ayahs],
  );
  const expectedFull = useMemo(
    () => ayahs.map((a) => a.arabic).join(' '),
    [ayahs],
  );

  // Monotones Aufdecken (User-Bug 2026-07-22: „erkennt nur die ersten Verse,
  // dann verliert es den Faden und löscht die ersten wieder" + „ein Wort aus
  // Vers 1 wird beim Vers 7 als Treffer gewertet"). Die Aufdeck-Treffer kommen
  // jetzt POSITIONS-gekoppelt aus der Erkennung (speech.ts → reciteProgress.ts
  // windowedReveal): je Teil-Transkript nur Treffer NAHE der aktuellen Front,
  // global indiziert. Kein globales alignWords(partial, ganzeSure) mehr, das ein
  // spätes/frühes gleichlautendes Wort fälschlich zuordnen konnte. Der beste je
  // erreichte Status pro Wort wird festgehalten und NIE herabgestuft
  // (undefined < near < hit) — ein späteres Fenster ohne die frühen Verse deckt
  // daher nichts wieder zu.
  const [revealed, setRevealed] = useState<Record<number, 'hit' | 'near'>>({});
  const applyReveals = useCallback((reveals: RevealedWord[]) => {
    if (reveals.length === 0) return;
    setRevealed((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const r of reveals) {
        if (next[r.index] === 'hit') continue; // schon maximal
        if (next[r.index] === 'near' && r.status === 'near') continue;
        next[r.index] = r.status;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  async function downloadModel() {
    if (modelDlPct !== null) return;
    setModelDlPct(0);
    try {
      await whisperModellHerunterladen((p) => setModelDlPct(Math.round(p.anteil * 100)));
      setModelReady(true);
    } catch {
      /* ignore — Button bleibt nutzbar */
    } finally {
      setModelDlPct(null);
    }
  }

  async function start() {
    if (running || starting) return;
    setStarting(true);
    setRevealed({});
    try {
      controllerRef.current = await recognizeArabicContinuous({
        expectedText: expectedFull,
        // Positions-gekoppelte Treffer direkt aufdecken (kein globales
        // Alignment mehr, s. applyReveals-Kommentar).
        onPartial: (_tr, reveals) => applyReveals(reveals),
      });
      setRunning(true);
    } catch (e) {
      console.error('[hifz recite-surah] Erkennung konnte nicht gestartet werden:', String(e));
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    const c = controllerRef.current;
    controllerRef.current = null;
    setRunning(false);
    // Der finale Durchlauf meldet seine Treffer selbst über onPartial→applyReveals.
    if (c) {
      await c.stop().catch((e) => {
        console.warn('[hifz recite-surah] Stopp/Final-Transkription fehlgeschlagen:', String(e));
        return '';
      });
    }
  }

  // Globaler Wort-Offset je Vers: die Reveals sind global über die ganze Sure
  // indiziert (reciteProgress.ts) — off + wortIndexImVers = globaler Index in
  // `revealed`. Offset mutationsfrei berechnen (Summe der Wortzahlen davor) —
  // der React-Compiler-Lint verbietet ein `let off += …` im Render.
  const perVerse = useMemo(
    () =>
      ayahs.map((a, i) => {
        const off = verseWordCounts.slice(0, i).reduce((s, c) => s + c, 0);
        return { ayah: a, off };
      }),
    [ayahs, verseWordCounts],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {Platform.OS === 'web' ? (
            <View style={styles.closeSpacer} />
          ) : (
            <Pressable onPress={() => backOr('/hifz')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('a11y.close')}>
              <IconSymbol name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
          <ThemedText type="subtitle">{data?.meta.englishName ?? ''}</ThemedText>
          <View style={styles.closeSpacer} />
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          {t('hifz.surahRecite.intro')}
        </ThemedText>

        {isLoading && (
          <View style={styles.center}>
            <ThemedActivityIndicator />
          </View>
        )}

        {!isLoading && (
          <ScrollView contentContainerStyle={styles.content}>
            {perVerse.map(({ ayah, off }) => (
              <View key={ayah.numberInSurah} style={styles.verseCard}>
                <ThemedText type="small" themeColor="accent" style={styles.verseNum}>
                  {ayah.numberInSurah}
                </ThemedText>
                <View style={styles.verseWordsRow}>
                  {ayah.arabic
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((w, wi) => {
                      const st = revealed[off + wi];
                      if (st === 'hit' || st === 'near') {
                        return (
                          <ThemedText
                            key={wi}
                            style={[styles.verseWord, st === 'near' && styles.verseWordNear]}>
                            {w}
                          </ThemedText>
                        );
                      }
                      // noch nicht (korrekt) erkannt → verdeckt
                      return (
                        <View key={wi} style={[styles.verseBlank, { width: Math.min(80, 24 + w.length * 5) }]} />
                      );
                    })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {settings.speechExercisesEnabled && whisperSupported() && recognitionAvailable() && (
          <View style={styles.footer}>
            {modelReady === false ? (
              <Pressable
                onPress={downloadModel}
                disabled={modelDlPct !== null}
                accessibilityRole="button"
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: Brand.gold }, pressed && styles.pressed]}>
                <IconSymbol name="download-outline" size={20} color={Brand.ink} />
                <ThemedText type="smallBold" style={styles.primaryLabel}>
                  {modelDlPct !== null
                    ? t('hifz.modelDownload').replace('{p}', String(modelDlPct))
                    : `${t('settings.storage.whisperModel.download')} · ${formatBytes(aktuelleModellGroesse())}`}
                </ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={running ? stop : start}
                disabled={modelReady === null || starting}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: running ? '#e5544b' : Brand.gold },
                  pressed && styles.pressed,
                ]}>
                <IconSymbol name={running ? 'stop' : 'mic'} size={20} color={running ? '#fff' : Brand.ink} />
                <ThemedText type="smallBold" style={[styles.primaryLabel, running && { color: '#fff' }]}>
                  {starting ? t('hifz.listening') : running ? t('hifz.surahRecite.stop') : t('hifz.surahRecite.start')}
                </ThemedText>
              </Pressable>
            )}
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  closeSpacer: { width: 20 },
  intro: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.two },
  center: { alignItems: 'center', paddingVertical: Spacing.five },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  verseCard: { gap: Spacing.two },
  verseNum: { textAlign: 'right' },
  verseWordsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'flex-start' },
  verseWord: { fontSize: 24, lineHeight: 44, paddingHorizontal: 4, color: Brand.gold },
  verseWordNear: { color: '#c99a2e' },
  verseBlank: { height: 5, borderRadius: 2.5, backgroundColor: 'rgba(150,150,150,0.4)', alignSelf: 'center' },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: 999,
    minHeight: 54,
  },
  primaryLabel: { fontSize: 16, color: Brand.ink },
  pressed: { opacity: 0.6 },
});
