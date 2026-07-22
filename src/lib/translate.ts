import ar from '@/locales/ar.json';
import bn from '@/locales/bn.json';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fa from '@/locales/fa.json';
import fr from '@/locales/fr.json';
import id from '@/locales/id.json';
import ms from '@/locales/ms.json';
import ps from '@/locales/ps.json';
import ru from '@/locales/ru.json';
import sw from '@/locales/sw.json';
import tr from '@/locales/tr.json';
import ur from '@/locales/ur.json';
import type { Locale } from './locale-detect';

// Partial statt Record<Locale, unknown>: die 8 in Phase 1 (#60) ergänzten
// Locale-Codes (id/bn/fa/ms/ur/sw/ru/ps) werden erst nacheinander pro Sprache
// importiert, sobald ihre locales/*.json fertig übersetzt ist — bis dahin
// greift der bestehende Fallback auf Englisch/Deutsch unten.
const DICTIONARIES: Partial<Record<Locale, unknown>> = { de, en, tr, ar, es, fr, id, bn, fa, ms, ur, ru, sw, ps };

/**
 * Auflösung eines gepunkteten Keys ("nav.qibla") gegen das Wörterbuch der
 * eingestellten Sprache, mit Fallback auf Deutsch, dann auf den Key selbst.
 * Umfasst aktuell Navigation + gängige UI-Begriffe (common.*) — vollständige
 * Screen-Inhalte sind noch nicht übersetzt (Follow-up, siehe USER-TODO).
 *
 * Bewusst ohne Abhängigkeit auf den Settings-Store gehalten (reine Funktion,
 * testbar ohne AsyncStorage-Mock).
 */
export function translate(locale: Locale, key: string): string {
  const segments = key.split('.');
  const lookup = (dict: unknown): string | undefined => {
    let cur: unknown = dict;
    for (const seg of segments) {
      if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        return undefined;
      }
    }
    return typeof cur === 'string' ? cur : undefined;
  };
  return lookup(DICTIONARIES[locale]) ?? lookup(DICTIONARIES.en) ?? lookup(DICTIONARIES.de) ?? key;
}
