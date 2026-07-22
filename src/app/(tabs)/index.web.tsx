// Web-only Landingpage (Expo-Router-Web-Override wie app-tabs.web.tsx):
// Erstbesucher auf www.salati.pro landen hier statt direkt auf der
// Gebetszeiten-Live-Ansicht. Native Builds (iOS/Android) nutzen weiter
// index.tsx unverändert.
import { Image, ImageBackground } from 'expo-image';
import { useState, useRef } from 'react';
import { Link } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { StarClusterDecoration } from '@/components/decorative-pattern';
import { IconSymbol, type IconName } from '@/components/ui/icon-symbol';
import { PressableCard } from '@/components/ui/pressable-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useTranslation } from '@/lib/i18n';

const FEATURES: { icon: IconName; titleKey: string; descKey: string }[] = [
  { icon: 'time-outline', titleKey: 'landing.f1Title', descKey: 'landing.f1Desc' },
  { icon: 'book-outline', titleKey: 'landing.f2Title', descKey: 'landing.f2Desc' },
  { icon: 'school-outline', titleKey: 'landing.f3Title', descKey: 'landing.f3Desc' },
  { icon: 'library-outline', titleKey: 'landing.f4Title', descKey: 'landing.f4Desc' },
  { icon: 'chatbubbles-outline', titleKey: 'landing.f5Title', descKey: 'landing.f5Desc' },
  { icon: 'location-outline', titleKey: 'landing.f6Title', descKey: 'landing.f6Desc' },
  { icon: 'trophy-outline', titleKey: 'landing.f7Title', descKey: 'landing.f7Desc' },
  { icon: 'shield-checkmark-outline', titleKey: 'landing.f8Title', descKey: 'landing.f8Desc' },
];

const SCREENSHOTS = [
  require('../../../assets/marketing/shot-prayer.png'),
  require('../../../assets/marketing/shot-quran.png'),
  require('../../../assets/marketing/shot-qibla.png'),
  require('../../../assets/marketing/shot-tracker.png'),
  require('../../../assets/marketing/shot-names.png'),
  require('../../../assets/marketing/shot-tasbih.png'),
  require('../../../assets/marketing/shot-calendar.png'),
];

// Vertrauens-Versprechen (User-Direktive: kostenlos/werbefrei/lokal MUSS
// prominent auf die Seite) — Reihenfolge = Wichtigkeit.
const TRUST: { icon: IconName; titleKey: string; descKey: string }[] = [
  { icon: 'gift-outline', titleKey: 'landing.trust1Title', descKey: 'landing.trust1Desc' },
  { icon: 'eye-off-outline', titleKey: 'landing.trust2Title', descKey: 'landing.trust2Desc' },
  { icon: 'hardware-chip-outline', titleKey: 'landing.trust3Title', descKey: 'landing.trust3Desc' },
  { icon: 'cloud-offline-outline', titleKey: 'landing.trust4Title', descKey: 'landing.trust4Desc' },
];

// FAQ (Audit 2026-07-19 F3): aufklappbare Einträge vor dem Footer. Bewusst
// eigener useState-Toggle statt components/ui/collapsible.tsx - dessen
// Doku-Styling (Mini-Chevron-Button, eingerückter Inhalt) passt nicht zum
// Karten-Look der Landingpage. Das statische FAQPage-JSON-LD dazu liegt in
// app/+html.tsx (englischer Default, sprachunabhängig ausgeliefert).
const FAQ_COUNT = 8;

// Audit 2026-07-21: per Apples oeffentlicher Lookup-API (itunes.apple.com/
// lookup?id=6791867298) bestaetigt live ("Ready for Sale", resultCount 1,
// trackName "Salati Islam") - Play Store (de.salatibox.de) liefert dagegen
// noch ein echtes 404 auf play.google.com, also dort bewusst weiter
// "Bald verfuegbar" stehen lassen statt eines toten Links.
const APP_STORE_URL = 'https://apps.apple.com/app/id6791867298';

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  return (
    <ThemedView type="backgroundElement" style={styles.faqCard}>
      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[styles.faqQuestionRow, styles.pressableWeb]}>
        <ThemedText type="smallBold" style={styles.faqQuestionText}>
          {question}
        </ThemedText>
        <IconSymbol
          name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={16}
          color={colors.accent}
        />
      </Pressable>
      {open && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.faqAnswer}>
          {answer}
        </ThemedText>
      )}
    </ThemedView>
  );
}

