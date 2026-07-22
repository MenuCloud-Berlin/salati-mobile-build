// Native Salati KI (iOS/Android): dieselbe Idee wie public/ki.html (Antwort
// NUR aus Koran/Nawawi-Hadithen/Duas/Salati-Kurstexten), aber ohne Browser/
// WebGPU — llama.rn führt das GGUF-Modell direkt auf dem Gerät aus, die Web-
// Version bleibt komplett unabhängig unter public/ki.html (Web-Route dieser
// Datei ist ki-native.web.tsx, importiert bewusst KEIN llama.rn).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { ladeKorpusIndex } from '@/features/ki/korpus';
import { entladeLlm, frageLlm, ladeLlm } from '@/features/ki/llm';
import { formatiereBytes, istModellHeruntergeladen, MODELL_GROESSE_BYTES, modellHerunterladen, modellLoeschen, modellPfad } from '@/features/ki/model';
import { istArabisch, suche, type KorpusDoc } from '@/features/ki/retrieval';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

type Status = 'checking' | 'need-download' | 'downloading' | 'loading-model' | 'ready' | 'download-error';

interface ChatMessage {
  role: 'du' | 'ki';
  text: string;
  sources?: KorpusDoc[];
  rtl?: boolean;
}

// Minimales Modell-Markdown darstellen statt roher **Sternchen** (analog md()
// in public/ki.html): nur Fett - mehr gibt das 1.5B-Modell praktisch nicht aus.
function renderMitBold(text: string) {
  const teile = text.split(/\*\*([^*\n]+)\*\*/g);
  if (teile.length === 1) return text;
  return teile.map((teil, i) => (i % 2 === 1 ? <ThemedText key={i} type="smallBold">{teil}</ThemedText> : teil));
}

