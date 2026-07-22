// Salati KI — lokales Retrieval (BM25-lite + deutscher Light-Stemmer + Synonym-Expansion + Bigramm-Boost)
// ES-Modul, läuft im Browser (ki.html) und in Node (Tests).

export const STOP = new Set(('der die das und oder ist sind war waren ein eine einen dem den des im in an auf mit für von zu über was wie wer wo aber auch nicht man es er sie ich du wir ihr euch uns sich hat haben wird werden bei aus nach vor doch denn dass wenn als so um am zum zur ' +
  // Frage-Füllwörter, die in Chat-Fragen dominieren, aber keine Inhalte tragen:
  'gegen ohne sein seine seiner seinem kann soll sollte darf muss gibt sagt steht hilft helfen macht tun etwas jemand alles diese dieser dieses damit dazu dabei dann noch nur schon sehr mehr viel viele immer welche welcher welches warum wieso weshalb wann islam koran').split(' '));

// Arabischer Unicode-Block (Basis + Supplement + Presentation Forms A/B) wird
// NICHT mehr weggefiltert (vorher landete jedes arabische Schriftzeichen im
// "alles außer a-z0-9äöüß"-Ausschluss und wurde durch Leerzeichen ersetzt ->
// eine rein arabisch geschriebene Frage ergab 0 Tokens -> suche() gab sofort
// [] zurück, unabhängig vom Inhalt). Arabische Wörter werden dadurch als
// eigene Tokens erhalten (der Stemmer unten greift nicht, da seine Suffixe
// lateinische Zeichenketten sind - arabische Wörter bleiben unverändert).
const ARABISCH_BEREICH = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFC';
export const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(new RegExp(`[^a-z0-9äöüß${ARABISCH_BEREICH} ]`, 'gi'), ' ');

// Einfache Unicode-Range-Heuristik (kein NLP nötig): Anteil arabischer
// Buchstaben an allen Buchstaben in der Roheingabe. Wird für den
// Arabisch-Modus in ki.html verwendet (RTL-Darstellung, Hinweistext) - die
// Retrieval-Gewichtung selbst braucht keinen Sonderfall, weil arabische
// Suchbegriffe über SYNONYME (s. u.) automatisch auf die passenden
// deutschen/transliterierten Korpus-Begriffe gemappt werden.
const ARABISCH_BUCHSTABE = new RegExp(`[${ARABISCH_BEREICH}]`);
const BUCHSTABE = /\p{L}/u;
export function istArabisch(text) {
  const buchstaben = [...(text ?? '')].filter((c) => BUCHSTABE.test(c));
  if (buchstaben.length === 0) return false;
  const arabisch = buchstaben.filter((c) => ARABISCH_BUCHSTABE.test(c));
  return arabisch.length / buchstaben.length > 0.5;
}

// Deutscher Light-Stemmer: Suffixe abschneiden (längste zuerst), nur wenn Reststamm >= 4 Zeichen.
// Iterativ, damit z. B. "morgens" -> "morgen" -> "morg" denselben Stamm ergibt wie "morgen" -> "morg".
const SUFFIXE = ['heiten', 'keiten', 'ungen', 'igen', 'lich', 'isch', 'heit', 'keit', 'ung', 'ige', 'ern', 'ig', 'en', 'er', 'es', 'em', 'e', 'n', 's'];
export function stemme(w) {
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

export const tokens = (s) => norm(s).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stemme);

// Kuratierte Synonym-/Begriffsgruppen (islamisches Vokabular). Jede Gruppe wirkt in beide Richtungen.
// Der Korpus (korpus-de.json) enthält KEINEN arabischen Text (geprüft: 0 von
// 6.643 Docs), daher kann die Retrieval-Gewichtung keine "arabischen
// Quellen" bevorzugen - es gibt keine. Was stattdessen sinnvoll ist und hier
// passiert: arabisch-schriftliche Begriffe werden als Brücken-Synonyme in
// die bestehenden Gruppen aufgenommen, damit z. B. eine Frage mit "صبر"
// über die Synonym-Expansion trotzdem die deutschen "Geduld"-Quellen findet.
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
  // Bubenheim übersetzt tawakkul als "sich (auf Allah) verlassen".
  // Bewusst "vertraut" statt "vertrauen": der Stamm von "vertrauen" kollidiert mit "vertraulich(e Gespräche)".
  ['gottvertrauen', 'tawakkul', 'verlassen', 'verlässt', 'vertraut', 'توكل', 'التوكل'],
];

// Lookup auf Stemm-Ebene: gestemmter Begriff -> Set gestemmter Synonyme (ohne sich selbst).
export const SYNONYME = new Map();
for (const gruppe of SYNONYM_GRUPPEN) {
  const stems = [...new Set(gruppe.map((w) => stemme(norm(w).trim())))];
  for (const s of stems) {
    if (!SYNONYME.has(s)) SYNONYME.set(s, new Set());
    for (const other of stems) if (other !== s) SYNONYME.get(s).add(other);
  }
}

// Index über Dokumente {id, src, t} aufbauen. src wird mit indexiert,
// damit z. B. "Dua", "Nawawi" oder Suren-Namen als Suchbegriffe funktionieren.
export function baueIndex(docs) {
  const D = docs.map((d) => ({ ...d, tok: tokens((d.src ?? '') + ' ' + d.t) }));
  const df = new Map();
  for (const d of D) for (const w of new Set(d.tok)) df.set(w, (df.get(w) ?? 0) + 1);
  const avg = D.reduce((a, d) => a + d.tok.length, 0) / (D.length || 1);
  return { docs: D, df, avg };
}

const trefferZahl = (tok, w, exakt) =>
  tok.filter((x) => x === w || (!exakt && w.length > 4 && x.length > 4 && x.startsWith(w.slice(0, 5)))).length;

