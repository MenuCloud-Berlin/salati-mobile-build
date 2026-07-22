// Nativer Retrieval-Test, 1:1 nach public/rag/suche.test.js portiert (siehe
// Kopfkommentar in retrieval.ts) — deckt die TS-Portierung unabhängig von der
// Web-Datei ab.
import { baueIndex, suche, sucheHybrid, tokens, norm, istArabisch, stemme, kosinus, int8ZuFloat, type KorpusDoc } from './retrieval';

const DOCS: KorpusDoc[] = [
  { id: 'q:2:153', src: 'Koran 2:153 (Al-Baqara)', t: 'O die ihr glaubt, sucht Hilfe in der Standhaftigkeit und im Gebet. Gewiss, Allah ist mit den Standhaften.' },
  { id: 'q:94:5', src: 'Koran 94:5 (Ash-Sharh)', t: 'So gewiss ist mit der Not Erleichterung.' },
  { id: 'd:morning', src: 'Dua: Asbahna wa asbahal-mulku lillah', t: 'Wir sind in den Morgen eingetreten und mit uns die Herrschaft Allahs.' },
  { id: 'h-nawawi-01', src: 'an-Nawawī Nr. 1', t: 'Die Taten sind allein nach den Absichten zu bemessen.' },
  { id: 'k-akhlaq-sabr', src: 'Salati-Kurs Akhlaq: Sabr — die Geduld', t: 'Sabr bedeutet, in Schwierigkeiten standhaft zu bleiben und auf Allahs Hilfe zu vertrauen.' },
];

describe('Retrieval-Grundlagen (nativ)', () => {
  test('findet Geduld-Quellen bei deutscher Frage', () => {
    const idx = baueIndex(DOCS);
    const treffer = suche(idx, 'Was sagt der Koran über Geduld?', 3);
    expect(treffer.length).toBeGreaterThan(0);
    expect(treffer.map((d) => d.id)).toContain('q:2:153');
  });

  test('leere/stopwortlastige Frage liefert keine Treffer', () => {
    const idx = baueIndex(DOCS);
    expect(suche(idx, 'was ist das denn so')).toEqual([]);
  });
});

describe('Arabisch-Modus (istArabisch, norm)', () => {
  test('istArabisch erkennt überwiegend arabische Eingabe', () => {
    expect(istArabisch('ما هو الصبر؟')).toBe(true);
  });

  test('istArabisch verneint deutsche Eingabe', () => {
    expect(istArabisch('Was sagt der Koran über Geduld?')).toBe(false);
  });

  test('istArabisch verneint leere Eingabe', () => {
    expect(istArabisch('')).toBe(false);
    expect(istArabisch(undefined)).toBe(false);
  });

  test('norm() löscht arabische Schriftzeichen NICHT', () => {
    expect(norm('صبر')).toContain('صبر');
  });

  test('tokens() auf reinem Arabisch ergibt nicht-leere Tokens', () => {
    expect(tokens('ما هو الصبر؟').length).toBeGreaterThan(0);
  });

  test('arabisches Brücken-Synonym findet dieselben Geduld-Quellen wie die deutsche Frage', () => {
    const idx = baueIndex(DOCS);
    const treffer = suche(idx, 'صبر', 3);
    expect(treffer.map((d) => d.id)).toContain('k-akhlaq-sabr');
  });

  test('stemme() lässt arabische Wörter unverändert', () => {
    expect(stemme('صبر')).toBe('صبر');
  });
});

describe('Stufe-2 Embedding-Kombination (sucheHybrid, aktuell ungenutzt)', () => {
  test('ohne Embeddings fällt sucheHybrid auf reine Keyword-Suche zurück', () => {
    const idx = baueIndex(DOCS);
    const treffer = sucheHybrid(idx, 'Was sagt der Koran über Geduld?', null, 3);
    expect(treffer.map((d) => d.id)).toEqual(suche(idx, 'Was sagt der Koran über Geduld?', 3).map((d) => d.id));
  });

  test('mit passenden Embeddings kombiniert sucheHybrid Keyword- und Cosine-Score', () => {
    const idx = baueIndex(DOCS);
    const dim = 4;
    const vektoren = new Float32Array(DOCS.length * dim);
    vektoren.set([0, 1, 0, 0], 4 * dim);
    const embeddings = { vektoren, dim, queryVektor: new Float32Array([0, 1, 0, 0]) };
    const treffer = sucheHybrid(idx, 'völlig andere Wortwahl ohne Übereinstimmung', embeddings, 1);
    expect(treffer[0]?.id).toBe('k-akhlaq-sabr');
  });

  test('sucheHybrid degradiert bei Dimensions-Mismatch auf Keyword-Suche', () => {
    const idx = baueIndex(DOCS);
    const embeddings = { vektoren: new Float32Array(4), dim: 4, queryVektor: new Float32Array(4) };
    const treffer = sucheHybrid(idx, 'Was sagt der Koran über Geduld?', embeddings, 3);
    expect(treffer.map((d) => d.id)).toEqual(suche(idx, 'Was sagt der Koran über Geduld?', 3).map((d) => d.id));
  });

  test('kosinus() = Skalarprodukt normalisierter Vektoren', () => {
    expect(kosinus(new Float32Array([1, 0]), new Float32Array([1, 0]))).toBeCloseTo(1);
    expect(kosinus(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBeCloseTo(0);
  });

  test('int8ZuFloat() dequantisiert -127..127 auf -1..1', () => {
    const out = int8ZuFloat(new Int8Array([127, -127, 0]));
    expect(out[0]).toBeCloseTo(1);
    expect(out[1]).toBeCloseTo(-1);
    expect(out[2]).toBeCloseTo(0);
  });
});