export default function KiNativeScreen() {
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const groesse = formatiereBytes(MODELL_GROESSE_BYTES);

  const [status, setStatus] = useState<Status>('checking');
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'ki', text: t('ki.welcome') }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const index = useMemo(() => ladeKorpusIndex(), []);

  const starteModellLaden = useCallback(async () => {
    setStatus('loading-model');
    setProgress(0);
    try {
      await ladeLlm(modellPfad(), setProgress);
      setStatus('ready');
    } catch {
      // Modell lag zwar auf der Platte, ließ sich aber nicht laden (z. B.
      // beschädigt durch abgebrochenen früheren Download) — zurück zum
      // Download-Angebot, statt die App in einem toten Zustand hängen zu lassen.
      await modellLoeschen();
      setStatus('need-download');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    istModellHeruntergeladen().then((vorhanden) => {
      if (cancelled) return;
      if (vorhanden) starteModellLaden();
      else setStatus('need-download');
    });
    return () => {
      cancelled = true;
    };
  }, [starteModellLaden]);

  async function download() {
    setStatus('downloading');
    setProgress(0);
    try {
      await modellHerunterladen((p) => setProgress(p.anteil));
      await starteModellLaden();
    } catch {
      setStatus('download-error');
    }
  }

  function loeschen() {
    Alert.alert(t('ki.deleteModel'), t('ki.deleteModelConfirm').replace('{size}', groesse), [
      { text: t('common.cancel') ?? 'Abbrechen', style: 'cancel' },
      {
        text: t('ki.deleteModel'),
        style: 'destructive',
        onPress: async () => {
          await entladeLlm();
          await modellLoeschen();
          setStatus('need-download');
        },
      },
    ]);
  }

  async function frage(text: string) {
    if (status !== 'ready' || sending) return;
    const arabisch = istArabisch(text);
    setMessages((m) => [...m, { role: 'du', text, rtl: arabisch }]);
    setSending(true);
    scrollRef.current?.scrollToEnd({ animated: true });

    const treffer = suche(index, text, 6);
    if (treffer.length === 0) {
      setMessages((m) => [...m, { role: 'ki', text: t('ki.noAnswer') }]);
      setSending(false);
      return;
    }

    setMessages((m) => [...m, { role: 'ki', text: '…', sources: treffer }]);
    try {
      await frageLlm(text, treffer, (textBisher) => {
        setMessages((m) => {
          const kopie = [...m];
          kopie[kopie.length - 1] = { role: 'ki', text: textBisher, sources: treffer };
          return kopie;
        });
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    } catch {
      setMessages((m) => {
        const kopie = [...m];
        kopie[kopie.length - 1] = {
          role: 'ki',
          text: treffer.map((d) => `„${d.t}“\n— ${d.src}`).join('\n\n'),
          sources: treffer,
        };
        return kopie;
      });
    }
    setSending(false);
  }

  function senden() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    frage(text);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            {t('ki.title')}
          </ThemedText>
          {status === 'ready' && (
            <PressableCard onPress={loeschen} type="backgroundElement" style={styles.deleteBtn}>
              <IconSymbol name="trash-outline" size={16} color={colors.textSecondary} />
            </PressableCard>
          )}
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          {t('ki.subtitle')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.disclosure}>
          {t('ki.aiDisclosure')}
        </ThemedText>

        {status === 'checking' && (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {status === 'need-download' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{t('ki.downloadTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('ki.downloadDesc').replace('{size}', groesse)}
            </ThemedText>
            <View style={styles.wifiRow}>
              <IconSymbol name="wifi-outline" size={14} color={colors.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {t('ki.wifiHint')}
              </ThemedText>
            </View>
            <PressableCard onPress={download} type="backgroundSelected" style={styles.actionBtn}>
              <IconSymbol name="cloud-download-outline" size={16} color={colors.accent} />
              <ThemedText type="smallBold" themeColor="accent">
                {t('ki.downloadButton')}
              </ThemedText>
            </PressableCard>
          </ThemedView>
        )}

        {(status === 'downloading' || status === 'loading-model') && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small">{status === 'downloading' ? t('ki.downloading') : t('ki.loadingModel')}</ThemedText>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.accent }]} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {Math.round(progress * 100)} %
            </ThemedText>
          </ThemedView>
        )}

        {status === 'download-error' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="text">
              {t('ki.downloadError')}
            </ThemedText>
            <PressableCard onPress={download} type="backgroundSelected" style={styles.actionBtn}>
              <ThemedText type="smallBold" themeColor="accent">
                {t('ki.retry')}
              </ThemedText>
            </PressableCard>
          </ThemedView>
        )}

        {status === 'ready' && (
          <KeyboardAvoidingView style={styles.chatWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView ref={scrollRef} contentContainerStyle={styles.chatList} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
              {messages.map((msg, i) => (
                <View key={i} style={[styles.bubble, msg.role === 'du' ? styles.bubbleDu : styles.bubbleKi, msg.role === 'du' && { backgroundColor: colors.text }]}>
                  <ThemedText
                    type="small"
                    themeColor={msg.role === 'du' ? 'background' : 'text'}
                    style={msg.rtl ? styles.rtlText : undefined}>
                    {renderMitBold(msg.text)}
                  </ThemedText>
                  {msg.sources && msg.sources.length > 0 && (
                    <ThemedText type="small" themeColor="accent" style={styles.sources}>
                      {t('ki.sourcesLabel')}: {[...new Set(msg.sources.map((s) => s.src))].join(' · ')}
                    </ThemedText>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={t('ki.inputPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.backgroundSelected }, istArabisch(input) && styles.rtlText]}
                editable={!sending}
                onSubmitEditing={senden}
                returnKeyType="send"
              />
              <PressableCard onPress={senden} disabled={sending || !input.trim()} type="backgroundSelected" style={styles.sendBtn}>
                {sending ? <ActivityIndicator size="small" color={colors.accent} /> : <IconSymbol name="send" size={16} color={colors.accent} />}
              </PressableCard>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three, paddingHorizontal: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  title: { textAlign: 'center', fontSize: 32, lineHeight: 38 },
  deleteBtn: { position: 'absolute', right: 0, padding: Spacing.two },
  subtitle: { textAlign: 'center', marginTop: Spacing.one },
  disclosure: { textAlign: 'center', marginTop: Spacing.half, marginBottom: Spacing.three, fontStyle: 'italic' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { padding: Spacing.four, gap: Spacing.two, borderRadius: 20 },
  wifiRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.three, marginTop: Spacing.two },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.25)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  chatWrap: { flex: 1 },
  chatList: { gap: Spacing.two, paddingBottom: Spacing.three },
  bubble: { maxWidth: '90%', borderRadius: 16, padding: Spacing.three, gap: Spacing.one },
  bubbleDu: { alignSelf: 'flex-end' },
  bubbleKi: { alignSelf: 'flex-start', backgroundColor: 'rgba(128,128,128,0.12)' },
  sources: { marginTop: Spacing.one, fontStyle: 'italic' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  inputRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 15 },
  sendBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
});
