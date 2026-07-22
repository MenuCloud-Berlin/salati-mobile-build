import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { AnimatedListItem } from '@/components/ui/animated-list-item';
import QiblaArView from '@/components/qibla-ar-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-resolved-scheme';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { distanceToMeccaKm, qiblaBearing } from '@/features/qibla/bearing';
import { cardinalKey } from '@/features/qibla/cardinal';
import { hasSeenQiblaCalibrationHint, markQiblaCalibrationHintSeen } from '@/features/qibla/calibration';
import { useCompass } from '@/features/qibla/useCompass';
import { useSettings } from '@/features/settings/store';
import { useTranslation } from '@/lib/i18n';

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 26;

// Grad-Ticks der rotierenden Skala: alle 15°, kräftiger bei 45°-Schritten.
const TICKS = Array.from({ length: 24 }, (_, i) => ({ deg: i * 15, major: (i * 15) % 45 === 0 }));

export default function QiblaScreen() {
  const { settings, update } = useSettings();
  const { t } = useTranslation();
  const { heading, available, needsPermission, needsCalibration, requestWebPermission } = useCompass();
  const { requestLocation, loading, error } = useDeviceLocation();
  const scheme = useResolvedScheme();

  // Kalibrierungs-Banner: dezent, kein Dauer-Hinweis. Erscheint entweder
  // beim allerersten Öffnen des Screens ÜBERHAUPT (einmalig, danach gemerkt)
  // oder sobald der Sensor selbst Instabilität meldet (niedrige native
  // Genauigkeit bzw. verrauschtes Heading, s. useCompass/calibration.ts).
  // In beiden Fällen jederzeit wegklickbar.
  const [firstOpenHint, setFirstOpenHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  // AR-/Kamera-Ansicht ist ein optionaler Zusatz zur Standard-Kompass-Ansicht.
  // Nur nativ verfügbar (Kamera-AR im Browser nicht sinnvoll kalibrierbar) —
  // auf Web wird der Umschalter ausgeblendet und dieser Zustand nie true.
  const arAvailable = Platform.OS !== 'web';
  const [arMode, setArMode] = useState(false);
  useEffect(() => {
    let cancelled = false;
    hasSeenQiblaCalibrationHint().then((seen) => {
      if (!cancelled && !seen) setFirstOpenHint(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const showCalibrationBanner = available === true && !hintDismissed && (firstOpenHint || needsCalibration);
  function dismissCalibrationBanner() {
    setHintDismissed(true);
    if (firstOpenHint) {
      setFirstOpenHint(false);
      markQiblaCalibrationHintSeen().catch(() => {});
    }
  }
  // Kompass-Beschriftung muss in Light UND Dark lesbar sein (SVG kennt keine
  // Theme-Farben) — daher textSecondary aus dem aufgelösten Schema.
  const cardinalFill = Colors[scheme].textSecondary;

  const bearing = useMemo(
    () => qiblaBearing(settings.location.lat, settings.location.lon),
    [settings.location.lat, settings.location.lon],
  );
  const distanceKm = useMemo(
    () => distanceToMeccaKm(settings.location.lat, settings.location.lon),
    [settings.location.lat, settings.location.lon],
  );

  // Standard-Muster guter Qibla-Apps: die GANZE Skala rotiert mit dem Gerät
  // (Blickrichtung ist immer oben), die Kaaba sitzt fest auf der Skala beim
  // Qibla-Bearing. Man dreht sich, bis die Kaaba unter dem fixen Zeiger oben
  // steht — statt einer Nadel auf statischer Nord-oben-Rose.
  const dialRotation = ((-heading) % 360 + 360) % 360;
  const kaabaScreenAngle = ((bearing - heading) % 360 + 360) % 360;
  // Live-Feedback, sobald der Nutzer (mit aktivem Sensor) grob zur Kaaba blickt.
  const aligned = available === true && (kaabaScreenAngle <= 8 || kaabaScreenAngle >= 352);

  // Haptischer Impuls genau beim Einrasten auf die Qibla (nur native).
  // Cooldown: beim Gehen pendelt das Heading durchs Ausrichtungsfenster —
  // ohne Sperrzeit vibrierte das Gerät bei jedem Schritt (Gerätefeedback).
  const wasAligned = useRef(false);
  const lastHapticAt = useRef(0);
  useEffect(() => {
    if (aligned && !wasAligned.current && Platform.OS !== 'web') {
      const now = Date.now();
      if (now - lastHapticAt.current > 5000) {
        lastHapticAt.current = now;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    wasAligned.current = aligned;
  }, [aligned]);

  async function useMyLocation() {
    const pos = await requestLocation();
    if (pos) {
      update({
        location: {
          ...pos,
          label: `${pos.lat.toFixed(3)}, ${pos.lon.toFixed(3)}`,
          city: settings.location.city,
          country: settings.location.country,
        },
      });
    }
  }

  // Kamera-Ansicht ersetzt den gesamten Screen-Inhalt. Alle Hooks oben laufen
  // weiter (useCompass ist fokus-gebunden und bleibt aktiv) — der Sensor
  // versorgt so auch die AR-Ansicht mit `heading`.
  if (arMode && arAvailable) {
    return (
      <QiblaArView
        heading={heading}
        bearing={bearing}
        available={available}
        needsCalibration={needsCalibration}
        onClose={() => setArMode(false)}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AnimatedListItem index={0}>
          <ThemedText type="title">{t('nav.qibla')}</ThemedText>
        </AnimatedListItem>
        <AnimatedListItem index={1}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {settings.location.label}
          </ThemedText>
        </AnimatedListItem>

        {/* Umschalter Kompass ↔ AR-Kamera — nur nativ (Web hat keine AR-Ansicht). */}
        {arAvailable && (
          <AnimatedListItem index={1}>
            <ThemedView type="backgroundElement" style={styles.modeToggle}>
              <Pressable
                onPress={() => setArMode(false)}
                accessibilityRole="button"
                accessibilityState={{ selected: !arMode }}
                style={[styles.modeButton, !arMode && styles.modeButtonActive]}>
                <IconSymbol
                  name="compass-outline"
                  size={16}
                  color={!arMode ? Brand.gold : Colors[scheme].textSecondary}
                />
                <ThemedText type="smallBold" themeColor={!arMode ? 'accent' : 'textSecondary'}>
                  {t('qibla.ar.compassTab')}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setArMode(true)}
                accessibilityRole="button"
                accessibilityState={{ selected: arMode }}
                style={[styles.modeButton, arMode && styles.modeButtonActive]}>
                <IconSymbol
                  name="camera-outline"
                  size={16}
                  color={arMode ? Brand.gold : Colors[scheme].textSecondary}
                />
                <ThemedText type="smallBold" themeColor={arMode ? 'accent' : 'textSecondary'}>
                  {t('qibla.ar.cameraTab')}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </AnimatedListItem>
        )}

        {needsPermission ? (
          // iOS-Safari braucht eine Nutzer-Geste, bevor Sensor-Daten fließen.
          <Pressable
            onPress={requestWebPermission}
            style={({ pressed }) => [
              styles.enableCompass,
              Platform.OS === 'web' && styles.pressableWeb,
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor="accent">
              {t('qibla.enableCompass')}
            </ThemedText>
          </Pressable>
        ) : (
          available === false && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
              {t('qibla.noMagnetometer')}
            </ThemedText>
          )
        )}

        {showCalibrationBanner && (
          <ThemedView type="backgroundElement" style={styles.calibrationBanner}>
            <IconSymbol name="compass-outline" size={18} color={Brand.gold} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.calibrationText}>
              {t('qibla.calibrateHint')}
            </ThemedText>
            <Pressable
              onPress={dismissCalibrationBanner}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.dismiss')}
              style={({ pressed }) => [Platform.OS === 'web' && styles.pressableWeb, pressed && styles.pressed]}>
              <IconSymbol name="close" size={16} color={Colors[scheme].textSecondary} />
            </Pressable>
          </ThemedView>
        )}

        <AnimatedListItem index={2} style={styles.compassWrap}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Fixer Zeiger oben = Blickrichtung des Geräts. */}
            <Path
              d={`M ${CENTER} 2 L ${CENTER + 9} 20 L ${CENTER - 9} 20 Z`}
              fill={aligned ? Brand.gold : cardinalFill}
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={aligned ? Brand.gold : 'rgba(212,175,55,0.4)'}
              strokeWidth={aligned ? 3 : 1}
            />
            {/* Rotierende Skala: Ticks + Himmelsrichtungen + Kaaba-Marke
                drehen sich gemeinsam mit dem Geräte-Heading. */}
            <G transform={`rotate(${dialRotation} ${CENTER} ${CENTER})`}>
              {TICKS.map(({ deg, major }) => (
                <Line
                  key={deg}
                  x1={CENTER}
                  y1={CENTER - RADIUS}
                  x2={CENTER}
                  y2={CENTER - RADIUS + (major ? 12 : 7)}
                  stroke={cardinalFill}
                  strokeWidth={major ? 2 : 1}
                  opacity={major ? 0.9 : 0.45}
                  transform={`rotate(${deg} ${CENTER} ${CENTER})`}
                />
              ))}
              {(
                [
                  { deg: 0, key: 'qibla.north', accent: true },
                  { deg: 90, key: 'qibla.east', accent: false },
                  { deg: 180, key: 'qibla.south', accent: false },
                  { deg: 270, key: 'qibla.west', accent: false },
                ] as const
              ).map(({ deg, key, accent }) => (
                <SvgText
                  key={key}
                  x={CENTER}
                  y={CENTER - RADIUS + 30}
                  textAnchor="middle"
                  fill={accent ? Brand.gold : cardinalFill}
                  fontSize={14}
                  fontWeight="700"
                  transform={`rotate(${deg} ${CENTER} ${CENTER})`}>
                  {t(key)}
                </SvgText>
              ))}
              {/* Kaaba sitzt fest auf der Skala beim Qibla-Bearing. */}
              <G transform={`rotate(${bearing} ${CENTER} ${CENTER})`}>
                <Line
                  x1={CENTER}
                  y1={CENTER - RADIUS + 40}
                  x2={CENTER}
                  y2={CENTER}
                  stroke={Brand.gold}
                  strokeWidth={2}
                  opacity={0.6}
                />
                <Circle cx={CENTER} cy={CENTER - RADIUS + 52} r={16} fill="rgba(212,175,55,0.16)" />
                <SvgText x={CENTER} y={CENTER - RADIUS + 58} textAnchor="middle" fontSize={17}>
                  🕋
                </SvgText>
              </G>
            </G>
            <Circle cx={CENTER} cy={CENTER} r={5} fill={Brand.gold} />
          </Svg>
        </AnimatedListItem>

        <AnimatedListItem index={3}>
          <ThemedText type="subtitle" themeColor="accent">
            {Math.round(bearing)}° · {t(`qibla.dir.${cardinalKey(bearing)}`)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('qibla.bearingInfo')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('qibla.distanceKm').replace('{km}', String(Math.round(distanceKm)))}
          </ThemedText>
          {available === true && (
            <ThemedText type="small" themeColor={aligned ? 'accent' : 'textSecondary'}>
              {aligned
                ? t('qibla.aligned')
                : t('qibla.deviceHeading').replace('{deg}', String(Math.round(heading)))}
            </ThemedText>
          )}

          {error && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
              {t('qibla.locationFailed')}
            </ThemedText>
          )}
        </AnimatedListItem>

        {/* Permanenter, dezenter Disclaimer - GETRENNT vom wegklickbaren
            Kalibrierungs-Banner oben (calibration.ts): dieser hier erklärt
            keinen Fehlerzustand, sondern setzt grundsätzlich die Erwartung,
            dass Magnetometer-Werte durch Umgebungsfaktoren (Metall,
            Elektronik) immer leicht schwanken können - bleibt daher immer
            sichtbar statt nur bei erkannter Instabilität. Nur bei
            available === false (kein Magnetometer im Gerät, s. noMagnetometer-
            Hinweis oben) ausgeblendet: der Disclaimer-Text spricht explizit
            von "Magnetometer-Daten deines Geräts" - ohne Magnetometer wäre
            das ein direkter Widerspruch zum Hinweis darüber. */}
        {available !== false && (
          <AnimatedListItem index={4}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.accuracyDisclaimer}>
              {t('qibla.accuracyDisclaimer')}
            </ThemedText>
          </AnimatedListItem>
        )}

        <AnimatedListItem index={5}>
          <Pressable
            onPress={useMyLocation}
            style={({ pressed }) => [
              styles.action,
              Platform.OS === 'web' && styles.pressableWeb,
              pressed && styles.pressed,
            ]}>
            <ThemedText type="link" themeColor="accent">
              {loading ? t('common.locating') : t('common.useLocation')}
            </ThemedText>
          </Pressable>
        </AnimatedListItem>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', paddingTop: Spacing.three, gap: Spacing.two },
  subtitle: { marginBottom: Spacing.three },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: Spacing.four,
    padding: Spacing.half,
    marginBottom: Spacing.three,
    gap: Spacing.half,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  modeButtonActive: { backgroundColor: 'rgba(212,175,55,0.16)' },
  notice: { textAlign: 'center', maxWidth: 320, marginBottom: Spacing.two },
  enableCompass: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  calibrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginHorizontal: Spacing.four,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  calibrationText: { flex: 1 },
  compassWrap: { marginVertical: Spacing.four },
  accuracyDisclaimer: { textAlign: 'center', maxWidth: 320, marginTop: Spacing.one, opacity: 0.75 },
  action: { marginTop: Spacing.three },
  pressableWeb: { cursor: 'pointer' },
  pressed: { opacity: 0.6 },
});
