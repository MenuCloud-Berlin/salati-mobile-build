import { fmtDateAladhan, onlyHHMM } from './api';

describe('fmtDateAladhan', () => {
  it('formats a date as DD-MM-YYYY (Aladhan-required path segment)', () => {
    expect(fmtDateAladhan(new Date(2026, 0, 5))).toBe('05-01-2026');
    expect(fmtDateAladhan(new Date(2026, 11, 31))).toBe('31-12-2026');
  });

  it('pads single-digit day and month', () => {
    expect(fmtDateAladhan(new Date(2027, 2, 9))).toBe('09-03-2027');
  });
});

describe('onlyHHMM', () => {
  it('strips Aladhan timezone suffix', () => {
    expect(onlyHHMM('05:12 (CET)')).toBe('05:12');
  });

  it('returns the value unchanged when there is no suffix', () => {
    expect(onlyHHMM('13:45')).toBe('13:45');
  });

  it('returns empty string for undefined input', () => {
    expect(onlyHHMM(undefined)).toBe('');
  });
});
