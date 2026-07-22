// Native Variante des "Schnell-Modus" — Gegenstück zu speech.web.ts (Browser-
// SpeechRecognition-API).
//
// Entscheidung (siehe Abschluss-Bericht für die volle Begründung): KEIN
// zweites natives Spracherkennungs-Paket (z. B. @react-native-voice/voice
// oder expo-speech-recognition). Stattdessen leitet der Schnell-Modus intern
// auf dieselbe on-device-Whisper-Pipeline wie whisperCheck.ts (Präzisions-
// Modus) um — gleiches Modell, gleiche Mikrofon-Aufnahme
// (@fugood/react-native-audio-pcm-stream), EIN Transkriptions-Pass statt
// zwei Tempo-Varianten. Gründe: (1) keine zweite native Dependency = kleinere
// Angriffsfläche für genau die Art von Build-Bruch, vor der die Aufgabe
// ausdrücklich warnt (Kotlin-Plugin-Kollisionen etc.), (2) beide Modi liefern
// dadurch konsistente, vom selben Modell stammende Ergebnisse, (3) das
// bestehende Modus-Umschalten in app/hifz/[surah].tsx setzt ohnehin
// `whisperSupported() && recognitionAvailable()` voraus, um beide Chips
// anzuzeigen — mit getrennten Engines müssten beide unabhängig verfügbar UND
// beide Modelle geladen sein, was den Erst-Download verdoppelt hätte.
//
// Unterschied zum Präzisions-Modus: recognizeArabicAlternatives() hat (wie
// die Browser-SpeechRecognition-API) KEINE explizite stop()-Kontrolle vom
// Aufrufer (app/hifz/[surah].tsx ruft nur `await recognizeArabicAlternatives()`
// ohne Recorder-Referenz) — die Aufnahme muss also selbst erkennen, wann der
// Nutzer fertig ist. Einfache Energie-basierte Sprachpausen-Erkennung
// (RMS-Schwellwert + Stille-Debounce), kein echtes VAD-Modell — für kurze
// Einzelvers-Rezitationen ausreichend, siehe SILENCE_MS/MAX_LISTEN_MS unten.
//
// NICHT auf einem echten Android/iOS-Build verifiziert (siehe
// whisperCheck.ts-Kopfkommentar und Abschluss-Bericht).

import {
  SAMPLE_RATE,
  loadWhisperContext,
  startPcmCapture,
  transcribePcm,
  trimSilence,
  whisperSupported,
  type WhisperProgress,
} from './whisperCheck';

// Ab hier gilt: hat schon gesprochen (RMS über Schwelle) — danach beendet
// anhaltende Stille die Aufnahme automatisch. Bewusst niedrig (0.01), damit
// auch leise Quellen erkannt werden (User-Report: Wiedergabe vom 2. Handy /
// leises Rezitieren blieb unter 0.02 → "nichts erkannt").
const VOICE_RMS_THRESHOLD = 0.01;
// Wie lange Stille NACH erkannter Sprache toleriert wird, bevor automatisch
// gestoppt wird. Etwas länger (1200 ms), damit natürliche Vers-Pausen nicht
// vorschnell abbrechen.
const SILENCE_MS = 1200;
// Harte Obergrenze, falls nie Stille erkannt wird (Mikrofon-Rauschen o. Ä.).
const MAX_LISTEN_MS = 15000;
// Poll-Intervall der Stille-Prüfung.
const CHECK_INTERVAL_MS = 150;

export function recognitionAvailable(): boolean {
  return whisperSupported();
}

export async function recognizeArabicOnce(): Promise<string> {
  const alternatives = await recognizeArabicAlternatives();
  return alternatives[0] ?? '';
}

export interface RecognizeOptions {
  /** Erwarteter Ayah-Text als Conditioning-Prompt (s. transcribePcm). */
  expectedText?: string;
  onProgress?: (p: WhisperProgress) => void;
}

export interface StreamingOptions extends RecognizeOptions {
  /**
   * Wird während der Aufnahme wiederholt mit dem BISHER erkannten Text
   * aufgerufen — damit die UI den Vers Wort für Wort füllen kann ("leerer
   * Mushaf", app/hifz/[surah].tsx). Rein additiv: die finale Bewertung nutzt
   * weiter den vollständigen Durchlauf am Ende (unverändert robust).
   */
  onPartial?: (transcript: string) => void;
}

// Abstand zwischen Zwischen-Transkriptionen während der Aufnahme. Bewusst nicht
// zu klein: jede Transkription kostet Rechenzeit; das busy-Flag überspringt
// zudem Läufe, solange der vorige noch rechnet.
const PARTIAL_INTERVAL_MS = 1400;

/**
 * Wie recognizeArabicAlternatives, aber mit Live-Zwischenständen (onPartial)
 * während des Sprechens. Auto-Stopp per Sprechpause wie gehabt; die Rückgabe
 * ist das finale, vollständige Transkript (für die Bewertung).
 */
