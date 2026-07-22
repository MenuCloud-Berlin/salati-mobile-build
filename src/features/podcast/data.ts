// Podcast-Daten: der deutsche Quran-Arabisch-Podcast (15 Folgen). Audio,
// Cover, Transkript und Metadaten liegen im OeFFENTLICHEN Supabase-Storage-
// Bucket `podcasts` und werden ueber eine einzige index.json geladen — kein
// Supabase-Client noetig (gleiches Muster wie fetchRadios: nur `fetch`).
// Erzeugt/gepflegt von podcast/scripts/upload.py.

const PODCAST_BASE =
  'https://oulyzhselufekxekkqjp.supabase.co/storage/v1/object/public/podcasts';
export const PODCAST_INDEX_URL = `${PODCAST_BASE}/index.json`;

/** Ein Transkript-Segment: deutscher Erzaehltext oder arabische Rezitation.
 *  `ar`-Segmente werden im Reader RTL + mit der Koran-Schrift gerendert. */
export interface TranscriptSegment {
  type: 'de' | 'ar';
  text: string;
  /** Startzeit im Audio (ms), falls die Vertonung Zeitmarken geliefert hat —
   *  ermoeglicht synchrones Mitlesen (Segment-Highlight). Optional. */
  start_ms?: number;
  end_ms?: number;
}

export interface PodcastEpisode {
  episode_no: number;
  title: string;
  description?: string;
  topics: string[];
  duration_sec: number;
  audio_url: string;
  cover_url: string;
  transcript: TranscriptSegment[];
  /** Reihen-Kennung (z. B. "grammar", "madinah", "vocab", "tajwid") zur
   *  Gruppierung mehrerer Folgen-Reihen. OPTIONAL + rückwärtskompatibel: fehlt
   *  das Feld, gehört die Folge in eine gemeinsame Default-Reihe und die Liste
   *  verhält sich wie bisher (keine sichtbaren Section-Header). */
  series?: string;
  /** Anzeigename der Reihe (Section-Header). Fällt auf `series` zurück, wenn
   *  nicht gesetzt. */
  series_title?: string;
}

export interface PodcastSeries {
  title: string;
  subtitle: string;
  description: string;
  cover_url: string;
}

export interface PodcastIndex {
  updated_at: string;
  series: PodcastSeries;
  episodes: PodcastEpisode[];
}

export async function fetchPodcastIndex(): Promise<PodcastIndex> {
  const r = await fetch(PODCAST_INDEX_URL, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`podcast_index_${r.status}`);
  const j = (await r.json()) as PodcastIndex;
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

export interface PodcastSeriesGroup {
  /** Reihen-Kennung; für Folgen ohne `series` der Default-Schlüssel. */
  key: string;
  /** Section-Header-Text; `null` für die Default-Reihe (kein `series`-Feld). */
  title: string | null;
  episodes: PodcastEpisode[];
}

/**
 * Gruppiert Folgen nach `series` in Erst-Auftritts-Reihenfolge. Folgen ohne
 * `series` landen in einer Default-Gruppe (title = null). Rückwärtskompatibel:
 * ohne series-Feld entsteht genau EINE Default-Gruppe.
 */
export function groupEpisodesBySeries(episodes: PodcastEpisode[]): PodcastSeriesGroup[] {
  const order: string[] = [];
  const map = new Map<string, PodcastSeriesGroup>();
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
export function hasMultipleSeries(episodes: PodcastEpisode[]): boolean {
  const seen = new Set<string>();
  for (const ep of episodes) {
    seen.add(ep.series?.trim() || DEFAULT_SERIES_KEY);
    if (seen.size > 1) return true;
  }
  return false;
}
