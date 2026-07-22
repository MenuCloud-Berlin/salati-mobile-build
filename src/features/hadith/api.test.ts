import { COLLECTIONS, resolveHadithLang, transformAhmedBasetBook } from './api';

describe('resolveHadithLang', () => {
  it('lässt Arabisch und Englisch immer durch', () => {
    for (const c of COLLECTIONS) {
      expect(resolveHadithLang(c.id, 'ar')).toBe('ar');
      expect(resolveHadithLang(c.id, 'en')).toBe('en');
    }
  });

  it('erlaubt Türkisch bei Sammlungen mit tur-Edition', () => {
    expect(resolveHadithLang('bukhari', 'tr')).toBe('tr');
    expect(resolveHadithLang('nawawi', 'tr')).toBe('tr');
  });

  it('fällt bei qudsi/dehlawi von Türkisch auf Englisch zurück', () => {
    expect(resolveHadithLang('qudsi', 'tr')).toBe('en');
    expect(resolveHadithLang('dehlawi', 'tr')).toBe('en');
  });

  it('fällt bei den neuen AhmedBaset-Sammlungen (nur ar/en) von Türkisch auf Englisch zurück', () => {
    expect(resolveHadithLang('riyadassalihin', 'tr')).toBe('en');
    expect(resolveHadithLang('bulughalmaram', 'tr')).toBe('en');
    expect(resolveHadithLang('adabalmufrad', 'tr')).toBe('en');
  });
});

describe('transformAhmedBasetBook', () => {
  const sample = {
    metadata: {
      arabic: { title: 'رياض الصالحين' },
      english: { title: 'Riyad as-Salihin' },
    },
    chapters: [
      { id: 1, arabic: 'كتاب الأدب', english: 'The Book of Good Manners' },
      { id: 2, arabic: 'كتاب الأدعية', english: 'The Book of Duas' },
    ],
    hadiths: [
      {
        idInBook: 1,
        chapterId: 1,
        arabic: 'نص عربي أول',
        english: { narrator: "Ibn 'Umar reported:", text: 'First hadith text.' },
      },
      {
        idInBook: 2,
        chapterId: 1,
        arabic: 'نص عربي ثان',
        english: { narrator: '', text: 'Second hadith text with no narrator.' },
      },
    ],
  };

  it('uses the English title and chapter names when lang is en', () => {
    const result = transformAhmedBasetBook(sample, 'en');
    expect(result.meta.name).toBe('Riyad as-Salihin');
    expect(result.meta.sections).toEqual({ '1': 'The Book of Good Manners', '2': 'The Book of Duas' });
  });

  it('uses the Arabic title and chapter names when lang is ar', () => {
    const result = transformAhmedBasetBook(sample, 'ar');
    expect(result.meta.name).toBe('رياض الصالحين');
    expect(result.meta.sections['1']).toBe('كتاب الأدب');
  });

  it('prefixes the translation with the narrator when present', () => {
    const result = transformAhmedBasetBook(sample, 'en');
    expect(result.hadiths[0].translation).toBe("Ibn 'Umar reported: First hadith text.");
  });

  it('omits the narrator prefix when the narrator is empty', () => {
    const result = transformAhmedBasetBook(sample, 'en');
    expect(result.hadiths[1].translation).toBe('Second hadith text with no narrator.');
  });

  it('sets translation equal to the arabic text when lang is ar', () => {
    const result = transformAhmedBasetBook(sample, 'ar');
    expect(result.hadiths[0].translation).toBe(result.hadiths[0].arabic);
  });

  it('maps idInBook to hadithnumber and chapterId to reference.book', () => {
    const result = transformAhmedBasetBook(sample, 'en');
    expect(result.hadiths[0]).toMatchObject({
      hadithnumber: 1,
      reference: { book: 1, hadith: 1 },
      grades: [],
    });
  });
});
