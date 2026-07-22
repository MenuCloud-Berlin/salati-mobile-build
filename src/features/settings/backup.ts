import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { HIFZ_STORAGE_KEY, parseHifzProgress, type HifzProgress } from '@/features/hifz/progress';
import { LEARN_PROGRESS_STORAGE_KEY, parseLearnProgress, type LearnProgress } from '@/features/learn/progress';
import { listDownloadedReciters } from '@/features/quran/offline-audio';
import { parseProgress, QURAN_PROGRESS_STORAGE_KEY, type QuranProgress } from '@/features/quran/progress';
import { COURSE_META } from '@/features/study/courses';

// Fortschritt exportieren/importieren: die App hat bewusst kein Konto/Cloud-
// Sync (Privacy-Positionierung), Fortschritt liegt daher ausschließlich lokal
// in AsyncStorage/FileSystem und geht bei Geräte-/App-Wechsel verloren. Dieses
// Modul bündelt alle betroffenen Keys in EIN JSON, das der Nutzer selbst
// exportieren/aufheben/wieder einspielen kann - ohne jeden Cloud-Zwang.
//
// Recherchierte AsyncStorage-Keys/Datenstrukturen (Stand 2026-07-20):
// - Study-Kurs-Fortschritt: pro Kurs EIN eigener Key `salatibox:study-{id}`
//   (COURSE_META[].storageKey, siehe features/study/courses.ts). Format ist
//   LearnProgress = Record<lessonId, {score,total,completedAt}>, generisch
//   verwaltet über useCourseProgress(storageKey) in features/learn/progress.ts.
//   Die Basis "Koran lesen lernen" nutzt denselben Mechanismus unter dem
//   eigenen Key LEARN_PROGRESS_STORAGE_KEY ("salatibox:learn-progress") -
//   gehört inhaltlich zum Lernfortschritt dazu und wird mit exportiert.
// - Hifz-Fortschritt: EIN Key HIFZ_STORAGE_KEY ("salatibox:hifz-progress"),
//   Format HifzProgress = Record<surah, Record<ayah, 'known'|'learning'>>
//   (features/hifz/progress.ts).
// - Favoriten/Lesezeichen (+ Notizen + Leseverlauf, gehören zum selben Key):
//   EIN Key QURAN_PROGRESS_STORAGE_KEY ("salatibox:quran-progress"), Format
//   { bookmarks, lastRead, notes, history } (features/quran/progress.ts).
// - Rezitator-Downloads: KEIN eigener Speicher-Key wird exportiert - laut
//   Aufgabenstellung nur die Namen (listDownloadedReciters() aus
//   features/quran/offline-audio.ts) als Info, damit der Nutzer nach einem
//   Import weiß, welche Rezitatoren er bei Bedarf erneut herunterladen muss.
//   Die Audio-Dateien selbst werden nie mit exportiert (zu groß).

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupData {
  formatVersion: number;
  exportedAt: number;
  learnProgress: LearnProgress;
  /** storageKey (COURSE_META[].storageKey) -> Fortschritt dieses Kurses. */
  courseProgress: Record<string, LearnProgress>;
  hifzProgress: HifzProgress;
  quranProgress: QuranProgress;
  /** Nur Rezitator-Kennungen, informativ - keine Audio-Dateien. */
  downloadedReciters: string[];
}

export const BACKUP_FILE_NAME = 'salati-fortschritt.json';

export function courseStorageKeys(): string[] {
  return COURSE_META.map((c) => c.storageKey);
}

/** Sammelt den aktuellen lokalen Zustand aller betroffenen Keys zu einem Backup-Objekt. */
export async function collectBackupData(now: number = Date.now()): Promise<BackupData> {
  const learnProgress = parseLearnProgress(await AsyncStorage.getItem(LEARN_PROGRESS_STORAGE_KEY));

  const courseProgress: Record<string, LearnProgress> = {};
  for (const key of courseStorageKeys()) {
    courseProgress[key] = parseLearnProgress(await AsyncStorage.getItem(key));
  }

  const hifzProgress = parseHifzProgress(await AsyncStorage.getItem(HIFZ_STORAGE_KEY));
  const quranProgress = parseProgress(await AsyncStorage.getItem(QURAN_PROGRESS_STORAGE_KEY));
  const downloadedReciters = (await listDownloadedReciters()).map((pack) => pack.reciter);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: now,
    learnProgress,
    courseProgress,
    hifzProgress,
    quranProgress,
    downloadedReciters,
  };
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2);
}

/** Schreibt das Backup als Datei ins Cache-Verzeichnis (für den Share-Sheet) und liefert die URI. */
export async function writeBackupFile(data: BackupData): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}${BACKUP_FILE_NAME}`;
  await FileSystem.writeAsStringAsync(uri, serializeBackup(data));
  return uri;
}

export async function readBackupFile(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri);
}

export type ParsedBackup =
  | { ok: true; data: BackupData }
  | { ok: false; reason: 'invalid_json' | 'invalid_shape' | 'unsupported_version' };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validiert + normalisiert eine importierte Backup-Datei. Robust gegen von
 * Hand editierte/kaputte JSONs: jedes Teilfeld fällt bei Format-Fehlern für
 * sich genommen auf einen leeren Zustand zurück (wie parseHifzProgress/
 * parseProgress/parseLearnProgress es beim normalen Laden auch tun) - AUSSER
 * die Formatversion ist neuer als das, was diese App-Version versteht: dann
 * wird der komplette Import abgelehnt, statt still falsche/unvollständige
 * Daten zurückzuschreiben.
 */
export function parseBackupFile(raw: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
  if (!isPlainObject(parsed)) return { ok: false, reason: 'invalid_shape' };
  if (typeof parsed.formatVersion !== 'number' || parsed.formatVersion > BACKUP_FORMAT_VERSION) {
    return { ok: false, reason: 'unsupported_version' };
  }

  const courseProgress: Record<string, LearnProgress> = {};
  if (isPlainObject(parsed.courseProgress)) {
    for (const [key, value] of Object.entries(parsed.courseProgress)) {
      courseProgress[key] = parseLearnProgress(JSON.stringify(value ?? {}));
    }
  }

  return {
    ok: true,
    data: {
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : Date.now(),
      learnProgress: parseLearnProgress(JSON.stringify(parsed.learnProgress ?? {})),
      courseProgress,
      hifzProgress: parseHifzProgress(JSON.stringify(parsed.hifzProgress ?? {})),
      quranProgress: parseProgress(JSON.stringify(parsed.quranProgress ?? {})),
      downloadedReciters: Array.isArray(parsed.downloadedReciters)
        ? parsed.downloadedReciters.filter((r): r is string => typeof r === 'string')
        : [],
    },
  };
}

/** Schreibt ein validiertes Backup zurück in AsyncStorage - überschreibt den aktuellen lokalen Fortschritt. */
export async function applyBackupData(data: BackupData): Promise<void> {
  await AsyncStorage.setItem(LEARN_PROGRESS_STORAGE_KEY, JSON.stringify(data.learnProgress));
  for (const [key, value] of Object.entries(data.courseProgress)) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }
  await AsyncStorage.setItem(HIFZ_STORAGE_KEY, JSON.stringify(data.hifzProgress));
  await AsyncStorage.setItem(QURAN_PROGRESS_STORAGE_KEY, JSON.stringify(data.quranProgress));
}
