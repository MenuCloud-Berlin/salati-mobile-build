// fawazahmed0/hadith-api via jsDelivr-CDN — Unlicense (Public Domain), kein
// Rate-Limit, kein Key. Übersetzungen: Englisch (alle Sammlungen) + Türkisch
// (die meisten); kein Deutsch verfügbar, siehe USER-TODO.md Z13.

const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

export type HadithLang = 'ar' | 'en' | 'tr';

export interface Collection {
  id: string;
  name: string;
  /** Anzahl statt "alle" bei den 40er-Sammlungen — hilft der Listen-UI. */
  isForty?: boolean;
  /** Herkunft der Daten — undefined = fawazahmed0 (Standard), 'ahmedbaset' = zweite Quelle. */
  source?: 'ahmedbaset';
}

export const COLLECTIONS: Collection[] = [
  { id: 'bukhari', name: 'Sahih al-Bukhari' },
  { id: 'muslim', name: 'Sahih Muslim' },
  { id: 'abudawud', name: 'Sunan Abu Dawud' },
  { id: 'tirmidhi', name: 'Jami at-Tirmidhi' },
  { id: 'ibnmajah', name: 'Sunan Ibn Majah' },
  { id: 'nasai', name: 'Sunan an-Nasai' },
  { id: 'malik', name: 'Muwatta Malik' },
  { id: 'nawawi', name: 'An-Nawawi 40', isForty: true },
  { id: 'qudsi', name: '40 Hadith Qudsi', isForty: true },
  { id: 'dehlawi', name: '40 Hadith Dehlawi', isForty: true },
  // Zweite Datenquelle (AhmedBaset/hadith-json, ISC-Lizenz, von Sunnah.com
  // gescrapt) — schließt eine seit Langem dokumentierte Lücke: diese drei
  // Sammlungen existieren NICHT im fawazahmed0-Datensatz (verifiziert gegen
  // dessen editions.json, main-Branch wie @1-Tag, beide nur 10 Sammlungen).
  { id: 'riyadassalihin', name: 'Riyad as-Salihin', source: 'ahmedbaset' },
  { id: 'bulughalmaram', name: 'Bulugh al-Maram', source: 'ahmedbaset' },
  { id: 'adabalmufrad', name: 'Al-Adab Al-Mufrad', source: 'ahmedbaset' },
];

// AhmedBaset/hadith-json ist auf einen festen Tag gepinnt (Repo-README warnt
// ausdrücklich davor, main direkt zu verwenden, da sich das Format ändern kann).
const AHMEDBASET_BASE = 'https://cdn.jsdelivr.net/gh/AhmedBaset/hadith-json@v1.2.0/db/by_book/other_books';
const AHMEDBASET_FILES: Record<string, string> = {
  riyadassalihin: 'riyad_assalihin',
  bulughalmaram: 'bulugh_almaram',
  adabalmufrad: 'aladab_almufrad',
};

interface AhmedBasetBook {
  metadata: {
    arabic: { title: string };
    english: { title: string };
  };
  chapters: { id: number; arabic: string; english: string }[];
  hadiths: {
    idInBook: number;
    chapterId: number;
    arabic: string;
    english: { narrator: string; text: string };
  }[];
}

// Stand der API (editions.json): Türkisch fehlt nur bei qudsi + dehlawi.
const TURKISH_AVAILABLE = new Set([
  'bukhari',
  'muslim',
  'abudawud',
  'tirmidhi',
  'ibnmajah',
  'nasai',
  'malik',
  'nawawi',
]);

/**
 * Wählt die tatsächlich verfügbare Übersetzungssprache: Türkisch fällt bei
 * Sammlungen ohne tur-Edition auf Englisch zurück statt mit 404 zu scheitern.
 */
export function resolveHadithLang(collection: string, lang: HadithLang): HadithLang {
  if (lang === 'tr' && !TURKISH_AVAILABLE.has(collection)) return 'en';
  return lang;
}

export interface HadithGrade {
  name: string;
  grade: string;
}

export interface HadithEntry {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades: HadithGrade[];
  reference: { book: number; hadith: number };
}

export interface HadithBook {
  metadata: { name: string; sections: Record<string, string> };
  hadiths: HadithEntry[];
}

export interface HadithWithTranslation {
  hadithnumber: number;
  arabic: string;
  translation: string;
  grades: HadithGrade[];
  reference: { book: number; hadith: number };
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`hadith_api_${r.status}`);
  return (await r.json()) as T;
}

