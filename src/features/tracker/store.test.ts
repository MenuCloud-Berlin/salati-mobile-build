import {
  completedCount,
  currentStreak,
  dayKey,
  isDayComplete,
  lastDays,
  parseTracker,
  togglePrayer,
  type TrackerData,
} from './store';

const fullDay = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };

describe('prayer tracker', () => {
  it('toggle setzt und entfernt', () => {
    let data: TrackerData = {};
    data = togglePrayer(data, '2026-07-13', 'fajr');
    expect(data['2026-07-13'].fajr).toBe(true);
    data = togglePrayer(data, '2026-07-13', 'fajr');
    expect(data['2026-07-13'].fajr).toBe(false);
  });

  it('completedCount und isDayComplete', () => {
    const data: TrackerData = { '2026-07-13': { fajr: true, dhuhr: true } };
    expect(completedCount(data, '2026-07-13')).toBe(2);
    expect(isDayComplete(data, '2026-07-13')).toBe(false);
    expect(isDayComplete({ '2026-07-13': fullDay }, '2026-07-13')).toBe(true);
  });

  it('Streak zählt zusammenhängende komplette Tage, heute optional', () => {
    const today = new Date(2026, 6, 13);
    const data: TrackerData = {
      '2026-07-11': fullDay,
      '2026-07-12': fullDay,
      // heute (13.) noch unvollständig
      '2026-07-13': { fajr: true },
    };
    expect(currentStreak(data, today)).toBe(2);
    // heute komplett → 3
    expect(currentStreak({ ...data, '2026-07-13': fullDay }, today)).toBe(3);
    // Lücke bricht die Serie
    expect(currentStreak({ '2026-07-10': fullDay }, today)).toBe(0);
  });

  it('lastDays liefert n Tage, älteste zuerst', () => {
    const days = lastDays({}, new Date(2026, 6, 13), 7);
    expect(days).toHaveLength(7);
    expect(days[0].day).toBe('2026-07-07');
    expect(days[6].day).toBe('2026-07-13');
  });

  it('dayKey und parseTracker defensiv', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(parseTracker(null)).toEqual({});
    expect(parseTracker('{kaputt')).toEqual({});
    // Array statt Objekt darf nicht durchrutschen (typeof [] === 'object')
    expect(parseTracker('[]')).toEqual({});
    expect(parseTracker('null')).toEqual({});
  });
});
