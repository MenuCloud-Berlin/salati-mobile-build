import { hadithDeepLink, quranAyahDeepLink } from './deepLinks';

describe('quranAyahDeepLink', () => {
  it('builds a salatibox:// link with surah and ayah', () => {
    expect(quranAyahDeepLink(2, 255)).toBe('salatibox://quran/2?ayah=255');
  });
});

describe('hadithDeepLink', () => {
  it('builds a salatibox:// link with collection and number', () => {
    expect(hadithDeepLink('nawawi', 1)).toBe('salatibox://hadith/nawawi/1');
  });
});
