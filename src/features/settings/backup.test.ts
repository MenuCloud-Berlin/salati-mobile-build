import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { HIFZ_STORAGE_KEY } from '@/features/hifz/progress';
import { LEARN_PROGRESS_STORAGE_KEY } from '@/features/learn/progress';
import { OFFLINE_AUDIO_INDEX_KEY } from '@/features/quran/offline-audio';
import { QURAN_PROGRESS_STORAGE_KEY } from '@/features/quran/progress';
import { COURSE_META } from '@/features/study/courses';

import {
  applyBackupData,
  BACKUP_FORMAT_VERSION,
  collectBackupData,
  courseStorageKeys,
  parseBackupFile,
  readBackupFile,
  serializeBackup,
  writeBackupFile,
  type BackupData,
} from './backup';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
}));

const EMPTY_QURAN_PROGRESS = { bookmarks: [], lastRead: null, notes: [], history: [] };

describe('collectBackupData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('liefert leere Defaults, wenn noch nirgendwo Fortschritt existiert', async () => {
    const data = await collectBackupData(1000);
    expect(data.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(data.exportedAt).toBe(1000);
    expect(data.learnProgress).toEqual({});
    expect(data.hifzProgress).toEqual({});
    expect(data.quranProgress).toEqual(EMPTY_QURAN_PROGRESS);
    expect(data.downloadedReciters).toEqual([]);
    // ein Eintrag je bekanntem Kurs, alle leer
    expect(Object.keys(data.courseProgress).sort()).toEqual(courseStorageKeys().sort());
  });

  it('sammelt echten Fortschritt aus allen betroffenen Keys', async () => {
    await AsyncStorage.setItem(LEARN_PROGRESS_STORAGE_KEY, JSON.stringify({ l1: { score: 8, total: 10, completedAt: 1 } }));
    const tajwidKey = COURSE_META.find((c) => c.id === 'tajwid')!.storageKey;
    await AsyncStorage.setItem(tajwidKey, JSON.stringify({ tj1: { score: 5, total: 5, completedAt: 2 } }));
    await AsyncStorage.setItem(HIFZ_STORAGE_KEY, JSON.stringify({ 1: { 1: 'known' } }));
    await AsyncStorage.setItem(
      QURAN_PROGRESS_STORAGE_KEY,
      JSON.stringify({ bookmarks: [{ surah: 2, ayah: 255, createdAt: 5 }], lastRead: null, notes: [], history: [] }),
    );
    await AsyncStorage.setItem(OFFLINE_AUDIO_INDEX_KEY, JSON.stringify({ 'ar.alafasy|1': 7 }));

    const data = await collectBackupData(2000);
    expect(data.learnProgress).toEqual({ l1: { score: 8, total: 10, completedAt: 1 } });
    expect(data.courseProgress[tajwidKey]).toEqual({ tj1: { score: 5, total: 5, completedAt: 2 } });
    expect(data.hifzProgress).toEqual({ 1: { 1: 'known' } });
    expect(data.quranProgress.bookmarks).toEqual([{ surah: 2, ayah: 255, createdAt: 5 }]);
    expect(data.downloadedReciters).toEqual(['ar.alafasy']);
  });
});

describe('serializeBackup / parseBackupFile roundtrip', () => {
  const sample: BackupData = {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: 12345,
    learnProgress: { l1: { score: 9, total: 10, completedAt: 1 } },
    courseProgress: { 'salatibox:study-tajwid': { tj1: { score: 5, total: 5, completedAt: 2 } } },
    hifzProgress: { 1: { 1: 'known', 2: 'learning' } },
    quranProgress: { bookmarks: [{ surah: 18, ayah: 10, createdAt: 3 }], lastRead: { surah: 18, ayah: 10, updatedAt: 3 }, notes: [], history: [] },
    downloadedReciters: ['ar.alafasy', 'ar.husary'],
  };

  it('parst ein zuvor serialisiertes Backup identisch zurück', () => {
    const result = parseBackupFile(serializeBackup(sample));
    expect(result).toEqual({ ok: true, data: sample });
  });
});

