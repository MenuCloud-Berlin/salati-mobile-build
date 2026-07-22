// Dünner Wrapper um llama.rn (native On-Device-LLM-Inferenz, llama.cpp-Bindings).
// NUR von app/ki-native.tsx importiert — NIE von app/ki-native.web.tsx oder
// irgendeiner Web-Route (llama.rn hat keine Web-Implementierung; ein
// Top-Level-Import auf Web würde beim Modul-Laden crashen, siehe
// Kopfkommentar in app/ki-native.tsx für die Datei-Aufteilung, die das verhindert).
import { initLlama, type LlamaContext } from 'llama.rn';

import type { KorpusDoc } from './retrieval';

// Identische Systemregeln wie public/ki.html — Antwort NUR aus den
// mitgelieferten Quellen-Passagen, mit Quellenangabe, keine Fatwas.
export const KI_SYSTEM_PROMPT = `Du bist der Assistent der Islam-App Salati. STRIKTE REGELN:
1. Antworte AUSSCHLIESSLICH auf Grundlage der mitgelieferten Quellen-Passagen (Koran-Übersetzung, Nawawi-Hadithe, geprüfte Duas und geprüfte Salati-Kurstexte/Erklärungen). Erfinde NICHTS dazu. Die Passagen wurden bereits passend zur Frage herausgesucht - wenn eine Passage die Frage beantwortet, zitiere sie wörtlich.
2. Zitiere die Quellenangabe (z. B. "Koran 2:153") zu jeder Aussage. Übernimm sie ZEICHENGENAU aus der [eckigen Klammer] der jeweiligen Passage - nenne NIEMALS Sure- oder Versnummern aus dem Gedächtnis. Stammt eine Passage aus einem Salati-Kurs (Quelle beginnt mit "Salati-Kurs"), sage ausdrücklich, dass es sich um eine Kurs-Erklärung handelt - nicht um Koran oder Hadith.
3. Steht die Antwort NICHT in den Passagen, sage ehrlich: "Dazu finde ich in meinen lokalen Quellen keine Stelle" und empfiehl, eine*n Gelehrte*n zu fragen.
4. Gib KEINE eigenen religiösen Urteile (Fatwas) ab. Bei Rechtsfragen immer an Gelehrte verweisen.
5. Antworte kurz, respektvoll und auf Deutsch.`;

let kontext: LlamaContext | null = null;
let ladenPromise: Promise<LlamaContext> | null = null;

/** Lädt das GGUF-Modell einmalig in den Speicher (idempotent — parallele Aufrufe teilen sich das Laden). */
export function ladeLlm(modellPfad: string, onProgress?: (anteil: number) => void): Promise<LlamaContext> {
  if (kontext) return Promise.resolve(kontext);
  if (!ladenPromise) {
    ladenPromise = initLlama(
      {
        model: `file://${modellPfad}`,
        use_mlock: true,
        n_ctx: 4096,
        n_gpu_layers: 99, // nutzt Metal/OpenCL falls verfügbar, fällt sonst automatisch auf CPU zurück
      },
      (progress) => onProgress?.(Math.min(1, Math.max(0, progress / 100))),
    ).then((ctx) => {
      kontext = ctx;
      return ctx;
    });
  }
  return ladenPromise;
}

export function llmBereit(): boolean {
  return kontext !== null;
}

/** Setzt den geladenen Kontext zurück (z. B. wenn der Nutzer das Modell löscht). */
export async function entladeLlm(): Promise<void> {
  const ctx = kontext;
  kontext = null;
  ladenPromise = null;
  if (ctx) await ctx.release().catch(() => {});
}

/**
 * Stellt eine Frage mit den gefundenen Quellen-Passagen als Kontext, identisches
 * Prompt-Format wie public/ki.html: "[Quelle] Text" pro Zeile.
 */
export async function frageLlm(
  frage: string,
  treffer: KorpusDoc[],
  onToken: (textBisher: string) => void,
): Promise<string> {
  if (!kontext) throw new Error('LLM nicht geladen — ladeLlm() zuerst aufrufen.');
  const kontextText = treffer.map((d) => `[${d.src}] ${d.t}`).join('\n');
  let ausgabe = '';
  await kontext.completion(
    {
      messages: [
        { role: 'system', content: KI_SYSTEM_PROMPT },
        { role: 'user', content: `Quellen-Passagen:\n${kontextText}\n\nFrage: ${frage}` },
      ],
      n_predict: 400,
      temperature: 0.2,
    },
    (data) => {
      ausgabe += data.token;
      onToken(ausgabe);
    },
  );
  return ausgabe;
}
