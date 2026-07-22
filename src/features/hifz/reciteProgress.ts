// Gleitendes Prompt-Fenster + monotone Fortschritts-Front für die
// kontinuierliche Ganz-Sure-Erkennung (s. speech.ts / recite-surah.tsx).
//
// WARUM (Kern der Tarteel-Parität): whisper.rn reicht `initialPrompt` an
// whisper.cpp durch. Dort landet der Prompt bei ausgeschaltetem
// `carry_initial_prompt` (whisper.rn stellt die Option NICHT zur Verfügung →
// Default false) im DYNAMISCHEN Kontext `prompt_past1` und wird — begrenzt auf
// `n_text_ctx/2` (= 224 Tokens beim base-Modell) — nach den ersten ~224
// dekodierten Tokens vom eigenen Modell-Output verdrängt (whisper.cpp
// whisper_full_with_state, Zeilen ~6962 + ~7131). Folge: ein EINMALIGER
// Ganz-Sure-Prompt konditioniert nur die ersten Verse; danach rezitiert das
// Modell ohne erwarteten-Text-Anker weiter und „verliert den Faden" (exakt der
// User-Report). Lösung wie bei Tarteel: pro Erkennungsfenster einen KURZEN,
// mit dem Fortschritt MITWANDERNDEN Prompt (die nächsten erwarteten Wörter ab
// der zuletzt sicheren Position) neu setzen, statt einmal die ganze Sure.
//
// Reine Funktionen + eine kleine Zustandsklasse — testbar ohne Whisper/Mikro.

import { alignWords, normalizeArabic, type WordAlignment } from './similarity';

export interface PromptWindowConfig {
  /** Wörter Kontext HINTER der Front (Kontinuität für die Dekodierung). */
  lookBehind: number;
  /** Wörter Vorschau AB der Front (die als-nächstes-erwarteten Wörter). */
  lookAhead: number;
}

// ~48 Wörter Fenster: bleibt klar unter den 224 Prompt-Tokens (arabische Wörter
// ≈ 2–4 Tokens), sodass NICHTS vom relevanten Vorschau-Prompt abgeschnitten
// wird — anders als beim Ganz-Sure-Prompt. lookBehind hält den Übergang stabil.
export const DEFAULT_PROMPT_WINDOW: PromptWindowConfig = { lookBehind: 8, lookAhead: 40 };

/** Zerlegt den erwarteten Text in Roh-Wörter (mit Diakritika, für den Prompt). */
export function splitExpectedWords(expectedText: string): string[] {
  return expectedText.split(/\s+/).filter(Boolean);
}

/**
 * Prompt-Fenster [frontier-lookBehind, frontier+lookAhead) als zusammenhängender
 * Text — die als-nächstes-erwarteten Wörter, mit denen whisper.cpp das aktuelle
 * Audio-Fenster konditioniert.
 */
export function promptWindow(
  expectedWords: string[],
  frontier: number,
  cfg: PromptWindowConfig = DEFAULT_PROMPT_WINDOW,
): string {
  const start = Math.max(0, frontier - cfg.lookBehind);
  const end = Math.min(expectedWords.length, frontier + cfg.lookAhead);
  return expectedWords.slice(start, end).join(' ');
}

/**
 * Neue Fortschritts-Front aus einem Alignment: Index NACH dem letzten sicher
 * (exakt = 'hit') erkannten Ziel-Wort. MONOTON — fällt nie unter den vorherigen
 * Wert zurück (ein späteres Teil-Transkript deckt oft nur das rollende
 * Audio-Fenster ab und enthält frühe Wörter nicht mehr; ohne diese Sperre würde
 * die Front — und damit der Prompt — auf den Sure-Anfang zurückspringen, genau
 * der zu behebende „verliert den Faden"-Effekt).
 */
export function advanceFrontier(prev: number, alignment: WordAlignment[]): number {
  let lastHit = -1;
  for (let i = 0; i < alignment.length; i++) {
    if (alignment[i]?.status === 'hit') lastHit = i;
  }
  const candidate = lastHit + 1;
  return candidate > prev ? candidate : prev;
}

/**
 * Verfolgt die monoton fortschreitende Position innerhalb der erwarteten Sure
 * und liefert daraus das jeweils passende gleitende Prompt-Fenster.
 */
export class ReciteProgress {
  readonly expectedWords: string[];
  private frontier = 0;

  constructor(
    expectedText: string,
    private readonly cfg: PromptWindowConfig = DEFAULT_PROMPT_WINDOW,
  ) {
    this.expectedWords = splitExpectedWords(expectedText);
  }

  /** Aktuelle Wort-Position (Index NACH dem letzten sicher erkannten Wort). */
  get position(): number {
    return this.frontier;
  }

  /** Prompt für das NÄCHSTE Erkennungsfenster (mitwandernd). */
  prompt(): string {
    return promptWindow(this.expectedWords, this.frontier, this.cfg);
  }

  /**
   * Verarbeitet ein neues Teil-Transkript und rückt die Front monoton vor.
   * Gibt die neue Position zurück.
   */
  update(partialTranscript: string): number {
    if (!partialTranscript || normalizeArabic(partialTranscript) === '') return this.frontier;
    const alignment = alignWords(partialTranscript, this.expectedWords.join(' '));
    this.frontier = advanceFrontier(this.frontier, alignment);
    return this.frontier;
  }
}