describe('parseBackupFile: Fehlerfälle', () => {
  it('kaputtes JSON -> invalid_json', () => {
    expect(parseBackupFile('{nope')).toEqual({ ok: false, reason: 'invalid_json' });
  });

  it('gültiges JSON, aber kein Objekt -> invalid_shape', () => {
    expect(parseBackupFile('[]')).toEqual({ ok: false, reason: 'invalid_shape' });
    expect(parseBackupFile('42')).toEqual({ ok: false, reason: 'invalid_shape' });
    expect(parseBackupFile('null')).toEqual({ ok: false, reason: 'invalid_shape' });
  });

  it('fehlendes formatVersion-Feld -> unsupported_version', () => {
    expect(parseBackupFile(JSON.stringify({ hifzProgress: {} }))).toEqual({
      ok: false,
      reason: 'unsupported_version',
    });
  });

  it('zu neue Formatversion wird abgelehnt statt still falsch importiert', () => {
    expect(parseBackupFile(JSON.stringify({ formatVersion: BACKUP_FORMAT_VERSION + 1 }))).toEqual({
      ok: false,
      reason: 'unsupported_version',
    });
  });

  it('kaputte Teilfelder fallen auf leere Defaults zurück statt den ganzen Import abzulehnen', () => {
    const result = parseBackupFile(
      JSON.stringify({
        formatVersion: BACKUP_FORMAT_VERSION,
        hifzProgress: 'nicht-mal-ein-objekt',
        quranProgress: [1, 2, 3],
        courseProgress: 'kaputt',
        downloadedReciters: ['a', 1, null, 'b'],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.data.hifzProgress).toEqual({});
    expect(result.data.quranProgress).toEqual(EMPTY_QURAN_PROGRESS);
    expect(result.data.courseProgress).toEqual({});
    expect(result.data.downloadedReciters).toEqual(['a', 'b']);
  });

  it('fehlendes exportedAt bekommt einen Now-Fallback statt NaN', () => {
    const result = parseBackupFile(JSON.stringify({ formatVersion: BACKUP_FORMAT_VERSION }));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(typeof result.data.exportedAt).toBe('number');
    expect(Number.isNaN(result.data.exportedAt)).toBe(false);
  });
});

describe('applyBackupData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('schreibt alle Felder zurück in ihre jeweiligen AsyncStorage-Keys', async () => {
    const tajwidKey = COURSE_META.find((c) => c.id === 'tajwid')!.storageKey;
    const data: BackupData = {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: 1,
      learnProgress: { l1: { score: 1, total: 1, completedAt: 1 } },
      courseProgress: { [tajwidKey]: { tj1: { score: 1, total: 1, completedAt: 1 } } },
      hifzProgress: { 2: { 5: 'known' } },
      quranProgress: { bookmarks: [{ surah: 1, ayah: 1, createdAt: 1 }], lastRead: null, notes: [], history: [] },
      downloadedReciters: ['ar.alafasy'],
    };

    await applyBackupData(data);

    expect(JSON.parse((await AsyncStorage.getItem(LEARN_PROGRESS_STORAGE_KEY))!)).toEqual(data.learnProgress);
    expect(JSON.parse((await AsyncStorage.getItem(tajwidKey))!)).toEqual(data.courseProgress[tajwidKey]);
    expect(JSON.parse((await AsyncStorage.getItem(HIFZ_STORAGE_KEY))!)).toEqual(data.hifzProgress);
    expect(JSON.parse((await AsyncStorage.getItem(QURAN_PROGRESS_STORAGE_KEY))!)).toEqual(data.quranProgress);
  });

  it('überschreibt vorhandenen Fortschritt vollständig (kein Merge)', async () => {
    await AsyncStorage.setItem(HIFZ_STORAGE_KEY, JSON.stringify({ 9: { 9: 'known' } }));
    await applyBackupData({
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: 1,
      learnProgress: {},
      courseProgress: {},
      hifzProgress: { 1: { 1: 'known' } },
      quranProgress: EMPTY_QURAN_PROGRESS,
      downloadedReciters: [],
    });
    expect(JSON.parse((await AsyncStorage.getItem(HIFZ_STORAGE_KEY))!)).toEqual({ 1: { 1: 'known' } });
  });
});

describe('writeBackupFile / readBackupFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schreibt die serialisierte Backup-Datei ins Cache-Verzeichnis und liest sie wieder', async () => {
    const data: BackupData = {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: 1,
      learnProgress: {},
      courseProgress: {},
      hifzProgress: {},
      quranProgress: EMPTY_QURAN_PROGRESS,
      downloadedReciters: [],
    };
    const uri = await writeBackupFile(data);
    expect(uri).toBe('file:///cache/salati-fortschritt.json');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(uri, serializeBackup(data));

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce(serializeBackup(data));
    const raw = await readBackupFile(uri);
    expect(parseBackupFile(raw)).toEqual({ ok: true, data });
  });
});
