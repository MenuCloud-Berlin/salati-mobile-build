// Al Quran Cloud API (api.alquran.cloud) — bereits erfolgreich in
// apps/device/src/components/SalatiDashboard.tsx für die "Ayah des Tages"
// genutzt. Liefert Arabisch, Übersetzungen und Rezitations-Audio über
// austauschbare "Editions".

const BASE = 'https://api.alquran.cloud/v1';
const ARABIC_EDITION = 'quran-uthmani';

export interface SurahMeta {
  number: number;
  name: string; // arabisch
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Edition {
  identifier: string;
  englishName: string;
  language: string;
  format: 'text' | 'audio';
  // Landeseigener Name (z. B. "Bahasa Indonesia") — bei Al Quran Cloud für
  // manche Editionen gepflegt, während `englishName` fehlt/kaputt ist (s.
  // editionDisplayName in EditionPicker.tsx: id.indonesian liefert dort
  // buchstäblich "englishName": "Unknown" von der API selbst - verifiziert
  // 2026-07-21 gegen /v1/edition?format=text&type=translation. id.indonesian
  // ist BEST_TRANSLATIONS['id'], trifft also jeden Nutzer mit Indonesisch als
  // Standardsprache sofort in den Einstellungen).
  name?: string;
}

/**
 * Al Quran Cloud führt manche Rezitatoren doppelt (z.B. "ar.alafasy" und
 * "ar.alafasy-2" — unterschiedliche Audio-Quellen, identischer Name). Ohne
 * Disambiguierung sieht die Liste nach Duplikaten aus; das "-2"-Suffix macht
 * die zweite Quelle sichtbar.
 *
 * Manche Editionen liefern von Al Quran Cloud selbst ein kaputtes
 * `englishName: "Unknown"` (verifiziert 2026-07-21 für "id.indonesian" =
 * BEST_TRANSLATIONS['id'], trifft also jeden Nutzer mit Indonesisch als
 * Standardsprache direkt in den Einstellungen) - `name` (landeseigener Name,
 * z. B. "Bahasa Indonesia") ist für diese Fälle trotzdem gepflegt.
 */
export function editionDisplayName(e: Pick<Edition, 'identifier' | 'englishName' | 'name'>): string {
  const base = e.englishName && e.englishName !== 'Unknown' ? e.englishName : (e.name ?? e.englishName);
  return e.identifier.endsWith('-2') ? `${base} (Alt.)` : base;
}

// Al Quran Cloud liefert `sajda` direkt pro Vers mit (verifiziert 2026-07-21
// gegen https://api.alquran.cloud/v1/sajda/quran-uthmani: exakt 15 Verse,
// deckungsgleich mit der gängigen 15er-Liste). `false` = kein Sajda-Vers,
// sonst ein Objekt mit `obligatory`/`recommended` je nach Fiqh-Einordnung.
// Fachlich sicherere Quelle als eine selbst gepflegte Liste (s. Aufgabenstellung).
export type AyahSajda = false | { id: number; recommended: boolean; obligatory: boolean };

export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;
  audio?: string;
  sajda?: AyahSajda;
}

/** Normalisiert das rohe `sajda`-Feld auf die zwei UI-relevanten Flags. */
export function parseAyahSajda(raw: AyahSajda | undefined): { sajda: boolean; sajdaObligatory: boolean } {
  if (!raw) return { sajda: false, sajdaObligatory: false };
  return { sajda: true, sajdaObligatory: raw.obligatory === true };
}

export interface SurahReading {
  meta: SurahMeta;
  ayahs: {
    arabic: string;
    translation: string;
    audio?: string;
    numberInSurah: number;
    sajda: boolean;
    sajdaObligatory: boolean;
  }[];
  /** true = die Sure beginnt mit einer eigenen Basmala-Zeile (alle außer 1 + 9). */
  hasBasmala: boolean;
}

// Al Quran Cloud hängt die Basmala in den ARABISCHEN Text von Vers 1 jeder
// Sure (außer 1, wo sie selbst Vers 1 ist, und 9, die keine hat) - ohne
// Entsprechung in Übersetzung/Umschrift. Kritischer Nutzer-Fund (Sure 18):
// Der arabische Vers-1-Text enthielt sichtbar mehr als Übersetzung/Umschrift.
// Gegen die live-API verifiziert (2026-07-17): exakter Prefix-Match bei
// 18/2/12/55, korrekt KEIN Match bei 9. Wird abgetrennt und separat
// gerendert (wie im gedruckten Mushaf üblich) statt in Vers 1 zu stecken.
export const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/** Zerlegt den rohen Vers-1-Text: eigene Basmala-Zeile + bereinigter Verstext. */
export function splitBasmala(surahNumber: number, firstAyahText: string): { hasBasmala: boolean; text: string } {
  if (surahNumber === 1 || surahNumber === 9) return { hasBasmala: false, text: firstAyahText };
  // Führende unsichtbare Steuerzeichen (BOM/ZWNBSP/RLM), die manche
  // Editionen voranstellen, vor dem Prefix-Vergleich entfernen. NFC-
  // Normalisierung schützt zusätzlich davor, dass Kombinationszeichen
  // (Shadda+Fatha etc.) in abweichender Reihenfolge vorliegen — exakt der
  // Bug, der den ersten Fix-Versuch stumm scheitern ließ (die Konstante
  // hatte eine andere Diakritika-Reihenfolge als die Live-API-Antwort).
  const cleaned = firstAyahText.replace(/^[﻿‎‏]+/, '').normalize('NFC');
  const prefix = BASMALA.normalize('NFC');
  if (!cleaned.startsWith(prefix)) return { hasBasmala: false, text: firstAyahText };
  return { hasBasmala: true, text: cleaned.slice(prefix.length).trimStart() };
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`alquran_cloud_${r.status}`);
  const j = await r.json();
  if (j.code !== 200) throw new Error('alquran_cloud_bad_response');
  return j.data as T;
}

