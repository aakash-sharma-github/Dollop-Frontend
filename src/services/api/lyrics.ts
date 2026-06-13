/**
 * LRCLIB lyrics integration — free, no API key required.
 * Docs: https://lrclib.net/docs
 *
 * Provides both plain and synced (LRC timestamp) lyrics for a huge catalog
 * of tracks. We request by track name + artist name; if no match is found,
 * the UI shows "Lyrics not available."
 */
import { logger } from '@utils/logger';

const TAG = 'Lyrics';
const BASE = 'https://lrclib.net/api';

export interface SyncedLyricLine {
    timeMs: number;
    text: string;
}

export interface LyricsResult {
    /** Plain, unsynced lyrics text (may be null even if synced lyrics exist) */
    plainLyrics: string | null;
    /** Parsed time-coded lines, or null if no synced lyrics are available */
    syncedLyrics: SyncedLyricLine[] | null;
    instrumental: boolean;
}

interface LrclibResponse {
    id: number;
    trackName: string;
    artistName: string;
    albumName: string | null;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null; // LRC format text
}

/**
 * Parses LRC-format synced lyrics ("[mm:ss.xx] line text") into a structured
 * array sorted by time.
 */
function parseSyncedLyrics(lrc: string): SyncedLyricLine[] {
    const lines: SyncedLyricLine[] = [];
    const lineRegex = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

    for (const rawLine of lrc.split('\n')) {
        const match = rawLine.match(lineRegex);
        if (!match) continue;

        const minutes = parseInt(match[1]!, 10);
        const seconds = parseInt(match[2]!, 10);
        const fraction = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
        const text = match[4]?.trim() ?? '';

        const timeMs = minutes * 60_000 + seconds * 1000 + fraction;
        lines.push({ timeMs, text });
    }

    return lines.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Fetches lyrics for a track. Tries the `/get` endpoint first (exact match
 * with duration), then falls back to `/search` (fuzzy match) if needed.
 * Returns null if no lyrics could be found at all — caller should show
 * "Lyrics not available."
 */
export async function getLyrics(params: {
    title: string;
    artist: string;
    album?: string | null;
    durationSec?: number;
}): Promise<LyricsResult | null> {
    const { title, artist, album, durationSec } = params;
    logger.debug(TAG, 'getLyrics: request', { title, artist, durationSec });

    // ── Try exact /get endpoint first (requires duration for best match) ──────
    if (durationSec && durationSec > 0) {
        try {
            const url = new URL(`${BASE}/get`);
            url.searchParams.set('track_name', title);
            url.searchParams.set('artist_name', artist);
            if (album) url.searchParams.set('album_name', album);
            url.searchParams.set('duration', String(Math.round(durationSec)));

            const res = await fetch(url.toString());
            if (res.ok) {
                const data = (await res.json()) as LrclibResponse;
                logger.info(TAG, 'getLyrics: /get hit', { hasPlain: !!data.plainLyrics, hasSynced: !!data.syncedLyrics });
                return {
                    plainLyrics: data.plainLyrics,
                    syncedLyrics: data.syncedLyrics ? parseSyncedLyrics(data.syncedLyrics) : null,
                    instrumental: data.instrumental,
                };
            }
            if (res.status !== 404) {
                logger.warn(TAG, 'getLyrics: /get unexpected status', { status: res.status });
            }
        } catch (err) {
            logger.error(TAG, 'getLyrics: /get threw', err);
        }
    }

    // ── Fallback: fuzzy /search ─────────────────────────────────────────────────
    try {
        const url = new URL(`${BASE}/search`);
        url.searchParams.set('track_name', title);
        url.searchParams.set('artist_name', artist);

        const res = await fetch(url.toString());
        if (!res.ok) {
            logger.warn(TAG, 'getLyrics: /search failed', { status: res.status });
            return null;
        }

        const results = (await res.json()) as LrclibResponse[];
        logger.info(TAG, 'getLyrics: /search results', { count: results.length });

        const best = results.find((r) => r.plainLyrics || r.syncedLyrics) ?? results[0];
        if (!best) return null;

        return {
            plainLyrics: best.plainLyrics,
            syncedLyrics: best.syncedLyrics ? parseSyncedLyrics(best.syncedLyrics) : null,
            instrumental: best.instrumental,
        };
    } catch (err) {
        logger.error(TAG, 'getLyrics: /search threw', err);
        return null;
    }
}

/**
 * Given synced lyrics and the current playback position, returns the index
 * of the currently active line (the last line whose timeMs <= positionMs).
 */
export function getActiveLyricIndex(lines: SyncedLyricLine[], positionMs: number): number {
    let active = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.timeMs <= positionMs) active = i;
        else break;
    }
    return active;
}