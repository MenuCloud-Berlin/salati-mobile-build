// Video-Daten: die Lernvideos (37 Folgen, 4 Reihen). Cover, MP4 und Metadaten
// liegen OeFFENTLICH auf Cloudflare R2 und werden ueber eine einzige index.json
// geladen — kein Client noetig (gleiches Muster wie fetchPodcastIndex: nur
// `fetch`). Das Schema ist bewusst dem Podcast-Contract nachgebildet
// (episode_no/title/description/topics/series/series_title/duration_sec/
// cover_url) mit `video_url` statt `audio_url`, damit Liste, Player und
// Reihen-Gruppierung dieselben Muster nutzen koennen.

const VIDEO_BASE = 'https://pub-d0489c0572704285af79896edb72cbed.r2.dev/videos';
export const VIDEO_INDEX_URL = `${VIDEO_BASE}/index.json`;

export interface VideoEpisode {
  episode_no: number;
  title: string;
  description?: string;
  topics: string[];
  duration_sec: number;
  video_url: string;
  cover_url: string;
  /** Reihen-Kennung (z. B. "grammar", "madinah", "vocab", "tajwid") zur
   *  Gruppierung mehrerer Folgen-Reihen. OPTIONAL + rueckwaertskompatibel:
   *  fehlt das Feld, gehoert die Folge in eine gemeinsame Default-Reihe. */
  series?: string;
  /** Anzeigename der Reihe (Section-Header). Faellt auf `series` zurueck. */
  series_title?: string;
}

export interface VideoIndex {
  episodes: VideoEpisode[];
}

export async function fetchVideoIndex(): Promise<VideoIndex> {
  const r = await fetch(VIDEO_INDEX_URL, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`video_index_${r.status}`);
  const j = (await r.json()) as VideoIndex;
  j.episodes = (j.episodes ?? []).sort((a, b) => a.episode_no - b.episode_no);
  return j;
}

/** mm:ss aus Sekunden. */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const DEFAULT_SERIES_KEY = '__default__';

export interface VideoSeriesGroup {
  /** Reihen-Kennung; fuer Folgen ohne `series` der Default-Schluessel. */
  key: string;
  /** Section-Header-Text; `null` fuer die Default-Reihe (kein `series`-Feld). */
  title: string | null;
  episodes: VideoEpisode[];
}

/**
 * Gruppiert Folgen nach `series` in Erst-Auftritts-Reihenfolge. Folgen ohne
 * `series` landen in einer Default-Gruppe (title = null). Rueckwaertskompatibel:
 * ohne series-Feld entsteht genau EINE Default-Gruppe.
 */
export function groupEpisodesBySeries(episodes: VideoEpisode[]): VideoSeriesGroup[] {
  const order: string[] = [];
  const map = new Map<string, VideoSeriesGroup>();
  for (const ep of episodes) {
    const seriesId = ep.series?.trim();
    const key = seriesId || DEFAULT_SERIES_KEY;
    let group = map.get(key);
    if (!group) {
      group = { key, title: seriesId ? ep.series_title?.trim() || seriesId : null, episodes: [] };
      map.set(key, group);
      order.push(key);
    } else if (!group.title && seriesId && ep.series_title?.trim()) {
      group.title = ep.series_title.trim();
    }
    group.episodes.push(ep);
  }
  return order.map((k) => map.get(k)!);
}

/** true, sobald mindestens zwei verschiedene Reihen vorkommen — erst dann
 *  werden in der Liste sichtbare Section-Header gezeigt. */
export function hasMultipleSeries(episodes: VideoEpisode[]): boolean {
  const seen = new Set<string>();
  for (const ep of episodes) {
    seen.add(ep.series?.trim() || DEFAULT_SERIES_KEY);
    if (seen.size > 1) return true;
  }
  return false;
}
