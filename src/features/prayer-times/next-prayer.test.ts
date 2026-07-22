import { formatClock, formatCountdown, formatHHMM, nextPrayer } from './next-prayer';
import type { Timings as ApiTimings } from './api';

const today: ApiTimings = {
  Fajr: '04:30',
  Sunrise: '06:10',
  Dhuhr: '13:15',
  Asr: '17:00',
  Maghrib: '20:45',
  Isha: '22:15',
};

const tomorrow: ApiTimings = {
  Fajr: '04:32',
  Sunrise: '06:12',
  Dhuhr: '13:15',
  Asr: '17:01',
  Maghrib: '20:43',
  Isha: '22:13',
};

function at(hh: number, mm: number): Date {
  const d = new Date(2026, 5, 15, hh, mm, 0, 0);
  return d;
}

describe('nextPrayer', () => {
  it('picks the next prayer later today', () => {
    const result = nextPrayer(today, tomorrow, at(12, 0));
    expect(result.nextPrayer).toBe('Dhuhr');
    expect(result.nextIdx).toBe(1);
    expect(result.diffMs).toBeGreaterThan(0);
  });

  it('picks Fajr right after midnight boundary within the same day timings', () => {
    const result = nextPrayer(today, tomorrow, at(0, 0));
    expect(result.nextPrayer).toBe('Fajr');
    expect(result.nextIdx).toBe(0);
  });

  it('rolls over to tomorrow Fajr once all of today has passed', () => {
    const result = nextPrayer(today, tomorrow, at(23, 0));
    expect(result.nextPrayer).toBe('Fajr');
    expect(result.nextIdx).toBe(-1);
    // Tomorrow's date, not today's
    expect(result.nextTs.getDate()).toBe(16);
    expect(result.nextTs.getHours()).toBe(4);
    expect(result.nextTs.getMinutes()).toBe(32);
  });

  it('clamps diffMs to 0, never negative', () => {
    const result = nextPrayer(today, tomorrow, at(23, 59));
    expect(result.diffMs).toBeGreaterThanOrEqual(0);
  });
});

describe('formatCountdown', () => {
  it('formats hours/minutes/seconds with zero-padding', () => {
    expect(formatCountdown(3 * 3600_000 + 5 * 60_000 + 9_000)).toBe('3h 05m 09s');
  });

  it('formats sub-hour durations correctly', () => {
    expect(formatCountdown(65_000)).toBe('0h 01m 05s');
  });
});

describe('formatClock', () => {
  it('formats 24h with zero-padding', () => {
    expect(formatClock(4, 5, '24h')).toBe('04:05');
    expect(formatClock(23, 59, '24h')).toBe('23:59');
  });

  it('formats 12h with AM/PM and midnight/noon edge cases', () => {
    expect(formatClock(0, 0, '12h')).toBe('12:00 AM');
    expect(formatClock(12, 0, '12h')).toBe('12:00 PM');
    expect(formatClock(13, 30, '12h')).toBe('1:30 PM');
    expect(formatClock(23, 5, '12h')).toBe('11:05 PM');
  });
});

describe('formatHHMM', () => {
  it('parses an Aladhan "HH:MM" string and reformats it', () => {
    expect(formatHHMM('04:30', '24h')).toBe('04:30');
    expect(formatHHMM('04:30', '12h')).toBe('4:30 AM');
    expect(formatHHMM('20:45', '12h')).toBe('8:45 PM');
  });
});