export async function recognizeArabicStreaming(options: StreamingOptions): Promise<string[]> {
  if (!recognitionAvailable()) throw new Error('speech_recognition_unavailable');

  const contextReady = loadWhisperContext(options.onProgress);
  let ctx: Awaited<ReturnType<typeof loadWhisperContext>> | null = null;
  contextReady.then((c) => (ctx = c)).catch(() => {});

  let hasSpeech = false;
  let lastVoicedAt = Date.now();
  const startedAt = Date.now();

  const capture = await startPcmCapture((chunk) => {
    if (rms(chunk) >= VOICE_RMS_THRESHOLD) {
      hasSpeech = true;
      lastVoicedAt = Date.now();
    }
  });

  // Live-Zwischen-Transkription: nur EIN Lauf gleichzeitig (busy), damit sich
  // nichts staut; erst ab ~0,6 s Audio sinnvoll.
  let partialBusy = false;
  const partialTimer = setInterval(() => {
    if (partialBusy || !ctx || !hasSpeech || !options.onPartial) return;
    const pcm16 = capture.snapshot();
    if (pcm16.length < SAMPLE_RATE * 0.6) return;
    partialBusy = true;
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;
    transcribePcm(trimSilence(float32), ctx, 'hifz-partial.wav', options.expectedText)
      .then((t) => {
        if (t && options.onPartial) options.onPartial(t);
      })
      .catch(() => undefined)
      .finally(() => {
        partialBusy = false;
      });
  }, PARTIAL_INTERVAL_MS);

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const now = Date.now();
      const silentLongEnough = hasSpeech && now - lastVoicedAt >= SILENCE_MS;
      const timedOut = now - startedAt >= MAX_LISTEN_MS;
      if (silentLongEnough || timedOut) {
        clearInterval(interval);
        resolve();
      }
    }, CHECK_INTERVAL_MS);
  });
  clearInterval(partialTimer);

  const pcm16 = capture.stopCapture();
  if (!hasSpeech) return [];
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;
  const trimmed = trimSilence(float32);
  const whisperContext = await contextReady;
  const text = await transcribePcm(trimmed, whisperContext, 'hifz-final-rec.wav', options.expectedText);
  return text ? [text] : [];
}

export interface ContinuousController {
  /** Beendet die kontinuierliche Erkennung und liefert das finale Transkript. */
  stop: () => Promise<string>;
}

export interface ContinuousOptions {
  /** Erwarteter Text (ganze Sure) als Conditioning-Prompt. */
  expectedText?: string;
  onProgress?: (p: WhisperProgress) => void;
  /** Wiederholt mit dem bisher erkannten Gesamt-Text (füllt den Mushaf). */
  onPartial: (transcript: string) => void;
}

// Kontinuierliche Erkennung für den „leeren Mushaf ganze Sure" (K): das Modell
// läuft DURCHGEHEND (kein Auto-Stopp bei Sprechpausen), transkribiert das bisher
// Gesagte periodisch und meldet es via onPartial — bis der Aufrufer stop()
// aufruft (Sure fertig / Nutzer drückt Stopp). Voraussetzung: Modell bereits
// geladen (der Screen gated darauf, s. app/hifz/recite-surah.tsx) — hier kein
// Download-während-Aufnahme.
const CONTINUOUS_INTERVAL_MS = 1500;

export async function recognizeArabicContinuous(options: ContinuousOptions): Promise<ContinuousController> {
  if (!recognitionAvailable()) throw new Error('speech_recognition_unavailable');

  const whisperContext = await loadWhisperContext(options.onProgress);
  const capture = await startPcmCapture();

  let stopped = false;
  let busy = false;
  const timer = setInterval(() => {
    if (busy || stopped) return;
    const pcm16 = capture.snapshot();
    if (pcm16.length < SAMPLE_RATE * 0.6) return;
    busy = true;
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;
    transcribePcm(trimSilence(float32), whisperContext, 'hifz-surah-partial.wav', options.expectedText)
      .then((t) => {
        if (t && !stopped) options.onPartial(t);
      })
      .catch(() => undefined)
      .finally(() => {
        busy = false;
      });
  }, CONTINUOUS_INTERVAL_MS);

  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      const pcm16 = capture.stopCapture();
      if (pcm16.length < SAMPLE_RATE * 0.4) return '';
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;
      return transcribePcm(trimSilence(float32), whisperContext, 'hifz-surah-final.wav', options.expectedText);
    },
  };
}

function rms(pcm: Int16Array): number {
  if (pcm.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < pcm.length; i++) {
    const normalized = pcm[i] / 0x8000;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / pcm.length);
}

/**
 * Nimmt bis zur erkannten Sprechpause (oder MAX_LISTEN_MS) auf und
 * transkribiert danach EINEN Durchlauf (kein Tempo-Varianten-Trick wie im
 * Präzisions-Modus — "schnell" bewusst leichtgewichtiger).
 */
export async function recognizeArabicAlternatives(
  options?: RecognizeOptions,
): Promise<string[]> {
  if (!recognitionAvailable()) throw new Error('speech_recognition_unavailable');

  // onProgress durchreichen — beim ersten Aufruf lädt sich das (grosse)
  // Koran-Modell herunter; der Aufrufer zeigt damit den Download-Fortschritt.
  const contextReady = loadWhisperContext(options?.onProgress);
  let hasSpeech = false;
  let lastVoicedAt = Date.now();
  const startedAt = Date.now();

  const capture = await startPcmCapture((chunk) => {
    if (rms(chunk) >= VOICE_RMS_THRESHOLD) {
      hasSpeech = true;
      lastVoicedAt = Date.now();
    }
  });

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const now = Date.now();
      const silentLongEnough = hasSpeech && now - lastVoicedAt >= SILENCE_MS;
      const timedOut = now - startedAt >= MAX_LISTEN_MS;
      if (silentLongEnough || timedOut) {
        clearInterval(interval);
        resolve();
      }
    }, CHECK_INTERVAL_MS);
  });

  const pcm16 = capture.stopCapture();
  if (!hasSpeech) return [];

  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 0x8000;
  const trimmed = trimSilence(float32);

  const whisperContext = await contextReady;
  const text = await transcribePcm(trimmed, whisperContext, 'hifz-fast-rec.wav', options?.expectedText);
  return text ? [text] : [];
}
