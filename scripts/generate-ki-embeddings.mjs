// Einmalig auszuführen, wenn sich apps/mobile/public/rag/korpus-de.json ändert
// (neue/geänderte Quellen-Passagen für die Salati KI /ki).
//
// Erzeugt vorberechnete, int8-quantisierte Satz-Embeddings für die
// Stufe-2-Semantiksuche (Cosine-Similarity, kombiniert mit dem bestehenden
// Keyword-/BM25-Retrieval in public/rag/suche.js — ersetzt es NICHT).
//
// Modell: Xenova/multilingual-e5-small (384-dim, ~118 MB int8-ONNX).
// Ausprobiert wurde zuerst das kleinere Xenova/all-MiniLM-L6-v2 (~23 MB) —
// das ist aber englisch-trainiert und lieferte auf dem überwiegend
// deutschen Korpus bei Stichproben irrelevante Top-Treffer (z. B. bei
// "Was tun bei Streit in der Ehe?" thematisch beliebige Verse statt Koran
// 4:35/4:128, die genau davon handeln). multilingual-e5-small liefert auf
// denselben Stichproben deutlich relevantere Treffer (0.83+ statt 0.4-0.5
// Cosine-Sim, inhaltlich passend) — Qualität wiegt hier schwerer als die
// zusätzlichen ~95 MB, siehe Trade-off-Dokumentation im Abschlussbericht.
// E5-Konvention: Passagen mit "passage: " prefixen, Queries mit "query: ".
//
// Ausführen: cd apps/mobile && node scripts/generate-ki-embeddings.mjs
// Benötigt @huggingface/transformers als devDependency (bereits in package.json).
import { pipeline } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const RAG_DIR = path.join(HIER, '..', 'public', 'rag');
const KORPUS_PFAD = path.join(RAG_DIR, 'korpus-de.json');
const MODELL = 'Xenova/multilingual-e5-small';
const DIM = 384;

async function main() {
  const korpus = JSON.parse(readFileSync(KORPUS_PFAD, 'utf8'));
  const docs = korpus.docs;
  console.log(`Lade ${docs.length.toLocaleString('de')} Dokumente, Modell ${MODELL} …`);

  const extractor = await pipeline('feature-extraction', MODELL, { dtype: 'q8' });

  const int8 = new Int8Array(docs.length * DIM);
  const BATCH = 64;
  const start = Date.now();
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    // Gleicher Text wie im Retrieval-Index (src + t), s. baueIndex() in suche.js —
    // so trägt auch die Quellenangabe (z. B. Suren-/Kursname) zum Embedding bei.
    // "passage: "-Prefix ist E5-Konvention (asymmetrische Query/Passage-Embeddings).
    const texte = batch.map((d) => `passage: ${d.src ?? ''} ${d.t}`.trim());
    const out = await extractor(texte, { pooling: 'mean', normalize: true });
    const data = out.data; // Float32Array, [batch.length * DIM], bereits L2-normalisiert
    for (let b = 0; b < batch.length; b++) {
      for (let k = 0; k < DIM; k++) {
        const v = data[b * DIM + k];
        // int8-Quantisierung: normalisierte Werte liegen in [-1, 1] -> *127, gerundet.
        int8[(i + b) * DIM + k] = Math.max(-127, Math.min(127, Math.round(v * 127)));
      }
    }
    if ((i / BATCH) % 10 === 0) {
      const pct = Math.round(((i + batch.length) / docs.length) * 100);
      console.log(`  ${pct}% (${i + batch.length}/${docs.length}) …`);
    }
  }
  const sekunden = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Fertig in ${sekunden}s.`);

  const binPfad = path.join(RAG_DIR, 'embeddings-de.bin');
  const metaPfad = path.join(RAG_DIR, 'embeddings-de.meta.json');
  writeFileSync(binPfad, Buffer.from(int8.buffer));
  writeFileSync(
    metaPfad,
    JSON.stringify({
      v: 1,
      model: MODELL,
      dim: DIM,
      quant: 'int8', // Wert = int8 / 127 (Embeddings sind unit-normalisiert -> Dot-Product == Cosine)
      count: docs.length,
      // Einfache Prüfsumme, damit sucheHybrid() erkennt, wenn korpus-de.json
      // geändert wurde, ohne dass die Embeddings neu generiert wurden
      // (Reihenfolge/Anzahl der Docs muss zu embeddings-de.bin passen).
      letzteId: docs[docs.length - 1]?.id ?? null,
    }, null, 2),
  );
  console.log(`Geschrieben: ${binPfad} (${(int8.length).toLocaleString('de')} Bytes)`);
  console.log(`Geschrieben: ${metaPfad}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