export default function LandingScreen() {
  const shotScrollRef = useRef<ScrollView>(null);
  const shotOffsetRef = useRef(0);
  function scrollShots(direction: 1 | -1) {
    const next = Math.max(0, shotOffsetRef.current + direction * 320);
    shotScrollRef.current?.scrollTo({ x: next, animated: true });
    shotOffsetRef.current = next;
  }
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const colors = Colors[scheme];
  const [apkProgress, setApkProgress] = useState<number | null>(null);

  // APK aus 2 Teilen laden und als eine Datei speichern (siehe Kommentar am Button).
  async function downloadApk() {
    if (apkProgress !== null) return;
    setApkProgress(0);
    try {
      const parts: BlobPart[] = [];
      const files = ['/salati.apk.part00', '/salati.apk.part01'];
      for (let i = 0; i < files.length; i++) {
        const r = await fetch(files[i]);
        if (!r.ok) throw new Error(String(r.status));
        parts.push(await r.blob());
        setApkProgress(Math.round(((i + 1) / files.length) * 100));
      }
      const url = URL.createObjectURL(new Blob(parts, { type: 'application/vnd.android.package-archive' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'salati.apk';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      // Fehler: still zurücksetzen — Button ist erneut nutzbar.
    } finally {
      setApkProgress(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Echtes Foto (Sheikh-Zayed-Moschee, Unsplash-Lizenz — siehe
              assets/images/landing/CREDITS.md) als Hero-Hintergrund, mit
              scheme-abhängigem Überzug für Textkontrast in Light UND Dark. */}
          <ImageBackground
            source={require('../../../assets/images/landing/landing-hero.jpg')}
            style={styles.hero}
            imageStyle={styles.heroImage}
            contentFit="cover"
            contentPosition="center"
            // LCP-Bild (erstes sichtbares Foto auf der Landingpage) — eager
            // laden statt dem Browser-Default zu überlassen, damit es nicht
            // hinter den weiter unten gelazyloadeten Screenshots ansteht.
            priority="high"
            loading="eager">
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor:
                    scheme === 'dark' ? 'rgba(11,11,13,0.85)' : 'rgba(247,243,234,0.86)',
                  borderRadius: Spacing.four,
                },
              ]}
            />
            <StarClusterDecoration color={colors.accent} />
            <AnimatedListItem index={0}>
              <View style={styles.heroIconGlow}>
                <Image source={require('../../../assets/images/icon.png')} style={styles.heroIcon} contentFit="contain" />
              </View>
            </AnimatedListItem>
            <AnimatedListItem index={1}>
              <ThemedText type="title" style={styles.heroTitle}>
                {t('landing.title')}
              </ThemedText>
            </AnimatedListItem>
            <AnimatedListItem index={2}>
              <ThemedText type="subtitle" themeColor="accent" style={styles.heroTagline}>
                {t('landing.tagline')}
              </ThemedText>
            </AnimatedListItem>
            <AnimatedListItem index={3}>
              <ThemedText type="default" themeColor="textSecondary" style={styles.heroSubtitle}>
                {t('landing.subtitle')}
              </ThemedText>
            </AnimatedListItem>
            <AnimatedListItem index={4}>
              <View style={styles.heroActions}>
                <Link href="/quran" asChild>
                  <PressableCard type="backgroundSelected" style={styles.ctaPrimary} elevated>
                    <ThemedText type="smallBold" themeColor="accent">
                      {t('landing.ctaTry')}
                    </ThemedText>
                  </PressableCard>
                </Link>
                <Link href="/study" asChild>
                  <PressableCard type="backgroundElement" style={styles.ctaSecondary} elevated>
                    <ThemedText type="smallBold">{t('landing.ctaStudy')}</ThemedText>
                  </PressableCard>
                </Link>
                <Pressable
                  onPress={() => { if (typeof window !== 'undefined') window.location.href = '/ki'; }}
                  style={styles.pressableWeb}>
                  <ThemedView type="backgroundElement" style={styles.ctaSecondary}>
                    <ThemedText type="smallBold" themeColor="accent">
                      {t('landing.ctaKi')}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </View>
            </AnimatedListItem>
          </ImageBackground>

          <View style={styles.trustBand}>
            {TRUST.map((item, i) => (
              <ScrollReveal key={item.titleKey} delay={i * 60} style={styles.trustItem}>
                <ThemedView type="backgroundSelected" style={styles.trustCard}>
                  <IconSymbol name={item.icon} size={24} color={colors.accent} />
                  <ThemedText type="smallBold" style={styles.trustTitle}>
                    {t(item.titleKey)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.trustDesc}>
                    {t(item.descKey)}
                  </ThemedText>
                </ThemedView>
              </ScrollReveal>
            ))}
          </View>

          <ScrollReveal style={styles.sectionTitle}>
            <ThemedText type="subtitle">{t('landing.featuresTitle')}</ThemedText>
          </ScrollReveal>
          <View style={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.titleKey} delay={(i % 4) * 60}>
                <ThemedView type="backgroundElement" style={[styles.featureCard, styles.featureCardShadow]}>
                  <ThemedView type="backgroundSelected" style={styles.featureIconBadge}>
                    <IconSymbol name={f.icon} size={22} color={colors.accent} />
                  </ThemedView>
                  <ThemedText type="smallBold" style={styles.featureTitle}>
                    {t(f.titleKey)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t(f.descKey)}
                  </ThemedText>
                </ThemedView>
              </ScrollReveal>
            ))}
          </View>

          {/* Foto-Band (Masjid An Nur TNB, Unsplash-Lizenz — CREDITS.md) als
              visuelle Trennung zwischen Features und Screenshots. */}
          <ScrollReveal>
            <Image
              source={require('../../../assets/images/landing/landing-band.jpg')}
              style={styles.bandImage}
              contentFit="cover"
              contentPosition="center"
              alt=""
              // Weit unterhalb des ersten Viewports — Browser soll das nicht
              // parallel zum LCP-Hero-Bild laden (Bandbreiten-Konkurrenz).
              loading="lazy"
            />
          </ScrollReveal>

          <ScrollReveal style={styles.sectionTitle}>
            <ThemedText type="subtitle">{t('landing.screenshotsTitle')}</ThemedText>
          </ScrollReveal>
          {/* Desktop hat keinen Touch: sichtbare Scrollbar + Pfeil-Buttons,
              sonst wirkt die Galerie "nicht scrollbar" (Gerätefeedback). */}
          <View style={styles.shotWrap}>
            <ScrollView
              ref={shotScrollRef}
              horizontal
              // Nackter Browser-Scrollbalken unter den Screenshots wirkte
              // unpoliert (Audit 2026-07-19 B12) - Pfeile + Swipe reichen.
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                shotOffsetRef.current = e.nativeEvent.contentOffset.x;
              }}
              scrollEventThrottle={64}
              style={styles.shotScrollView}
              contentContainerStyle={styles.shotRow}>
              {SCREENSHOTS.map((src, i) => (
                <ScrollReveal key={i} delay={(i % 6) * 60}>
                  {/* Galerie ist unterhalb des ersten Viewports und RN-Web
                      virtualisiert die ScrollView nicht - ohne loading="lazy"
                      holt der Browser alle 6 Screenshots sofort beim
                      Seitenaufruf statt erst beim Scrollen dorthin. */}
                  <Image source={src} style={styles.shot} contentFit="cover" loading="lazy" />
                </ScrollReveal>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => scrollShots(-1)}
              accessibilityRole="button"
              accessibilityLabel="←"
              style={[styles.shotArrow, styles.shotArrowLeft, styles.pressableWeb]}>
              <ThemedText type="subtitle">‹</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => scrollShots(1)}
              accessibilityRole="button"
              accessibilityLabel="→"
              style={[styles.shotArrow, styles.shotArrowRight, styles.pressableWeb]}>
              <ThemedText type="subtitle">›</ThemedText>
            </Pressable>
          </View>

          <View style={styles.storeSection}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('landing.storeTitle')}
            </ThemedText>
            {/* Direkter APK-Download (Beta) — die Datei liegt im Static-
                Export unter /salati.apk (gleiche Origin, kein Drittanbieter). */}
            <PressableCard
              // Die APK (124 MB) liegt in zwei Teilen im Static-Export
              // (GitHubs 100-MB-Datei-Limit) und wird beim Klick im Browser
              // zusammengesetzt — bleibt komplett selbst gehostet.
              onPress={downloadApk}
              type="backgroundSelected"
              style={styles.ctaPrimary}
              elevated>
              <View style={styles.apkRow}>
                <IconSymbol name="logo-android" size={18} color={colors.accent} />
                <ThemedText type="smallBold" themeColor="accent">
                  {apkProgress !== null
                    ? t('landing.apkDownloading').replace('{p}', String(apkProgress))
                    : t('landing.apkButton')}
                </ThemedText>
              </View>
            </PressableCard>
            <ThemedText type="small" themeColor="textSecondary" style={styles.apkHint}>
              {t('landing.apkHint')}
            </ThemedText>
            <View style={styles.storeBadges}>
              <Pressable
                onPress={() => Linking.openURL(APP_STORE_URL)}
                accessibilityRole="link"
                style={styles.pressableWeb}>
                <ThemedView type="backgroundElement" style={styles.storeBadge}>
                  <IconSymbol name="logo-apple" size={18} color={colors.accent} />
                  <ThemedText type="small" themeColor="accent">
                    App Store · {t('landing.storeAvailable')}
                  </ThemedText>
                </ThemedView>
              </Pressable>
              <ThemedView type="backgroundElement" style={styles.storeBadge}>
                <IconSymbol name="logo-google-playstore" size={18} color={colors.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Google Play · {t('landing.storeSoon')}
                </ThemedText>
              </ThemedView>
            </View>
          </View>

          <ScrollReveal style={styles.sectionTitle}>
            <ThemedText type="subtitle">{t('landing.faqTitle')}</ThemedText>
          </ScrollReveal>
          <View style={styles.faqList}>
            {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n) => (
              <FaqItem key={n} question={t(`landing.faq${n}Q`)} answer={t(`landing.faq${n}A`)} />
            ))}
          </View>

          <View style={styles.socialRow}>
            <Pressable
              onPress={() => Linking.openURL('https://www.youtube.com/channel/UCzqiyiWVFK9NY4k0OD850Lw')}
              accessibilityRole="link"
              accessibilityLabel="YouTube">
              <IconSymbol name="logo-youtube" size={28} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://www.instagram.com/salati.pro')}
              accessibilityRole="link"
              accessibilityLabel="Instagram">
              <IconSymbol name="logo-instagram" size={28} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://open.spotify.com/show/033U0teP7zMDXYm3zQ3fje')}
              accessibilityRole="link"
              accessibilityLabel="Spotify">
              <IconSymbol name="musical-notes" size={26} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            {t('landing.footer')} · {t('common.credit')}
          </ThemedText>
          <View style={styles.legalLinks}>
            <Link href="/impressum" asChild>
              <Pressable style={Platform_pressable}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.legalLink}>
                  {t('nav.impressum')}
                </ThemedText>
              </Pressable>
            </Link>
            <ThemedText type="small" themeColor="textSecondary">
              ·
            </ThemedText>
            <Link href="/datenschutz" asChild>
              <Pressable style={Platform_pressable}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.legalLink}>
                  {t('nav.datenschutz')}
                </ThemedText>
              </Pressable>
            </Link>
            <ThemedText type="small" themeColor="textSecondary">
              ·
            </ThemedText>
            <Link href="/changelog" asChild>
              <Pressable style={Platform_pressable}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.legalLink}>
                  {t('nav.changelog')}
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const Platform_pressable = { cursor: 'pointer' } as const;

