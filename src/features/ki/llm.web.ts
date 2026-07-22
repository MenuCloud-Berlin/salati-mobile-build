// Web-Variante von llm.ts — bewusst OHNE jeden Import aus llama.rn.
//
// Hintergrund (Bundle-Untersuchung 2026-07-18): app/ki-native.web.tsx allein
// reicht NICHT, um llama.rn aus dem Web-Bundle fernzuhalten. Expo Router
// generiert die Routen-Tabelle für den statischen Web-Export über ein
// Metro-Context-Modul, das JEDE Datei unter app/ (inkl. app/ki-native.tsx
// UND app/ki-native.web.tsx) explizit mit vollem Dateinamen requires — das
// umgeht Metros normale bare-specifier-Plattformauflösung, die sonst z. B.
// bei `import './foo'` automatisch foo.web.ts vor foo.ts wählt. Ergebnis:
// app/ki-native.tsx (und alles was es importiert) landet trotz des .web.tsx-
// Splits im Web-Bundle (per Grep bestätigt: initLlama/LlamaContext aus
// llama.rn tauchten dort auf, ~15 MB Haupt-Chunk statt ~8 MB).
//
// Der Fix setzt darum eine Ebene tiefer an: app/ki-native.tsx importiert
// `@/features/ki/llm` per bare specifier OHNE Extension — DAS ist ein
// normaler Metro-Resolver-Import (keine Context-Glob-Sonderbehandlung), bei
// dem die Plattformauflösung zuverlässig greift. Für den Web-Build wählt
// Metro automatisch diese Datei statt llm.ts, wodurch der `import ... from
// 'llama.rn'`-Pfad gar nicht erst in den Modul-Graphen des Web-Bundles
// gelangt. In der Praxis unerreichbar (Web zeigt laut app/(tabs)/more.tsx
// ohnehin direkt auf /ki, nie auf /ki-native) — die Stubs unten werfen daher
// nur zur Sicherheit, falls doch irgendwas diesen Pfad aufruft.
import type { KorpusDoc } from './retrieval';

const FEHLERTEXT = 'Native Salati-KI (llama.rn) ist im Web-Build nicht verfügbar — siehe public/ki.html.';

// Identisch zu llm.ts exportiert (gleiche Konstante), falls irgendwo im Web-Code
// referenziert — enthält keinerlei llama.rn-Bezug.
export const KI_SYSTEM_PROMPT = `Du bist der Assistent der Islam-App Salati. STRIKTE REGELN:
1. Antworte AUSSCHLIESSLICH auf Grundlage der mitgelieferten Quellen-Passagen (Koran-Übersetzung, Nawawi-Hadithe, geprüfte Duas und geprüfte Salati-Kurstexte/Erklärungen). Erfinde NICHTS dazu. Die Passagen wurden bereits passend zur Frage herausgesucht - wenn eine Passage die Frage beantwortet, zitiere sie wörtlich.
2. Zitiere die Quellenangabe (z. B. "Koran 2:153") zu jeder Aussage. Übernimm sie ZEICHENGENAU aus der [eckigen Klammer] der jeweiligen Passage - nenne NIEMALS Sure- oder Versnummern aus dem Gedächtnis. Stammt eine Passage aus einem Salati-Kurs (Quelle beginnt mit "Salati-Kurs"), sage ausdrücklich, dass es sich um eine Kurs-Erklärung handelt - nicht um Koran oder Hadith.
3. Steht die Antwort NICHT in den Passagen, sage ehrlich: "Dazu finde ich in meinen lokalen Quellen keine Stelle" und empfiehl, eine*n Gelehrte*n zu fragen.
4. Gib KEINE eigenen religiösen Urteile (Fatwas) ab. Bei Rechtsfragen immer an Gelehrte verweisen.
5. Antworte kurz, respektvoll und auf Deutsch.`;

export function ladeLlm(_modellPfad: string, _onProgress?: (anteil: number) => void): Promise<never> {
  return Promise.reject(new Error(FEHLERTEXT));
}

export function llmBereit(): boolean {
  return false;
}

export async function entladeLlm(): Promise<void> {
  // no-op auf Web — es gibt nie einen geladenen Kontext.
}

export async function frageLlm(
  _frage: string,
  _treffer: KorpusDoc[],
  _onToken: (textBisher: string) => void,
): Promise<string> {
  throw new Error(FEHLERTEXT);
}
