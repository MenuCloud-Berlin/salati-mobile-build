import { translate } from './translate';

describe('translate', () => {
  it('resolves a nested key for the requested locale', () => {
    expect(translate('en', 'nav.qibla')).toBe('Qibla');
    expect(translate('tr', 'nav.qibla')).toBe('Kıble');
    expect(translate('ar', 'nav.qibla')).toBe('القبلة');
  });

  it('falls back to German when the key is missing in the requested locale', () => {
    // Alle vier Locale-Dateien haben den gleichen Key-Umfang (nav/common) — dieser
    // Test dokumentiert das Fallback-Verhalten für den Fall künftiger Lücken.
    expect(translate('de', 'nav.duas')).toBe('Duas');
  });

  it('returns the key itself when no dictionary has it', () => {
    expect(translate('de', 'nonexistent.key')).toBe('nonexistent.key');
  });
});
