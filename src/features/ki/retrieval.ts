// Salati KI — lokales Retrieval, 1:1 nach public/rag/suche.js portiert (BM25-lite
// + deutscher Light-Stemmer + Synonym-Expansion + Bigramm-Boost). Läuft nativ
// (kein Browser, kein DOM) — die Web-Version bleibt die separate JS-Datei
// public/rag/suche.js (Modul-Grenzen unterschiedlich: Web lädt per <script
// type="module">, nativ per Metro-Bundler). Bei Änderungen an der Such-Logik
// BEIDE Dateien synchron halten (suche.test.js deckt die Web-Seite ab,
// retrieval.test.ts diese Seite).
//
// sucheHybrid()/kosinus()/int8ZuFloat() sind mitportiert für Verhaltensparität
// und künftige Wiederverwendung, werden vom nativen KI-Screen aktuell aber
// NICHT aufgerufen — die Web-Version nutzt für Stufe 2 transformers.js/ONNX im
// Browser; ein äquivalentes On-Device-Embedding-Modell zusätzlich zu llama.rn
// einzubinden würde die App-Größe/Komplexität für die erste native Version
// unverhältnismäßig erhöhen. Reine Keyword-Suche (suche()) ist bereits die
// Stufe-1-Grundlage, die auch die Web-Version ohne WebGPU verwendet.

export interface KorpusDoc {
  id: string;
  src: string;
  t: string;
}

interface IndexedDoc extends KorpusDoc {
  tok: string[];
}

export interface Index {
  docs: IndexedDoc[];
  df: Map<string, number>;
  avg: number;
}

export const STOP = new Set(
  (
    'der die das und oder ist sind war waren ein eine einen dem den des im in an auf mit für von zu über was wie wer wo aber auch nicht man es er sie ich du wir ihr euch uns sich hat haben wird werden bei aus nach vor doch denn dass wenn als so um am zum zur ' +
    // Frage-Füllwörter, die in Chat-Fragen dominieren, aber keine Inhalte tragen:
    'gegen ohne sein seine seiner seinem kann soll sollte darf muss gibt sagt steht hilft helfen macht tun etwas jemand alles diese dieser dieses damit dazu dabei dann noch nur schon sehr mehr viel viele immer welche welcher welches warum wieso weshalb wann islam koran'
  ).split(' '),
);

// Arabischer Unicode-Block (Basis + Supplement + Presentation Forms A/B) wird
// NICHT weggefiltert — siehe Kommentar in suche.js für die Historie des Bugs,
// den das behebt (arabische Fragen ergaben vorher 0 Tokens).
const ARABISCH_BEREICH = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFC';
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(new RegExp(`[^a-z0-9äöüß${ARABISCH_BEREICH} ]`, 'gi'), ' ');

const ARABISCH_BUCHSTABE = new RegExp(`[${ARABISCH_BEREICH}]`);
const BUCHSTABE = /\p{L}/u;
export function istArabisch(text: string | undefined): boolean {
  const buchstaben = [...(text ?? '')].filter((c) => BUCHSTABE.test(c));
  if (buchstaben.length === 0) return false;
  const arabisch = buchstaben.filter((c) => ARABISCH_BUCHSTABE.test(c));
  return arabisch.length / buchstaben.length > 0.5;
}

// Deutscher Light-Stemmer: Suffixe abschneiden (längste zuerst), nur wenn Reststamm >= 4 Zeichen.
const SUFFIXE = ['heiten', 'keiten', 'ungen', 'igen', 'lich', 'isch', 'heit', 'keit', 'ung', 'ige', 'ern', 'ig', 'en', 'er', 'es', 'em', 'e', 'n', 's'];
export function stemme(w: string): string {
  let wieder = true;
  while (wieder) {
    wieder = false;
    for (const suf of SUFFIXE) {
      if (w.length - suf.length >= 4 && w.endsWith(suf)) {
        w = w.slice(0, w.length - suf.length);
        wieder = true;
        break;
      }
    }
  }
  return w;
}

export const tokens = (s: string): string[] =>
  norm(s)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stemme);

// Kuratierte Synonym-/Begriffsgruppen (islamisches Vokabular).
const SYNONYM_GRUPPEN = [
  ['geduld', 'sabr', 'standhaft', 'ausharren', 'erdulden', 'صبر', 'الصبر'],
  ['gebet', 'salat', 'beten', 'anbetung', 'صلاة', 'الصلاة'],
  ['fasten', 'sawm', 'ramadan', 'صيام', 'رمضان', 'الصيام'],
  ['almosen', 'zakat', 'spende', 'mildtätigkeit', 'زكاة', 'الزكاة'],
  ['pilgerfahrt', 'hajj', 'hadsch', 'حج', 'الحج'],
  ['vergebung', 'tauba', 'reue', 'verzeihen', 'vergib', 'توبة', 'التوبة'],
  ['paradies', 'dschanna', 'garten', 'gärten', 'جنة', 'الجنة'],
  ['hölle', 'feuer', 'dschahannam', 'جهنم', 'النار'],
  ['eltern', 'mutter', 'vater', 'الوالدين'],
  ['prophet', 'gesandter', 'نبي', 'النبي', 'رسول', 'الرسول'],
  ['wissen', 'ilm', 'lernen', 'علم', 'العلم'],
  ['tod', 'sterben', 'jenseits', 'auferstehung', 'موت', 'الموت'],
  ['dankbarkeit', 'schukr', 'dankbar', 'dank', 'شكر', 'الشكر'],
  ['angst', 'furcht', 'sorge', 'sorgen', 'kummer', 'خوف', 'الخوف'],
  ['hoffnung', 'zuversicht', 'رجاء', 'أمل', 'الأمل'],
  ['barmherzigkeit', 'rahma', 'gnade', 'gnädig', 'رحمة', 'الرحمة'],
  ['gottvertrauen', 'tawakkul', 'verlassen', 'verlässt', 'vertraut', 'توكل', 'التوكل'],
];