const LANG_PREFIX: Record<HadithLang, string> = { ar: 'ara', en: 'eng', tr: 'tur' };

function editionId(collection: string, lang: HadithLang): string {
  return `${LANG_PREFIX[lang]}-${collection}`;
}

async function fetchBook(collection: string, lang: HadithLang): Promise<HadithBook> {
  return getJson<HadithBook>(`${BASE}/${editionId(collection, lang)}.min.json`);
}

/**
 * Wandelt ein AhmedBaset-Buch (Arabisch+Englisch bereits in einer Datei, mit
 * Kapiteln) in dieselbe Form um, die die bestehende UI (Kapitel-Browsing,
 * Suche, Detailansicht) bereits für fawazahmed0-Sammlungen erwartet — so
 * brauchte die UI selbst keine Änderung für die zweite Datenquelle.
 */
export function transformAhmedBasetBook(
  book: AhmedBasetBook,
  lang: HadithLang,
): { meta: HadithBook['metadata']; hadiths: HadithWithTranslation[] } {
  const sections: Record<string, string> = {};
  for (const ch of book.chapters) {
    sections[String(ch.id)] = lang === 'ar' ? ch.arabic : ch.english;
  }
  const hadiths: HadithWithTranslation[] = book.hadiths
    .filter((h) => h.arabic?.trim())
    .map((h) => {
      const narratorPrefix = h.english.narrator ? `${h.english.narrator} ` : '';
      const translated = `${narratorPrefix}${h.english.text}`.trim();
      return {
        hadithnumber: h.idInBook,
        arabic: h.arabic,
        // Fehlt die Übersetzung, arabischen Text zeigen statt leerem Feld.
        translation: lang === 'ar' ? h.arabic : translated || h.arabic,
        grades: [],
        reference: { book: h.chapterId, hadith: h.idInBook },
      };
    });
  return {
    meta: { name: lang === 'ar' ? book.metadata.arabic.title : book.metadata.english.title, sections },
    hadiths,
  };
}

async function fetchAhmedBasetCollection(
  collection: string,
  translationLang: HadithLang,
): Promise<{ meta: HadithBook['metadata']; hadiths: HadithWithTranslation[] }> {
  const lang = resolveHadithLang(collection, translationLang);
  const file = AHMEDBASET_FILES[collection];
  const book = await getJson<AhmedBasetBook>(`${AHMEDBASET_BASE}/${file}.json`);
  return transformAhmedBasetBook(book, lang);
}

/**
 * Lädt ein Hadith-Buch in Arabisch + gewählter Sprache und führt beide anhand
 * von `hadithnumber` zusammen (analog zum Multi-Edition-Zusammenführen bei
 * Quran-Suren, nur dass die Hadith-API keinen kombinierten Endpoint anbietet
 * und zwei separate Requests nötig sind).
 */
export async function fetchHadithCollection(
  collection: string,
  translationLang: HadithLang,
): Promise<{ meta: HadithBook['metadata']; hadiths: HadithWithTranslation[] }> {
  if (COLLECTIONS.find((c) => c.id === collection)?.source === 'ahmedbaset') {
    return fetchAhmedBasetCollection(collection, translationLang);
  }

  const lang = resolveHadithLang(collection, translationLang);
  const [arabicBook, translationBook] =
    lang === 'ar'
      ? [await fetchBook(collection, 'ar'), null]
      : await Promise.all([fetchBook(collection, 'ar'), fetchBook(collection, lang)]);

  const translationByNumber = new Map(
    (translationBook?.hadiths ?? []).map((h) => [h.hadithnumber, h.text]),
  );

  const hadiths: HadithWithTranslation[] = arabicBook.hadiths
    // Kaputte/leere Einträge der CDN-Quelle überspringen (User-Report: "einige
    // Hadithe sind leer") — ein Hadith ohne arabischen Text ist unbrauchbar.
    .filter((h) => h.text?.trim())
    .map((h) => ({
      hadithnumber: h.hadithnumber,
      arabic: h.text,
      // Fehlt die Übersetzung für diese Nummer (Editionen haben teils
      // abweichende Nummerierung/Lücken), NICHT leer lassen, sondern den
      // arabischen Text zeigen — besser als ein leeres Feld.
      translation: (translationBook ? translationByNumber.get(h.hadithnumber) : h.text) || h.text,
      grades: h.grades,
      reference: h.reference,
    }));

  return { meta: arabicBook.metadata, hadiths };
}
