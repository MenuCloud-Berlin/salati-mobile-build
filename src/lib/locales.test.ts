import de from '@/locales/de.json';
import { SUPPORTED_LOCALES } from './locale-detect';

/**
 * Strukturelle Vollständigkeit ist bei den Locale-JSONs kritisch: ein
 * fehlender/zusätzlicher Key oder eine andere Verschachtelung bricht
 * `translate()` still (Fallback auf Deutsch/Englisch verschleiert Lücken
 * im UI statt sie hier beim Build sichtbar zu machen).
 */
function collectKeyPaths(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null) return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe('locale files match de.json key structure', () => {
  const deKeys = collectKeyPaths(de).sort();

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === 'de') continue;
    it(`${locale}.json has exactly the same keys as de.json`, () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamischer Pfad, kein statischer Import möglich
      const dict = require(`@/locales/${locale}.json`);
      const keys = collectKeyPaths(dict).sort();
      expect(keys).toEqual(deKeys);
    });
  }
});