export async function fetchSurahList(): Promise<SurahMeta[]> {
  return getJson<SurahMeta[]>(`${BASE}/surah`);
}

export async function fetchAudioEditions(): Promise<Edition[]> {
  return getJson<Edition[]>(`${BASE}/edition?format=audio&type=versebyverse&language=ar`);
}

// alquran.cloud bietet nur arabische Tafsir-Editionen (verifiziert 2026-07-15,
// siehe Plan-Doku: keine DE/TR/ES/FR-Tafsir-Quelle öffentlich verfügbar).
// Als Zwischenlösung zwei englische Tafsir-Quellen über quran.com API v4
// ergänzt — besser eine Übersetzung als gar keine für Nutzer ohne Arabisch.
const QURANCOM_BASE = 'https://api.quran.com/api/v4';
const QURANCOM_TAFSIR_PREFIX = 'qc.';

// Malaiisch (ms) hat KEINE Al-Quran-Cloud-Edition (verifiziert 2026-07-18) —
// einzige öffentlich verfügbare Standardübersetzung ist Abdullah Muhammad
// Basmeih (JAKIM-nah) über die quran.com v4 "translations"-Ressource
// (resource_id 39). Live gegen https://api.quran.com/api/v4/quran/translations/39
// geprüft: liefert je Sure ein flaches Array `{resource_id, text}` OHNE
// verse_key, in Ayah-Reihenfolge (Länge == Ayah-Anzahl der Sure, z. B. 286
// für Sure 2) — anders als der Tafsir-Endpoint, der verse_key mitliefert.
const QURANCOM_TRANSLATION_PREFIX = 'qcom.';
const QURANCOM_TRANSLATIONS = [{ id: 39, englishName: 'Abdullah Muhammad Basmeih (Malay)', language: 'ms' }] as const;

async function fetchQuranComTranslation(surahNumber: number, resourceId: number): Promise<string[]> {
  const r = await fetch(`${QURANCOM_BASE}/quran/translations/${resourceId}?chapter_number=${surahNumber}`);
  if (!r.ok) throw new Error(`qurancom_translation_${r.status}`);
  const j = (await r.json()) as { translations: { resource_id: number; text: string }[] };
  return j.translations.map((t) => stripTafsirHtml(t.text));
}

// at-Tafsir al-Muyassar (ar.muyassar) ist bei Al Quran Cloud vom `type=tafsir`-
// Endpoint erfasst, NICHT vom `type=translation`-Endpoint (verifiziert
// 2026-07-19) — obwohl BEST_TRANSLATIONS['ar'] genau diese Edition als
// "Übersetzung" für arabischsprachige Nutzer voreinstellt (s. u.). Ohne
// diesen Eintrag fehlte die Edition in der Liste, die für Anzeigenamen
// (editionDisplayName-Lookup) und den Übersetzungs-Picker verwendet wird —
// Folge: arabischsprachige Nutzer sahen dort den rohen Bezeichner
// "ar.muyassar" statt eines Namens, und konnten die Edition nach einem
// Wechsel nicht mehr manuell zurückwählen. Der Roh-Abruf selbst
// (fetchSurahReading/fetchSurahSecondTranslation) funktionierte bereits
// korrekt, da ar.muyassar wie jede andere Al-Quran-Cloud-Edition per
// Standard-Endpoint abrufbar ist — nur die Metadaten-Liste hatte die Lücke.
const MUYASSAR_TRANSLATION_EDITION: Edition = {
  identifier: 'ar.muyassar',
  englishName: 'at-Tafsir al-Muyassar (Arabic)',
  language: 'ar',
  format: 'text',
};

export async function fetchTranslationEditions(): Promise<Edition[]> {
  const editions = await getJson<Edition[]>(`${BASE}/edition?format=text&type=translation`);
  const quranComEditions: Edition[] = QURANCOM_TRANSLATIONS.map((tr) => ({
    identifier: `${QURANCOM_TRANSLATION_PREFIX}${tr.id}`,
    englishName: tr.englishName,
    language: tr.language,
    format: 'text',
  }));
  return [...editions, ...quranComEditions, MUYASSAR_TRANSLATION_EDITION];
}

const QURANCOM_TAFSIRS = [
  { id: 169, englishName: "Ibn Kathir (Abridged, English)" },
  { id: 168, englishName: "Ma'arif al-Qur'an (English)" },
  { id: 817, englishName: 'Tazkirul Quran (English)' },
] as const;

export function stripTafsirHtml(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|div|li)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchQuranComTafsir(surahNumber: number, tafsirId: number): Promise<string[]> {
  const r = await fetch(`${QURANCOM_BASE}/tafsirs/${tafsirId}/by_chapter/${surahNumber}?words=false`);
  if (!r.ok) throw new Error(`qurancom_tafsir_${r.status}`);
  const j = (await r.json()) as { tafsirs: { verse_key: string; text: string }[] };
  const byAyah = new Map<number, string>();
  for (const entry of j.tafsirs) {
    const ayah = Number(entry.verse_key.split(':')[1]);
    byAyah.set(ayah, stripTafsirHtml(entry.text));
  }
  const maxAyah = Math.max(0, ...byAyah.keys());
  const result: string[] = [];
  for (let i = 1; i <= maxAyah; i++) result.push(byAyah.get(i) ?? '');
  return result;
}

export async function fetchTafsirEditions(): Promise<Edition[]> {
  const arabicEditions = await getJson<Edition[]>(`${BASE}/edition?type=tafsir`);
  const englishEditions: Edition[] = QURANCOM_TAFSIRS.map((tafsir) => ({
    identifier: `${QURANCOM_TAFSIR_PREFIX}${tafsir.id}`,
    englishName: tafsir.englishName,
    language: 'en',
    format: 'text',
  }));
  return [...arabicEditions, ...englishEditions];
}

