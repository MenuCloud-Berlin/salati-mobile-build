import {
  ReciteProgress,
  advanceFrontier,
  promptWindow,
  splitExpectedWords,
} from './reciteProgress';
import { alignWords } from './similarity';

// Al-Fatiha-artige, bewusst eindeutige Wörter (keine Wiederholungen), damit das
// Alignment im Test deterministisch pro Wort-Index greift.
const EXPECTED = 'الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين';
const WORDS = splitExpectedWords(EXPECTED);

describe('promptWindow', () => {
  it('liefert am Anfang die ersten lookAhead-Wörter (kein negativer Start)', () => {
    const p = promptWindow(WORDS, 0, { lookBehind: 2, lookAhead: 3 });
    expect(p).toBe('الحمد لله رب');
  });

  it('wandert mit der Front mit und nimmt lookBehind-Kontext mit', () => {
    const p = promptWindow(WORDS, 4, { lookBehind: 2, lookAhead: 3 });
    // Fenster [4-2, 4+3) = Index 2,3,4,5,6
    expect(p).toBe('رب العالمين الرحمن الرحيم مالك');
  });

  it('klemmt am Ende (kein Überlauf über die Sure hinaus)', () => {
    const p = promptWindow(WORDS, WORDS.length, { lookBehind: 2, lookAhead: 5 });
    expect(p).toBe('يوم الدين');
  });
});

describe('advanceFrontier', () => {
  it('setzt die Front auf Index NACH dem letzten Treffer', () => {
    const alignment = alignWords('الحمد لله رب', EXPECTED);
    expect(advanceFrontier(0, alignment)).toBe(3);
  });

  it('ist monoton — fällt nicht zurück, wenn ein späteres Fenster frühe Wörter verliert', () => {
    // Simuliert das rollende Audio-Fenster: nur noch spätere Wörter sichtbar.
    const later = alignWords('الحمد لله', EXPECTED); // nur die ersten 2
    expect(advanceFrontier(5, later)).toBe(5);
  });

  it('bleibt bei fehlenden Treffern unverändert', () => {
    const alignment = alignWords('كلمة غريبة', EXPECTED);
    expect(advanceFrontier(3, alignment)).toBe(3);
  });
});

describe('ReciteProgress', () => {
  it('startet mit dem Prompt am Sure-Anfang', () => {
    const rp = new ReciteProgress(EXPECTED, { lookBehind: 2, lookAhead: 4 });
    expect(rp.position).toBe(0);
    expect(rp.prompt()).toBe('الحمد لله رب العالمين');
  });

  it('schiebt Prompt und Position vor, während erkannt wird', () => {
    const rp = new ReciteProgress(EXPECTED, { lookBehind: 2, lookAhead: 4 });
    rp.update('الحمد لله رب');
    expect(rp.position).toBe(3);
    // Fenster [1, 7): لله رب العالمين الرحمن الرحيم مالك
    expect(rp.prompt()).toBe('لله رب العالمين الرحمن الرحيم مالك');
  });

  it('rückt weiter vor, wenn ein späteres Fenster nur spätere Verse enthält', () => {
    const rp = new ReciteProgress(EXPECTED, { lookBehind: 2, lookAhead: 4 });
    rp.update('الحمد لله رب'); // Position 3
    rp.update('العالمين الرحمن'); // Index 3..4 → Position 5
    expect(rp.position).toBe(5);
  });

  it('springt NIE auf den Anfang zurück (Kern-Fix)', () => {
    const rp = new ReciteProgress(EXPECTED, { lookBehind: 2, lookAhead: 4 });
    rp.update('العالمين الرحمن الرحيم'); // Position 6
    rp.update('الحمد لله'); // Fenster fällt an den Anfang zurück → darf Position NICHT senken
    expect(rp.position).toBe(6);
  });

  it('ignoriert leere/nicht-arabische Teil-Transkripte', () => {
    const rp = new ReciteProgress(EXPECTED, { lookBehind: 2, lookAhead: 4 });
    rp.update('الحمد لله'); // Position 2
    rp.update('');
    rp.update('...');
    expect(rp.position).toBe(2);
  });
});