// BM25-lite-Rohbewertung mit Synonym-Expansion (Gewicht 0,5) und
// Bigramm-Boost (+30 %). Gibt ein Array [score, docIndex] zurück (nur Docs
// mit score > 0), docIndex = Position in index.docs - wird von suche() UND
// von sucheHybrid() (Embedding-Kombination, s. u.) verwendet, damit beide
// exakt dieselbe Keyword-Bewertung nutzen.
function rohScores(index, frage) {
  const q = tokens(frage);
  if (q.length === 0) return [];
  const qSet = new Set(q);
  // Expansions-Terme: Synonyme der Query-Tokens, Gewicht 0,5.
  const expansion = new Set();
  for (const w of q) for (const syn of SYNONYME.get(w) ?? []) if (!qSet.has(syn)) expansion.add(syn);
  const terme = [...q.map((w) => [w, 1]), ...[...expansion].map((w) => [w, 0.5])];
  // Query-Bigramme (direkt aufeinanderfolgende Tokens).
  const bigramme = [];
  for (let i = 0; i + 1 < q.length; i++) if (q[i] !== q[i + 1]) bigramme.push([q[i], q[i + 1]]);

  const { docs, df, avg } = index;
  const N = docs.length, k1 = 1.4, b = 0.6;
  const scored = [];
  for (let di = 0; di < docs.length; di++) {
    const d = docs[di];
    let s = 0;
    for (const [w, gewicht] of terme) {
      // Synonym-Expansions-Terme nur exakt matchen (kein Präfix-Fuzzing auf Synonyme).
      const tf = trefferZahl(d.tok, w, gewicht < 1);
      if (!tf) continue;
      const dfw = df.get(w) ?? 1;
      const idf = Math.log(1 + (N - dfw + 0.5) / (dfw + 0.5));
      s += gewicht * idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * d.tok.length / avg));
    }
    if (s <= 0) continue;
    // Bigramm-Boost: zwei Query-Tokens direkt hintereinander im Dokument -> +30 %.
    if (bigramme.length) {
      let boost = false;
      for (const [a, z] of bigramme) {
        for (let i = 0; i + 1 < d.tok.length; i++) {
          if (d.tok[i] === a && d.tok[i + 1] === z) { boost = true; break; }
        }
        if (boost) break;
      }
      if (boost) s *= 1.3;
    }
    scored.push([s, di]);
  }
  return scored;
}

export function suche(index, frage, n = 6) {
  const scored = rohScores(index, frage);
  scored.sort((a, z) => z[0] - a[0]);
  return scored.slice(0, n).map(([, di]) => index.docs[di]);
}

// ---------- Stufe 2: Embedding-Re-Ranking (siehe scripts/generate-ki-embeddings.mjs) ----------
// Cosine-Similarity zweier gleich langer, bereits unit-normalisierter Vektoren
// ist einfach das Skalarprodukt.
export function kosinus(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// int8-quantisierte Embeddings (Werte -127..127, s. embeddings-de.meta.json
// quant:'int8') zu Float32 dequantisieren. Embeddings wurden vor der
// Quantisierung bereits L2-normalisiert -> Werte lagen in [-1, 1] -> /127.
export function int8ZuFloat(int8arr) {
  const out = new Float32Array(int8arr.length);
  for (let i = 0; i < int8arr.length; i++) out[i] = int8arr[i] / 127;
  return out;
}

// Kombiniert das bestehende Keyword-/BM25-Retrieval mit vorberechneten
// Korpus-Embeddings + einem zur Laufzeit berechneten Query-Embedding
// (gewichtete Summe, ersetzt rohScores() NICHT). embeddings = null ->
// Fallback auf reine Keyword-Suche (z. B. wenn transformers.js/Embeddings
// noch nicht geladen sind oder der Korpus seit der letzten
// Embedding-Generierung gewachsen ist).
// embeddings: { vektoren: Float32Array (docs.length * dim, dequantisiert),
//               dim: number, queryVektor: Float32Array (dim) }
export function sucheHybrid(index, frage, embeddings, n = 6, gewichtEmbedding = 0.35) {
  if (!embeddings || embeddings.vektoren.length !== index.docs.length * embeddings.dim) {
    return suche(index, frage, n);
  }
  const keyword = rohScores(index, frage);
  if (keyword.length === 0 && !embeddings.queryVektor) return [];

  const { vektoren, dim, queryVektor } = embeddings;
  const maxKw = keyword.reduce((m, [s]) => Math.max(m, s), 0) || 1;
  const kombiniert = new Map(); // docIndex -> Score
  for (const [s, di] of keyword) kombiniert.set(di, (s / maxKw) * (1 - gewichtEmbedding));

  // Cosine-Sim gegen den GESAMTEN Korpus (nicht nur Keyword-Kandidaten) -
  // genau das ist der Mehrwert von Stufe 2: rein semantische Treffer ohne
  // Wortüberlappung mit der Frage werden so trotzdem gefunden.
  let maxCos = 1e-9;
  const cos = new Array(index.docs.length);
  for (let di = 0; di < index.docs.length; di++) {
    const off = di * dim;
    let dot = 0;
    for (let k = 0; k < dim; k++) dot += vektoren[off + k] * queryVektor[k];
    cos[di] = dot;
    if (dot > maxCos) maxCos = dot;
  }
  for (let di = 0; di < cos.length; di++) {
    const norm = Math.max(0, cos[di] / maxCos);
    if (norm <= 0) continue;
    kombiniert.set(di, (kombiniert.get(di) ?? 0) + norm * gewichtEmbedding);
  }

  return [...kombiniert.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, z) => z[1] - a[1])
    .slice(0, n)
    .map(([di]) => index.docs[di]);
}