/** Tafsir-Texte einer Sure (Index = Ayah-Reihenfolge). */
export async function fetchSurahTafsir(surahNumber: number, edition: string): Promise<string[]> {
  if (edition.startsWith(QURANCOM_TAFSIR_PREFIX)) {
    const tafsirId = Number(edition.slice(QURANCOM_TAFSIR_PREFIX.length));
    return fetchQuranComTafsir(surahNumber, tafsirId);
  }
  const data = await getJson<{ ayahs: Ayah[] }>(`${BASE}/surah/${surahNumber}/${edition}`);
  return data.ayahs.map((a) => a.text);
}

// Wort-für-Wort-Aufschlüsselung über quran.com API v4 — alquran.cloud bietet
// keine Wort-Segmentierung. Übersetzung/Umschrift je Wort sind dort nur auf
// Englisch verfügbar (geprüft: weder `language`- noch `word_translation_
// language`-Parameter ändern die Sprache) — analog zur Tafsir-Lücke bewusst
// Englisch als bestmögliche Ebene angeboten statt gar keine Wort-Ansicht.
export interface QuranWord {
  arabic: string;
  translation: string;
  transliteration: string;
  /** Eigene Audiodatei für dieses einzelne Wort (Tippen zum Anhören), oder null. */
  audioUrl: string | null;
  /** Tajwid-Regel-Namen, die in diesem Wort greifen (leer = keine Sonderregel). */
  tajweedRules: string[];
}

interface QuranComWordsResponse {
  verses: {
    words: {
      char_type_name: string;
      text_uthmani: string;
      text_uthmani_tajweed?: string;
      translation: { text: string };
      transliteration: { text: string | null };
      audio_url?: string | null;
    }[];
  }[];
}

// CDN-Basis für die von quran.com bereitgestellten Wort-für-Wort-Audiodateien
// (audio_url in der API-Antwort ist ein relativer Pfad, z. B. "wbw/001_001_001.mp3").
// Exportiert, damit andere Module (z. B. features/practice/listening.ts für die
// Fatiha-Wortaudios) dieselbe CDN-Basis nutzen statt sie zu duplizieren.
export const WORD_AUDIO_BASE = 'https://audio.qurancdn.com/';

// quran.com liefert auf WORT-Ebene ein eigenes Tajwid-Feld `text_uthmani_tajweed`
// mit Markup `<rule class=X>...</rule>` — ein ANDERES Tag-Format als die
// Vers-Ebene (`<tajweed class=X>`/`<span class=X>`, siehe parseTajweedText).
// Live gegen die API verifiziert (2026-07-17, verses/by_key & by_chapter &
// by_page): dadurch lässt sich die Tajwid-Regel je Wort DIREKT aus derselben
// Wort-Antwort lesen, ohne sie gegen eine zweite, separat tokenisierte Quelle
// (Vers-Tajwid-Endpoint) abgleichen zu müssen — kein Fehlzuordnungsrisiko.
const WORD_TAJWEED_RULE_RE = /<rule class=([a-z_]+)>/g;

/** Extrahiert die distinct Tajwid-Regel-Namen aus dem `text_uthmani_tajweed`-Feld
 * eines einzelnen Wortes, in Auftrittsreihenfolge. */
export function parseWordTajweedRules(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const rules: string[] = [];
  const re = new RegExp(WORD_TAJWEED_RULE_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (!rules.includes(m[1])) rules.push(m[1]);
  }
  return rules;
}

/** Wandelt die rohe quran.com-Antwort in Wortlisten je Ayah um, ohne
 * End-of-Ayah-Pseudo-Wörter (char_type_name "end", z. B. die Vers-Nummer). */
export function parseWordByWordResponse(j: QuranComWordsResponse): QuranWord[][] {
  return j.verses.map((v) =>
    v.words
      .filter((w) => w.char_type_name === 'word')
      .map((w) => ({
        arabic: w.text_uthmani,
        translation: w.translation.text,
        transliteration: w.transliteration.text ?? '',
        audioUrl: w.audio_url ? `${WORD_AUDIO_BASE}${w.audio_url}` : null,
        tajweedRules: parseWordTajweedRules(w.text_uthmani_tajweed),
      })),
  );
}

/** Wort-für-Wort-Daten einer ganzen Sure (Index = Ayah-Reihenfolge). */
export async function fetchSurahWordByWord(surahNumber: number): Promise<QuranWord[][]> {
  const r = await fetch(
    `${QURANCOM_BASE}/verses/by_chapter/${surahNumber}?words=true&word_fields=text_uthmani,text_uthmani_tajweed,translation,transliteration,audio_url&per_page=300`,
  );
  if (!r.ok) throw new Error(`qurancom_words_${r.status}`);
  const j = (await r.json()) as QuranComWordsResponse;
  return parseWordByWordResponse(j);
}

// ---- Wortsynchrone Rezitation (Wort-Zeitstempel) ----
// quran.com liefert für die meisten Rezitatoren Wort-Segmente
// [wortIndex(0-basiert), wortNummer, startMs, endMs] je Vers. Die Zeitstempel
// gelten NUR für genau die Audiodateien von verses.quran.com — deshalb
// wechselt der Player im Sync-Fall auf diese Dateien.
// Mapping alquran.cloud-Editions-Id → quran.com-recitation-Id (dieselbe
// Stimme); jede Id hier wurde live gegen `?fields=segments` verifiziert.
// Sudais (id 3) hat KEINE Segmente und fehlt deshalb bewusst.
const WORD_SYNC_RECITATIONS: Record<string, number> = {
  'ar.alafasy': 7,
  'ar.alafasy-2': 7,
  'ar.abdulsamad': 2, // AbdulBaset AbdulSamad (Murattal)
  'ar.shaatree': 4, // Abu Bakr al-Shatri
  'ar.hanirifai': 5, // Hani ar-Rifai
  'ar.husary': 6, // Mahmoud Khalil Al-Husary
  'ar.husary-2': 6,
  'ar.saoodshuraym': 10, // Sa'ud ash-Shuraym
};

