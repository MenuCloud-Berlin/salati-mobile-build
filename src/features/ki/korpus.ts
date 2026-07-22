// Lädt denselben Quellen-Korpus wie die Web-Version (public/ki.html holt ihn
// zur Laufzeit per fetch('/rag/korpus-de.json'); nativ gibt es keinen Server,
// darum wird dieselbe Datei hier als Metro-JSON-Asset importiert — EINE
// Quelle der Wahrheit, kein Duplikat. Landet dadurch (~1,4 MB) im JS-Bundle
// der App; das ist bewusst getrennt vom optionalen GGUF-Modell-Download
// (~1,1 GB, siehe model.ts), der NICHT im Bundle liegt.
import korpusJson from '../../../public/rag/korpus-de.json';
import { baueIndex, type Index, type KorpusDoc } from './retrieval';

interface KorpusDatei {
  v: number;
  lang: string;
  docs: KorpusDoc[];
}

let cachedIndex: Index | null = null;

/** Baut den BM25-Index einmalig (rein synchrone Berechnung, kein I/O nötig — anders als Web, wo erst gefetcht werden muss). */
export function ladeKorpusIndex(): Index {
  if (!cachedIndex) {
    const datei = korpusJson as KorpusDatei;
    cachedIndex = baueIndex(datei.docs);
  }
  return cachedIndex;
}
