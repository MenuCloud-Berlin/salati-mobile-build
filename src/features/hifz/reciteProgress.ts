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
// ZWEITER (getrennter) Hebel — POSITIONS-Kopplung des Matchings (User-Bug
// 2026-07-22 „ein Wort aus Vers 1 wird beim Vers 7 als Treffer gewertet"):
// Das Aufdecken darf ein gesprochenes Wort NUR einem erwarteten Wort NAHE der
// aktuellen Rezitationsstelle zuordnen — nicht global der ganzen Sure. Sonst
// trifft ein (gleichlautendes) Wort irgendwo weit vorne/hinten. Deshalb wird
// das Alignment auf ein enges Fenster um die Front beschränkt (windowedReveal)
// statt global über den kompletten Sure-Text (früher: alignWords(partial,
// expectedFull) in recite-surah.tsx). Bewusst ZWEI Fenster: eng fürs Matching,
// weit für den Prompt (mehr Vorschau schadet der Konditionierung nicht).
//
// Reine Funktionen + eine kleine Zustandsklasse — testbar ohne Whisper/Mikro.

import { alignWords, normalizeArabic } from './similarity';

export interface WindowConfig {
  /** Wörter Kontext HINTER der Front (Kontinuität). */
  lookBehind: number;
  /** Wörter Vorschau AB der Front. */
  lookAhead: number;
}

// Enges Fenster für die POSITIONS-Kopplung des Matchings + der Fortschritts-
// Front. Bewusst klein: ein gesprochenes Wort darf nur als Treffer eines
// erwarteten Wortes NAHE der aktuellen Stelle zählen — nie als Treffer eines
// weit entfernten gleichlautenden Wortes. lookBehind hält den Übergang stabil,
// lookAhead gibt genug Spielraum für flüssiges Rezitieren, ohne die ganze Sure
// zu öffnen (Al-Fatiha ≈ 29 Wörter → 16-Wort-Fenster koppelt trotzdem eng).
export const DEFAULT_MATCH_WINDOW: WindowConfig = { lookBehind: 4, lookAhead: 12 };

// Weites Fenster NUR für den Conditioning-Prompt (whisper.cpp-Kontext) — hier
// hilft mehr Vorschau, s. Kopfkommentar. Bleibt klar unter den 224 Prompt-
// Tokens (arabische Wörter ≈ 2–4 Tokens).
export const DEFAULT_PROMPT_WINDOW: WindowConfig = { lookBehind: 8, lookAhead: 40 };

export interface RevealedWord {
  /** Globaler Wort-Index in der Sure (über alle Verse hinweg). */
  index: number;
  status: 'hit' | 'near';
}

/** Zerlegt den erwarteten Text in Roh-Wörter (mit Diakritika, für Prompt/Anzeige). */
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
  cfg: WindowConfig = DEFAULT_PROMPT_WINDOW,
): string {
  const start = Math.max(0, frontier - cfg.lookBehind);
  const end = Math.min(expectedWords.length, frontier + cfg.lookAhead);
  return expectedWords.slice(start, end).join(' ');
}

/**
 * Richtet ein Teil-Transkript NUR innerhalb des Fensters
 * [frontier-lookBehind, frontier+lookAhead) an den erwarteten Wörtern aus und
 * liefert globale Treffer (hit/near) + die neue, monoton fortschreitende Front.
 *
 * Kern der Positions-Kopplung: außerhalb des Fensters liegende (auch
 * gleichlautende) Wörter können NICHT getroffen/aufgedeckt werden — ein Wort
 * aus Vers 1 kann so nie ein Wort in Vers 7 „treffen".
 *
 * Front NUR an exakten Treffern (hit) vorrücken, monoton (nie zurück): ein
 * unsicherer near soll die Front nicht verfrüht schieben; einen einzelnen
 * near-„Loch" überspringt ein späterer echter Treffer ohnehin (lastHit+1).
 */
export function windowedReveal(
  partial: string,
  expectedWords: string[],
  frontier: number,
  cfg: WindowConfig = DEFAULT_MATCH_WINDOW,
): { reveals: RevealedWord[]; frontier: number } {
  if (!partial || normalizeArabic(partial) === '') return { reveals: [], frontier };
  const start = Math.max(0, frontier - cfg.lookBehind);
  const end = Math.min(expectedWords.length, frontier + cfg.lookAhead);
  if (start >= end) return { reveals: [], frontier };

  const windowText = expectedWords.slice(start, end).join(' ');
  const aligned = alignWords(partial, windowText);

  const reveals: RevealedWord[] = [];
  let lastHit = -1;
  for (let k = 0; k < aligned.length; k++) {
    const st = aligned[k]?.status;
    if (st === 'hit') {
      reveals.push({ index: start + k, status: 'hit' });
      lastHit = k;
    } else if (st === 'near') {
      reveals.push({ index: start + k, status: 'near' });
    }
  }
  const candidate = lastHit >= 0 ? start + lastHit + 1 : frontier;
  return { reveals, frontier: candidate > frontier ? candidate : frontier };
}

/**
 * Verfolgt die monoton fortschreitende Position innerhalb der erwarteten Sure
 * und liefert daraus (a) das gleitende Prompt-Fenster und (b) je Teil-Transkript
 * die positions-gekoppelten Aufdeck-Treffer.
 */
export class ReciteProgress {
  readonly expectedWords: string[];
  private frontier = 0;

  constructor(
    expectedText: string,
    private readonly matchCfg: WindowConfig = DEFAULT_MATCH_WINDOW,
    private readonly promptCfg: WindowConfig = DEFAULT_PROMPT_WINDOW,
  ) {
    this.expectedWords = splitExpectedWords(expectedText);
  }

  /** Aktuelle Wort-Position (Index NACH dem letzten sicher erkannten Wort). */
  get position(): number {
    return this.frontier;
  }

  /** Prompt für das NÄCHSTE Erkennungsfenster (mitwandernd, weites Fenster). */
  prompt(): string {
    return promptWindow(this.expectedWords, this.frontier, this.promptCfg);
  }

  /**
   * Verarbeitet ein neues Teil-Transkript: rückt die Front positions-gekoppelt
   * und monoton vor und gibt die in DIESEM Fenster erkannten Wörter (global
   * indiziert, hit/near) für die UI-Aufdeckung zurück.
   */
  ingest(partial: string): RevealedWord[] {
    const { reveals, frontier } = windowedReveal(
      partial,
      this.expectedWords,
      this.frontier,
      this.matchCfg,
    );
    this.frontier = frontier;
    return reveals;
  }

  /**
   * Nur die Front vorrücken (Rückgabe = neue Position), ohne die Reveals zu
   * nutzen — dünner Wrapper um ingest() für Aufrufer, die lediglich den Prompt
   * mitführen wollen.
   */
  update(partial: string): number {
    this.ingest(partial);
    return this.frontier;
  }
}