const styles = StyleSheet.create({
  pressableWeb: { cursor: 'pointer' },
  // ohne explizite width kannte RN-Web dem ScrollView keine Bounding-Box -
  // der Inhalt lief einfach ueber den Rand statt zu scrollen (Nutzerfund:
  // "Screenshot-Galerie scrollt nicht").
  shotWrap: { position: 'relative', width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  shotScrollView: { width: '100%' },
  shotArrow: {
    position: 'absolute',
    top: '42%',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,11,13,0.55)',
  },
  shotArrowLeft: { left: 6 },
  shotArrowRight: { right: 6 },
  trustBand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  // Flex-Item-Props gehören auf den ScrollReveal-Wrapper (das eigentliche
  // Flex-Kind der Reihe): flexBasis auf der Karte selbst wirkte im column-
  // Wrapper als HÖHEN-Basis von 220px und erzeugte die großen Leerflächen
  // unter dem Text (Audit 2026-07-19 B5).
  trustItem: {
    flexBasis: 220,
    flexGrow: 1,
    maxWidth: 280,
  },
  trustCard: {
    flexGrow: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  trustTitle: { textAlign: 'center' },
  trustDesc: { textAlign: 'center' },
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  scroll: { alignItems: 'center', paddingBottom: Spacing.six, paddingHorizontal: Spacing.four },
  hero: {
    alignItems: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    marginTop: Spacing.four,
    gap: Spacing.two,
    position: 'relative',
    overflow: 'hidden',
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
  },
  heroImage: { borderRadius: Spacing.four },
  bandImage: {
    width: '100%',
    maxWidth: MaxContentWidth,
    height: 240,
    borderRadius: Spacing.four,
    marginTop: Spacing.six,
  },
  heroIconGlow: {
    marginBottom: Spacing.two,
    borderRadius: Spacing.four + Spacing.one,
    // Web-only-Datei: boxShadow statt der deprecated shadow*-Props
    // (die warfen auf jeder Seite eine Konsolen-Warnung).
    boxShadow: '0 8px 24px rgba(212,175,55,0.35)',
  },
  heroIcon: { width: 96, height: 96, borderRadius: Spacing.four },
  heroTitle: { textAlign: 'center' },
  heroTagline: { textAlign: 'center' },
  heroSubtitle: { textAlign: 'center', maxWidth: 560, marginTop: Spacing.two },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, justifyContent: 'center', marginTop: Spacing.four },
  ctaPrimary: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: Spacing.four },
  ctaSecondary: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: Spacing.four },
  sectionTitle: { textAlign: 'center', marginTop: Spacing.six, marginBottom: Spacing.four, maxWidth: MaxContentWidth, width: '100%' },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  featureCard: {
    width: 250,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  featureCardShadow: Platform.select({
    web: { boxShadow: '0 1px 3px rgba(11,11,13,0.06), 0 4px 12px rgba(11,11,13,0.06)' },
    default: {
      shadowColor: '#0b0b0d',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
  }),
  featureIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { marginTop: Spacing.one },
  shotRow: { gap: Spacing.four, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  shot: {
    width: 220,
    height: 480,
    borderRadius: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  storeSection: { alignItems: 'center', marginTop: Spacing.six, gap: Spacing.three },
  apkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  apkHint: { textAlign: 'center', maxWidth: 420 },
  storeBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, justifyContent: 'center' },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  faqList: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  faqCard: { borderRadius: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  faqQuestionText: { flexShrink: 1 },
  faqAnswer: { marginTop: Spacing.two },
  footer: { textAlign: 'center', marginTop: Spacing.six },
  socialRow: { flexDirection: 'row', gap: Spacing.four, justifyContent: 'center', alignItems: 'center', marginTop: Spacing.six },
  legalLinks: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', marginTop: Spacing.two },
  legalLink: { textDecorationLine: 'underline' },
});
