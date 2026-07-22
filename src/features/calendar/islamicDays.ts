// Kuratierte, breit anerkannte islamische Kalendertage — bewusst als eigene,
// deterministische Hijri-Datums-Zuordnung statt der `hijri.holidays`-Strings
// der AlAdhan-API: die API-Liste ist nur Englisch und enthält überwiegend
// tradition-spezifische Urs-/Scheich-Gedenktage, die weder übersetzbar noch
// für eine neutrale Kern-Islam-App als "besondere Tage" geeignet sind.
// Rückgabe sind Locale-Key-Suffixe (calendar.days.*), 6-sprachig gepflegt.
const ISLAMIC_DAY_KEYS: Record<string, string> = {
  '1-1': 'newYear',
  '1-10': 'ashura',
  '3-12': 'mawlid',
  '7-27': 'miraj',
  '9-1': 'ramadanStart',
  '9-27': 'laylatAlQadr',
  '10-1': 'eidFitr',
  '12-9': 'arafah',
  '12-10': 'eidAdha',
};

export function islamicDayKeys(hijriMonth: number, hijriDay: number): string[] {
  const key = ISLAMIC_DAY_KEYS[`${hijriMonth}-${hijriDay}`];
  return key ? [key] : [];
}