/** quran.com-recitation-Id für Wort-Sync — null, wenn der Rezitator keine Zeitstempel hat. */
export function wordSyncRecitationId(reciter: string): number | null {
  return WORD_SYNC_RECITATIONS[reciter] ?? null;
}

const SEGMENTS_AUDIO_BASE = 'https://verses.quran.com/';

export type WordSegment = [number, number, number, number];

export interface AyahSegments {
  audioUrl: string;
  segments: WordSegment[];
}

interface SegmentsResponse {
  audio_files: { verse_key: string; url: string; segments?: WordSegment[] }[];
}

// Manche Rezitatoren (z. B. Husari, recitation id 6) liefern PROTOKOLL-RELATIVE
// URLs ("//mirrors.quranicaudio.com/…"), die weder mit "http" beginnen noch ein
// relativer Pfad sind. Der frühere `f.url.startsWith('http') ? f.url :
// SEGMENTS_AUDIO_BASE + f.url`-Fallback griff nur die zweite Alternative und
// hängte SEGMENTS_AUDIO_BASE fälschlich davor — Ergebnis war eine kaputte
// Triple-Slash-URL ("https://verses.quran.com//mirrors.quranicaudio.com/…"),
// die mit 404 scheiterte (Husari war dadurch nicht abspielbar). Live gegen die
// API verifiziert: Alafasy liefert echte relative Pfade ("Alafasy/mp3/…"),
// Husari liefert "//mirrors…"-URLs — beide Fälle müssen unterschieden werden.
function resolveSegmentAudioUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${SEGMENTS_AUDIO_BASE}${url}`;
}

/** Rohantwort → Map numberInSurah → { absolute Audio-URL, Segmente }. */
export function parseSegmentsResponse(j: SegmentsResponse): Record<number, AyahSegments> {
  const out: Record<number, AyahSegments> = {};
  for (const f of j.audio_files) {
    const numberInSurah = Number(f.verse_key.split(':')[1]);
    if (!Number.isFinite(numberInSurah) || !f.url) continue;
    out[numberInSurah] = {
      audioUrl: resolveSegmentAudioUrl(f.url),
      segments: f.segments ?? [],
    };
  }
  return out;
}

/** Wort-Zeitstempel einer ganzen Sure für die gegebene quran.com-recitation-Id. */
export async function fetchSurahSegments(
  surahNumber: number,
  recitationId: number,
): Promise<Record<number, AyahSegments>> {
  const r = await fetch(
    `${QURANCOM_BASE}/recitations/${recitationId}/by_chapter/${surahNumber}?fields=segments&per_page=300`,
  );
  if (!r.ok) throw new Error(`qurancom_segments_${r.status}`);
  const j = (await r.json()) as SegmentsResponse;
  return parseSegmentsResponse(j);
}

// Lateinische Lautschrift (nicht sprachspezifisch — eine phonetische
// Umschrift funktioniert für alle App-Sprachen gleichermaßen als Lesehilfe).
export const TRANSLITERATION_EDITION = 'en.transliteration';

/** Reine Text-Editionen (Übersetzung, Umschrift) einer Sure, Index = Ayah-Reihenfolge —
 * gemeinsame Basis für Umschrift und die zweite Vergleichs-Übersetzung, beide
 * brauchen nur den Text einer einzigen Al-Quran-Cloud-Edition ohne Arabisch/Audio. */
async function fetchEditionAyahTexts(surahNumber: number, edition: string): Promise<string[]> {
  const data = await getJson<{ ayahs: Ayah[] }>(`${BASE}/surah/${surahNumber}/${edition}`);
  return data.ayahs.map((a) => a.text);
}

/** Lateinische Umschrift einer Sure (Index = Ayah-Reihenfolge). */
export async function fetchSurahTransliteration(surahNumber: number): Promise<string[]> {
  return fetchEditionAyahTexts(surahNumber, TRANSLITERATION_EDITION);
}

/** Zweite, unabhängig wählbare Übersetzung für den Interpretations-Vergleich
 * (Index = Ayah-Reihenfolge) — läuft neben der Haupt-Übersetzung aus
 * fetchSurahReading, ohne Arabisch/Audio erneut zu laden. */
export async function fetchSurahSecondTranslation(surahNumber: number, edition: string): Promise<string[]> {
  if (edition.startsWith(QURANCOM_TRANSLATION_PREFIX)) {
    return fetchQuranComTranslation(surahNumber, Number(edition.slice(QURANCOM_TRANSLATION_PREFIX.length)));
  }
  return fetchEditionAyahTexts(surahNumber, edition);
}

/**
 * Lädt eine Sure mit Arabisch + gewählter Übersetzung + gewähltem Rezitator
 * in einem einzigen Request (Al Quran Cloud unterstützt Multi-Edition-Abfragen).
 * Ausnahme: Malaiisch (qcom.-Präfix) kommt nicht von Al Quran Cloud und wird
 * separat über quran.com nachgeladen und pro Ayah-Index gemerged.
 */
export async function fetchSurahReading(
  surahNumber: number,
  translationEdition: string,
  audioEdition: string,
): Promise<SurahReading> {
  const useQuranComTranslation = translationEdition.startsWith(QURANCOM_TRANSLATION_PREFIX);
  const editions = (
    useQuranComTranslation ? [ARABIC_EDITION, audioEdition] : [ARABIC_EDITION, translationEdition, audioEdition]
  ).join(',');
  const [data, quranComTexts] = await Promise.all([
    getJson<
      { edition: { identifier: string }; ayahs: Ayah[]; number: number; name: string; englishName: string; englishNameTranslation: string; numberOfAyahs: number; revelationType: string }[]
    >(`${BASE}/surah/${surahNumber}/editions/${editions}`),
    useQuranComTranslation
      ? fetchQuranComTranslation(surahNumber, Number(translationEdition.slice(QURANCOM_TRANSLATION_PREFIX.length)))
      : Promise.resolve(null),
  ]);

  const arabic = data.find((d) => d.edition.identifier === ARABIC_EDITION);
  const translation = useQuranComTranslation ? undefined : data.find((d) => d.edition.identifier === translationEdition);
  const audio = data.find((d) => d.edition.identifier === audioEdition);
  if (!arabic) throw new Error('missing_arabic_edition');

  const meta: SurahMeta = {
    number: arabic.number,
    name: arabic.name,
    englishName: arabic.englishName,
    englishNameTranslation: arabic.englishNameTranslation,
    numberOfAyahs: arabic.numberOfAyahs,
    revelationType: arabic.revelationType,
  };

  const first = splitBasmala(surahNumber, arabic.ayahs[0]?.text ?? '');

  const ayahs = arabic.ayahs.map((a, i) => ({
    numberInSurah: a.numberInSurah,
    arabic: i === 0 ? first.text : a.text,
    translation: quranComTexts ? (quranComTexts[i] ?? '') : (translation?.ayahs[i]?.text ?? ''),
    audio: audio?.ayahs[i]?.audio,
    ...parseAyahSajda(a.sajda),
  }));

  return { meta, ayahs, hasBasmala: first.hasBasmala };
}

/**
 * Audio-URL eines EINZELNEN Verses für einen bestimmten Rezitator — losgelöst
 * von der aktuell im Reader gewählten Rezitation. Grundlage für den
 * Rezitatoren-Vergleich (zwei wählbare Rezitatoren hintereinander für
 * denselben Vers, s. [surah].tsx View-Sheet).
 */
export async function fetchAyahAudio(
  surahNumber: number,
  ayahNumber: number,
  edition: string,
): Promise<string | undefined> {
  const data = await getJson<{ audio?: string }>(`${BASE}/ayah/${surahNumber}:${ayahNumber}/${edition}`);
  return data.audio;
}

// Empfohlene, bekannte Rezitatoren/Übersetzungen als Vorauswahl — die volle
// Liste kommt dynamisch aus fetchAudioEditions()/fetchTranslationEditions().
export const RECOMMENDED_RECITERS = ['ar.alafasy', 'ar.husary', 'ar.abdulsamad', 'ar.abdurrahmaansudais'];
export const RECOMMENDED_TRANSLATIONS = [
  'de.bubenheim',
  'en.sahih',
  'tr.diyanet',
  'ar.muyassar',
  'es.garcia',
  'fr.hamidullah',
  'ru.kuliev',
  'ur.junagarhi',
  'id.indonesian',
  'bn.bengali',
  'fa.fooladvand',
  'qcom.39',
  'ur.jalandhry',
  'sw.barwani',
  'ps.abdulwali',
];

// Die jeweils renommierteste Übersetzung pro App-Sprache — wird beim
// Sprachwechsel als Default gesetzt (danach frei änderbar). Für Arabisch:
// at-Tafsir al-Muyassar als leicht verständliche Erklärung statt Übersetzung.
export const BEST_TRANSLATIONS: Record<string, string> = {
  de: 'de.bubenheim',
  en: 'en.sahih',
  tr: 'tr.diyanet',
  ar: 'ar.muyassar',
  es: 'es.garcia',
  fr: 'fr.hamidullah',
  id: 'id.indonesian',
  bn: 'bn.bengali',
  fa: 'fa.fooladvand',
  ms: 'qcom.39', // Abdullah Muhammad Basmeih — nicht bei Al Quran Cloud, siehe QURANCOM_TRANSLATIONS
  ur: 'ur.jalandhry',
  ru: 'ru.kuliev',
  sw: 'sw.barwani',
  ps: 'ps.abdulwali',
};

// Bester Standard-Tafsir pro App-Sprache. Tafsir existiert öffentlich nur
// auf Arabisch + Englisch (quran.com v4, verifiziert 2026-07-16: en/ar/bn/
// ur/ru/ku — kein de/tr/es/fr) — für alle Nicht-Arabisch-Sprachen ist
// Ibn Kathir (Englisch) daher die verständlichste Voreinstellung; vorher
// bekamen deutsche Nutzer arabischen Tafsir und hielten Englisch für fehlend.
export const BEST_TAFSIRS: Record<string, string> = {
  de: 'qc.169',
  en: 'qc.169',
  tr: 'qc.169',
  ar: 'ar.muyassar',
  es: 'qc.169',
  fr: 'qc.169',
  id: 'qc.169',
  bn: 'qc.169',
  fa: 'qc.169',
  ms: 'qc.169',
  ur: 'qc.169',
  ru: 'qc.169',
  sw: 'qc.169',
  ps: 'qc.169',
};

// Tajweed-Farbkodierung: alquran.cloud bietet keinen tajweed-annotierten
// Text; quran.com v4 liefert offiziell vorannotierten Uthmani-Text mit
// eingebetteten Regel-Markierungen (<tajweed class=X>...</tajweed>) — wir
// berechnen die Regeln also NICHT selbst (Fehlerrisiko bei Aussprache),
// sondern rendern nur die von quran.com bereits klassifizierten Segmente.
export interface TajweedSegment {
  text: string;
  /** null = normaler Text ohne besondere Tajweed-Regel. */
  className: string | null;
}

const TAJWEED_TAG_RE = /<(tajweed|span) class=([a-z_]+)>(.*?)<\/(?:tajweed|span)>/g;

/**
 * Zerlegt den rohen quran.com-Tajweed-Text in eingefärbte/normale Segmente.
 * Die "end"-Markierung (arabische Vers-Ende-Ziffer) wird komplett entfernt,
 * nicht nur entfärbt — die App zeigt die Vers-Nummer bereits separat im
 * Ayah-Header-Badge, ein zusätzliches Auftauchen im Fließtext wäre eine
 * Dopplung, die es in der normalen (nicht-Tajweed-) Ansicht nicht gibt.
 */
export function parseTajweedText(raw: string): TajweedSegment[] {
  const segments: TajweedSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  TAJWEED_TAG_RE.lastIndex = 0;
  while ((m = TAJWEED_TAG_RE.exec(raw))) {
    if (m.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, m.index), className: null });
    }
    if (m[2] !== 'end') {
      segments.push({ text: m[3], className: m[2] });
    }
    lastIndex = TAJWEED_TAG_RE.lastIndex;
  }
  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), className: null });
  }
  // Trailing Leerzeichen vor der entfernten Vers-Ende-Ziffer aufräumen.
  const last = segments[segments.length - 1];
  if (last && last.className === null) {
    last.text = last.text.trimEnd();
  }
  return segments;
}

/** Tajweed-annotierte Segmente einer ganzen Sure (Index = Ayah-Reihenfolge). */
export async function fetchSurahTajweed(surahNumber: number): Promise<TajweedSegment[][]> {
  const r = await fetch(`${QURANCOM_BASE}/quran/verses/uthmani_tajweed?chapter_number=${surahNumber}`);
  if (!r.ok) throw new Error(`qurancom_tajweed_${r.status}`);
  const j = (await r.json()) as { verses: { text_uthmani_tajweed: string }[] };
  return j.verses.map((v) => parseTajweedText(v.text_uthmani_tajweed));
}

// Volltextsuche über den gesamten Koran (Wort/Thema) — bislang eine dokumentierte
// Lücke ("Keine Wurzel-/Themensuche"), geschlossen über den offiziellen
// quran.com-v4-Suchendpoint. Sprachabdeckung geprüft: de/en/tr/es/fr liefern
// über den `language`-Parameter Treffer gegen die jeweilige Übersetzung
// (z. B. "Geduld" → 29 Treffer/de, "sabır" → 53/tr, "paciencia" → 79/es,
// "patience" → 74/fr, 195/en). Arabisch ist ein Sonderfall: `language=ar` ist
// KEIN gültiger Wert (Antwort: HTTP 204 No Content, leerer Body) — ohne
// `language`-Parameter sucht die API stattdessen direkt im arabischen Urtext
// (Uthmani-Schreibweise), was für arabischsprachige Nutzer ohnehin sinnvoller
// ist (Koran-Text statt Übersetzung durchsuchen). Wichtige Einschränkung: die
// Suche matcht wörtlich/literal, keine arabische Wurzel-Normalisierung — z. B.
// findet "صبر" nur die exakte unflektierte Form (2 Treffer), während Ableitungen
// wie "اصبر"/"الصابرين"/"فاصبر" eigene Treffer sind (bestätigt: "الله" → 2344,
// "الرحمن" → 45). Das ist dieselbe Charakteristik wie in quran.coms eigener
// offizieller Such-UI, keine Einschränkung unserer Implementierung.
const SEARCH_LANGUAGE_PARAM: Partial<Record<string, string>> = {
  de: 'de',
  en: 'en',
  tr: 'tr',
  es: 'es',
  fr: 'fr',
};

// Kombinierende Koran-Zeichen: Harakat/Tanwin/Sukun + kleine Annotationszeichen
// (064B–065F), Alif khanjariyya (0670), Koran-Annotationssymbole (06D6–06ED),
// Tatweel (0640). Bewusst NICHT 0660–066F (arabisch-indische Ziffern +
// Sonderbuchstaben) — die dürfen nicht aus dem Suchbegriff fallen.
const SEARCH_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
// Enthält der Suchbegriff überhaupt arabische Schrift? (nur dann normalisieren —
// lateinische/Übersetzungssuche bleibt unangetastet).
const ARABIC_LETTER_RE = /[؀-ۿ]/;

/**
 * Normalisiert einen ARABISCHEN Suchbegriff für die quran.com-Suche. Motivation
 * (alle Trefferzahlen live geprüft, 2026-07-22): quran.coms Suchindex faltet
 * Tashkeel, Tatweel, Hamza-auf-Alif (أإآ) und Ta-Marbuta bereits selbst
 * („الرحمن"=„الرَّحْمَٰن"=45; „رحمة"=„رحمه"=35). ZWEI Fälle behandelt der Index
 * aber NICHT — genau die schließt diese Funktion:
 *   1) Alif-Wasla ٱ (U+0671): im Uthmani-Text (den der Reader anzeigt)
 *      allgegenwärtig, als Suchbegriff aber tödlich — „ٱلعالمين" → 0 Treffer vs
 *      „العالمين" → 61; „ٱلرحمن" → 0 vs 45. Kopiert ein Nutzer ein Wort aus dem
 *      Reader in die Suche, findet er sonst NICHTS. → ٱ auf ا abbilden.
 *   2) Voll vokalisierter Einfügetext mit Wasla („بِسْمِ ٱللَّهِ" → 1566 vs
 *      „بسم الله" → 2344): Diakritika strippen holt die fehlenden Treffer.
 * BEWUSST NICHT gefaltet: Alif-Maqsura ى→ي. Das WÜRDE die Trefferzahl einbrechen
 * lassen (live: „موسى" → 1293 vs „موسي" → 124), weil der Koran-Text überwiegend
 * ى schreibt — eine „Vereinheitlichung" wäre hier eine Verschlechterung.
 * Bewusst als eigene, kleine Normalisierung in der Quran-Ebene gehalten (nicht
 * aus features/hifz importiert, das parallel bearbeitet wird).
 */
export function normalizeArabicSearchQuery(query: string): string {
  return query
    .replace(SEARCH_DIACRITICS_RE, '')
    .replace(/ٱ/g, 'ا') // ٱ Alif-Wasla → ا
    .replace(/[أإآ]/g, 'ا') // أ إ آ → ا (Index faltet das zwar selbst; schadet nicht und macht den Begriff robust)
    .replace(/\s+/g, ' ')
    .trim();
}

export interface QuranSearchResult {
  verseKey: string;
  surah: number;
  ayah: number;
  arabicText: string;
  /** Enthält ggf. <em>-Hervorhebungs-Tags um den Treffer; null wenn keine Übersetzung matched. */
  translationHtml: string | null;
  translationName: string | null;
}

export interface QuranSearchResponse {
  query: string;
  totalResults: number;
  currentPage: number;
  totalPages: number;
  results: QuranSearchResult[];
}

interface QuranComSearchResponse {
  search: {
    query: string;
    total_results: number;
    current_page: number;
    total_pages: number;
    results: {
      verse_key: string;
      text: string;
      translations: { text: string; resource_id: number; name: string; language_name: string }[];
    }[];
  };
}

export function parseSearchResponse(j: QuranComSearchResponse): QuranSearchResponse {
  const search = j.search;
  return {
    query: search.query,
    totalResults: search.total_results,
    currentPage: search.current_page,
    totalPages: search.total_pages,
    results: search.results.map((r) => {
      const [surah, ayah] = r.verse_key.split(':').map(Number);
      const translation = r.translations[0];
      return {
        verseKey: r.verse_key,
        surah,
        ayah,
        arabicText: r.text,
        translationHtml: translation?.text ?? null,
        translationName: translation?.name ?? null,
      };
    }),
  };
}

export interface HighlightedSegment {
  text: string;
  bold: boolean;
}

/** Zerlegt den von quran.com mit <em>-Tags markierten Treffer-Text in Segmente
 * für die Hervorhebung in der UI, ohne die Tags selbst zu rendern. */
export function parseHighlightedText(html: string): HighlightedSegment[] {
  const segments: HighlightedSegment[] = [];
  const re = /<em>(.*?)<\/em>/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > lastIndex) segments.push({ text: html.slice(lastIndex, m.index), bold: false });
    segments.push({ text: m[1], bold: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < html.length) segments.push({ text: html.slice(lastIndex), bold: false });
  return segments;
}

const SEARCH_PAGE_SIZE = 20;

/** Durchsucht den gesamten Koran (Übersetzung je nach App-Sprache, s. o.). */
export async function searchQuran(
  query: string,
  appLanguage: string,
  page = 1,
): Promise<QuranSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: '', totalResults: 0, currentPage: 1, totalPages: 0, results: [] };
  }
  // Arabischen Suchbegriff normalisieren (Alif-Wasla/Diakritika, s.
  // normalizeArabicSearchQuery) — DEUTLICH bessere Trefferrate, v. a. wenn ein
  // Wort aus dem Uthmani-Reader (mit ٱ) in die Suche kopiert wird. Lateinische
  // Übersetzungssuche bleibt unangetastet. Fällt die Normalisierung leer aus
  // (reiner Diakritika-„Begriff"), lieber den Originalbegriff senden.
  let effectiveQuery = trimmed;
  if (ARABIC_LETTER_RE.test(trimmed)) {
    const normalized = normalizeArabicSearchQuery(trimmed);
    if (normalized) effectiveQuery = normalized;
  }
  const params = new URLSearchParams({ q: effectiveQuery, size: String(SEARCH_PAGE_SIZE), page: String(page) });
  const langParam = SEARCH_LANGUAGE_PARAM[appLanguage];
  if (langParam) params.set('language', langParam);
  const r = await fetch(`${QURANCOM_BASE}/search?${params.toString()}`);
  if (!r.ok) throw new Error(`qurancom_search_${r.status}`);
  const j = (await r.json()) as QuranComSearchResponse;
  return parseSearchResponse(j);
}

// ---- Mushaf-Seitenansicht (604 Seiten, Madina-Zählung) ----
// quran.com v4 liefert die Verse jeder Druckseite; zwei Schriftstile:
// Uthmani (Madina-Mushaf) und IndoPak (südasiatische Mushafs).
export type MushafStyle = 'uthmani' | 'indopak';

export const MUSHAF_TOTAL_PAGES = 604;

export interface MushafWord {
  arabic: string;
  translation: string;
  transliteration: string;
  /** Tajwid-Regel-Namen, die in diesem Wort greifen (leer = keine Sonderregel). */
  tajweedRules: string[];
}

export interface MushafVerse {
  ayah: number;
  text: string;
  /** true = Niederwerfungsvers (im Mushaf mit ۩ markiert). */
  sajda: boolean;
  /** Nur gefüllt, wenn die Seite mit Wort-Daten geladen wurde. */
  words?: MushafWord[];
}

// Startseite jedes Juz im Madina-Mushaf — alle 30 Werte am 2026-07-17 gegen
// quran.com v4 (verses/by_juz?fields=page_number) verifiziert.
export const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
] as const;

export interface MushafSurahGroup {
  surah: number;
  verses: MushafVerse[];
}

export interface MushafPage {
  page: number;
  juz: number;
  groups: MushafSurahGroup[];
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** 123 → ١٢٣ (für Vers-Nummern im Mushaf-Fließtext). */
export function toArabicDigits(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[Number(d)] ?? d)
    .join('');
}

interface MushafApiVerse {
  verse_key: string;
  juz_number: number;
  sajdah_number?: number | null;
  text_uthmani?: string;
  text_indopak?: string;
  words?: {
    char_type_name: string;
    text_uthmani?: string;
    text_indopak?: string;
    text?: string;
    text_uthmani_tajweed?: string;
    translation?: { text?: string | null } | null;
    transliteration?: { text?: string | null } | null;
  }[];
}

// IndoPak-Text enthält Zero-Width-/Bidi-Steuerzeichen (ZWSP, RLM, PDF …),
// für die die System-Schrift Tofu-Boxen rendert — reine Formatierungszeichen,
// keine Schriftzeichen, daher gefahrlos entfernbar.
const INVISIBLE_CONTROL_RE = /[​-‏‪-‮⁦-⁩]/g;

/** Rohantwort → nach Suren gruppierte Verse (eine Druckseite kann mehrere Suren enthalten). */
export function parseMushafPage(page: number, verses: MushafApiVerse[]): MushafPage {
  const groups: MushafSurahGroup[] = [];
  for (const v of verses) {
    const [surah, ayah] = v.verse_key.split(':').map(Number);
    const text = (v.text_uthmani ?? v.text_indopak ?? '').replace(INVISIBLE_CONTROL_RE, '');
    if (!Number.isFinite(surah) || !Number.isFinite(ayah) || !text) continue;
    const words = v.words
      ?.filter((w) => w.char_type_name === 'word')
      .map((w) => ({
        arabic: w.text_uthmani ?? w.text_indopak ?? w.text ?? '',
        translation: w.translation?.text ?? '',
        transliteration: w.transliteration?.text ?? '',
        tajweedRules: parseWordTajweedRules(w.text_uthmani_tajweed),
      }));
    const verse: MushafVerse = { ayah, text, sajda: v.sajdah_number != null, ...(words ? { words } : {}) };
    const last = groups[groups.length - 1];
    if (last && last.surah === surah) {
      last.verses.push(verse);
    } else {
      groups.push({ surah, verses: [verse] });
    }
  }
  return { page, juz: verses[0]?.juz_number ?? 1, groups };
}

/** Alle Verse einer Mushaf-Druckseite im gewünschten Schriftstil.
 * withWords lädt zusätzlich die Wort-Aufschlüsselung (Tipp-Info im Mushaf). */
export async function fetchMushafPage(
  page: number,
  style: MushafStyle,
  withWords = false,
): Promise<MushafPage> {
  const field = style === 'indopak' ? 'text_indopak' : 'text_uthmani';
  const wordsParam = withWords
    ? `&words=true&word_fields=${field},text_uthmani_tajweed,translation,transliteration`
    : '';
  const r = await fetch(`${QURANCOM_BASE}/verses/by_page/${page}?fields=${field}${wordsParam}&per_page=60`);
  if (!r.ok) throw new Error(`qurancom_page_${r.status}`);
  const j = (await r.json()) as { verses: MushafApiVerse[] };
  return parseMushafPage(page, j.verses);
}

/** Druckseite, auf der eine Sure beginnt (für den Absprung aus dem Reader). */
export async function fetchSurahStartPage(surahNumber: number): Promise<number> {
  const r = await fetch(`${QURANCOM_BASE}/verses/by_chapter/${surahNumber}?fields=page_number&per_page=1`);
  if (!r.ok) throw new Error(`qurancom_startpage_${r.status}`);
  const j = (await r.json()) as { verses: { page_number: number }[] };
  const page = j.verses[0]?.page_number;
  if (!page) throw new Error('qurancom_startpage_missing');
  return page;
}

// Farbschema orientiert an gängigen gedruckten Tajweed-Mushafs — Farbwahl
// dient der Lesehilfe, ist keine religiöse Aussage; siehe Legende in der UI.
//
// Farbenblind-Check (Deuteranopie/Protanopie, Machado/Oliveira/Fernandes-
// Simulationsmatrizen, gerechnet gegen die 7 TAJWEED_LEGEND-Farben):
// idgham_wo_ghunnah kollidierte im ursprünglichen Gelbgrün (#7CB342) unter
// Deuteranopie (~5% aller Männer, häufigste Form) fast vollständig mit
// ikhafa/Orange (#E67E22) — simulierter RGB-Abstand nur 35 von max. 441, mit
// Abstand die engste Kollision der gesamten Palette. Auf ein blaustichigeres
// Grün (Teal statt Gelbgrün) verschoben, das unter Deuteranopie UND
// Protanopie klar von ikhafa UND ghunnah getrennt bleibt (Abstand ≥62 in
// beiden Simulationen) und dabei "grün" für normalsichtige Nutzer bleibt.
// Alle anderen 6 Farben bereits ausreichend unterscheidbar (kein Paar unter
// ~40 simuliertem Abstand) — bewusst NICHT verändert.
export const TAJWEED_COLORS: Record<string, string> = {
  ghunnah: '#2E9E4F',
  idgham_ghunnah: '#2E9E4F',
  idgham_shafawi: '#2E9E4F',
  idgham_wo_ghunnah: '#00897B',
  idgham_mutajanisayn: '#00897B',
  ikhafa: '#E67E22',
  ikhafa_shafawi: '#E67E22',
  iqlab: '#00ACC1',
  qalaqah: '#D32F2F',
  madda_normal: '#9C27B0',
  madda_permissible: '#AB47BC',
  madda_necessary: '#7B1FA2',
  madda_obligatory: '#6A1B9A',
  laam_shamsiyah: '#9E9E9E',
  ham_wasl: '#9E9E9E',
  slnt: '#9E9E9E',
};

/**
 * Tajwid-Übungsmodus: eine Legende antippen lässt alle gleichfarbigen
 * Vorkommen auf der Seite kurz pulsieren. Der Abgleich läuft über die
 * gerenderte FARBE (nicht den rohen Klassennamen), weil die Legende mehrere
 * Rohklassen zu einer Familie zusammenfasst und dabei dieselbe Farbe wie
 * TAJWEED_COLORS[className] verwendet (siehe TAJWEED_LEGEND im Reader) —
 * z. B. teilen sich "ghunnah", "idgham_ghunnah" und "idgham_shafawi" exakt
 * dieselbe Farbe und sollen deshalb gemeinsam pulsieren.
 */
export function segmentMatchesPulseColor(className: string | null, pulseColor: string | null): boolean {
  if (!pulseColor || !className) return false;
  return TAJWEED_COLORS[className] === pulseColor;
}