// Lookup auf Stemm-Ebene: gestemmter Begriff -> Set gestemmter Synonyme (ohne sich selbst).
export const SYNONYME = new Map<string, Set<string>>();
for (const gruppe of SYNONYM_GRUPPEN) {
  const stems = [...new Set(gruppe.map((w) => stemme(norm(w).trim())))];
  for (const s of stems) {
    if (!SYNONYME.has(s)) SYNONYME.set(s, new Set());
    for (const other of stems) if (other !== s) SYNONYME.get(s)!.add(other);
  }
}

export function baueIndex(docs: KorpusDoc[]): Index {
  const D: IndexedDoc[] = docs.map((d) => ({ ...d, tok: tokens((d.src ?? '') + ' ' + d.t) }));
  const df = new Map<string, number>();
  for (const d of D) for (const w of new Set(d.tok)) df.set(w, (df.get(w) ?? 0) + 1);
  const avg = D.reduce((a, d) => a + d.tok.length, 0) / (D.length || 1);
  return { docs: D, df, avg };
}

const trefferZahl = (tok: string[], w: string, exakt: boolean) =>
  tok.filter((x) => x === w || (!exakt && w.length > 4 && x.length > 4 && x.startsWith(w.slice(0, 5)))).length;

function rohScores(index: Index, frage: string): [number, number][] {
  const q = tokens(frage);
  if (q.length === 0) return [];
  const qSet = new Set(q);
  const expansion = new Set<string>();
  for (const w of q) for (const syn of SYNONYME.get(w) ?? []) if (!qSet.has(syn)) expansion.add(syn);
  const terme: [string, number][] = [...q.map((w): [string, number] => [w, 1]), ...[...expansion].map((w): [string, number] => [w, 0.5])];
  const bigramme: [string, string][] = [];
  for (let i = 0; i + 1 < q.length; i++) if (q[i] !== q[i + 1]) bigramme.push([q[i]!, q[i + 1]!]);

  const { docs, df, avg } = index;
  const N = docs.length;
  const k1 = 1.4;
  const b = 0.6;
  const scored: [number, number][] = [];
  for (let di = 0; di < docs.length; di++) {
    const d = docs[di]!;
    let s = 0;
    for (const [w, gewicht] of terme) {
      const tf = trefferZahl(d.tok, w, gewicht < 1);
      if (!tf) continue;
      const dfw = df.get(w) ?? 1;
      const idf = Math.log(1 + (N - dfw + 0.5) / (dfw + 0.5));
      s += (gewicht * idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + (b * d.tok.length) / avg));
    }
    if (s <= 0) continue;
    if (bigramme.length) {
      let boost = false;
      for (const [a, z] of bigramme) {
        for (let i = 0; i + 1 < d.tok.length; i++) {
          if (d.tok[i] === a && d.tok[i + 1] === z) {
            boost = true;
            break;
          }
        }
        if (boost) break;
      }
      if (boost) s *= 1.3;
    }
    scored.push([s, di]);
  }
  return scored;
}

export function suche(index: Index, frage: string, n = 6): KorpusDoc[] {
  const scored = rohScores(index, frage);
  scored.sort((a, z) => z[0] - a[0]);
  return scored.slice(0, n).map(([, di]) => index.docs[di]!);
}

// ---------- Stufe 2: Embedding-Re-Ranking (ungenutzt nativ, s. Kopfkommentar) ----------
export function kosinus(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

export function int8ZuFloat(int8arr: Int8Array): Float32Array {
  const out = new Float32Array(int8arr.length);
  for (let i = 0; i < int8arr.length; i++) out[i] = int8arr[i]! / 127;
  return out;
}

export interface Embeddings {
  vektoren: Float32Array;
  dim: number;
  queryVektor: Float32Array;
}

export function sucheHybrid(index: Index, frage: string, embeddings: Embeddings | null, n = 6, gewichtEmbedding = 0.35): KorpusDoc[] {
  if (!embeddings || embeddings.vektoren.length !== index.docs.length * embeddings.dim) {
    return suche(index, frage, n);
  }
  const keyword = rohScores(index, frage);
  if (keyword.length === 0 && !embeddings.queryVektor) return [];

  const { vektoren, dim, queryVektor } = embeddings;
  const maxKw = keyword.reduce((m, [s]) => Math.max(m, s), 0) || 1;
  const kombiniert = new Map<number, number>();
  for (const [s, di] of keyword) kombiniert.set(di, (s / maxKw) * (1 - gewichtEmbedding));

  let maxCos = 1e-9;
  const cos = new Array<number>(index.docs.length);
  for (let di = 0; di < index.docs.length; di++) {
    const off = di * dim;
    let dot = 0;
    for (let k = 0; k < dim; k++) dot += vektoren[off + k]! * queryVektor[k]!;
    cos[di] = dot;
    if (dot > maxCos) maxCos = dot;
  }
  for (let di = 0; di < cos.length; di++) {
    const normd = Math.max(0, cos[di]! / maxCos);
    if (normd <= 0) continue;
    kombiniert.set(di, (kombiniert.get(di) ?? 0) + normd * gewichtEmbedding);
  }

  return [...kombiniert.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, z) => z[1] - a[1])
    .slice(0, n)
    .map(([di]) => index.docs[di]!);
}
