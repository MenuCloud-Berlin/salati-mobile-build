import { parsePrayerQadaData, totalQadaOwed } from './qada';

describe('parsePrayerQadaData', () => {
  it('leerer Datensatz bei null (kein gespeicherter Wert)', () => {
    expect(parsePrayerQadaData(null)).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
  });

  it('parst einen gültigen Pro-Gebetsart-Datensatz', () => {
    expect(parsePrayerQadaData('{"fajr":3,"dhuhr":0,"asr":1,"maghrib":2,"isha":0}')).toEqual({
      fajr: 3,
      dhuhr: 0,
      asr: 1,
      maghrib: 2,
      isha: 0,
    });
  });

  it('rundet auf ganze Gebete ab und ignoriert negative Werte', () => {
    expect(parsePrayerQadaData('{"fajr":3.7,"dhuhr":-2,"asr":0,"maghrib":0,"isha":0}')).toEqual({
      fajr: 3,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    });
  });

  it('leerer Datensatz bei kaputtem JSON oder falscher Struktur', () => {
    expect(parsePrayerQadaData('nope')).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
    expect(parsePrayerQadaData('[1,2,3]')).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
    expect(parsePrayerQadaData('')).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
  });

  it('ignoriert unbekannte Felder und füllt fehlende Gebetsarten mit 0', () => {
    expect(parsePrayerQadaData('{"fajr":2,"witr":5,"unknown":9}')).toEqual({
      fajr: 2,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    });
  });

  it('Legacy-Format (einzelne Zahl aus der Vor-Pro-Gebetsart-Version) wird komplett auf Fajr gebucht', () => {
    expect(parsePrayerQadaData('5')).toEqual({ fajr: 5, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
  });

  it('negative Legacy-Zahl ergibt leeren Datensatz', () => {
    expect(parsePrayerQadaData('-3')).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
  });
});

describe('totalQadaOwed', () => {
  it('summiert alle Gebetsarten', () => {
    expect(totalQadaOwed({ fajr: 3, dhuhr: 0, asr: 1, maghrib: 2, isha: 0 })).toBe(6);
  });

  it('0 bei leerem Datensatz', () => {
    expect(totalQadaOwed({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 })).toBe(0);
  });
});
