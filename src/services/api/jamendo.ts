/**
 * Jamendo Music API — free, CC-licensed music with full streaming URLs.
 * Docs: https://developer.jamendo.com/v3.0
 *
 * SETUP:
 * 1. Register at https://developer.jamendo.com (free)
 * 2. Create an app to get your client_id
 * 3. Add to .env: EXPO_PUBLIC_JAMENDO_CLIENT_ID=your_client_id
 *
 * Without a registered client_id the app uses Jamendo's public test key
 * which has a very low rate limit — register to get a proper key.
 *
 * All Jamendo tracks are under Creative Commons licences.
 * Attribution required: "Music by [Artist] on Jamendo"
 */

import type { Song } from '@app-types/index';
import type { MusicApiProvider, SearchResult, Artist, Album } from './provider.interface';

const BASE = 'https://api.jamendo.com/v3.0';

// Jamendo's official public test client_id (low rate limit but functional)
const FALLBACK_CLIENT_ID = 'b6747d04';
const CLIENT_ID =
    process.env['EXPO_PUBLIC_JAMENDO_CLIENT_ID'] &&
        process.env['EXPO_PUBLIC_JAMENDO_CLIENT_ID'].length > 4
        ? process.env['EXPO_PUBLIC_JAMENDO_CLIENT_ID']
        : FALLBACK_CLIENT_ID;

// ── Types ─────────────────────────────────────────────────────────────────────
interface JamendoTrack {
    id: string;
    name: string;
    artist_name: string;
    album_name: string;
    duration: number;   // seconds
    audio: string;      // full MP3 stream URL (no auth needed)
    image: string;      // album artwork URL
    album_id: string;
    shareurl: string;
}

interface JamendoArtist {
    id: string;
    name: string;
    image: string;
}

interface JamendoAlbum {
    id: string;
    name: string;
    artist_name: string;
    image: string;
    releasedate: string;
    tracks_count: number;
}

interface JamendoResponse<T> {
    headers: { status: string; code: number; error_message: string; results_count: number };
    results: T[];
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
async function jFetch<T>(
    endpoint: string,
    params: Record<string, string | number>,
): Promise<T[]> {
    const url = new URL(`${BASE}/${endpoint}`);
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('format', 'json');
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
    }

    let res: Response;
    try {
        res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    } catch (err) {
        throw new Error(`Jamendo network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
        throw new Error(`Jamendo API ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as JamendoResponse<T>;

    if (data.headers.status !== 'success') {
        throw new Error(`Jamendo error: ${data.headers.error_message}`);
    }

    return data.results;
}

// ── Mappers ───────────────────────────────────────────────────────────────────
function trackToSong(t: JamendoTrack): Song {
    return {
        id: `jamendo:${t.id}`,
        title: t.name,
        artist: t.artist_name,
        album: t.album_name || null,
        durationMs: Math.round(t.duration * 1000),
        externalId: t.id,
        provider: 'jamendo',
        artworkUrl: t.image || null,
        previewUrl: t.audio,  // Direct MP3 — Jamendo provides full streams for free
    };
}

// ── Provider ──────────────────────────────────────────────────────────────────
class JamendoProvider implements MusicApiProvider {
    readonly name = 'jamendo';

    async search(query: string, limit = 20): Promise<SearchResult> {
        const [tracks, artists, albums] = await Promise.all([
            jFetch<JamendoTrack>('tracks', {
                namesearch: query, limit, audioformat: 'mp32',
            }),
            jFetch<JamendoArtist>('artists', { namesearch: query, limit: 5 }),
            jFetch<JamendoAlbum>('albums', { namesearch: query, limit: 5 }),
        ]);

        return {
            query,
            tracks: tracks.map(trackToSong),
            artists: artists.map((a) => ({
                id: `jamendo:${a.id}`, name: a.name, imageUrl: a.image || null, provider: 'jamendo',
            })),
            albums: albums.map((a) => ({
                id: `jamendo:${a.id}`, title: a.name, artist: a.artist_name,
                artworkUrl: a.image || null,
                trackCount: a.tracks_count,
                year: a.releasedate ? new Date(a.releasedate).getFullYear() : null,
                provider: 'jamendo',
            })),
        };
    }

    async getTrack(externalId: string): Promise<Song | null> {
        const tracks = await jFetch<JamendoTrack>('tracks', {
            id: externalId, audioformat: 'mp32',
        });
        return tracks[0] ? trackToSong(tracks[0]) : null;
    }

    async getArtistTopTracks(artistId: string, limit = 20): Promise<Song[]> {
        const tracks = await jFetch<JamendoTrack>('tracks', {
            artist_id: artistId, limit, order: 'popularity_total', audioformat: 'mp32',
        });
        return tracks.map(trackToSong);
    }

    async getAlbumTracks(albumId: string): Promise<Song[]> {
        const tracks = await jFetch<JamendoTrack>('tracks', {
            album_id: albumId, order: 'track_position', audioformat: 'mp32',
        });
        return tracks.map(trackToSong);
    }

    async getStreamUrl(externalId: string): Promise<string | null> {
        const track = await this.getTrack(externalId);
        return track?.previewUrl ?? null;
    }

    /** Trending tracks — used on Home screen Recommended section */
    async getFeatured(limit = 20, tags?: string): Promise<Song[]> {
        const params: Record<string, string | number> = {
            limit,
            order: 'popularity_week',
            audioformat: 'mp32',
        };
        if (tags) params['tags'] = tags;

        const tracks = await jFetch<JamendoTrack>('tracks', params);
        return tracks.map(trackToSong);
    }

    /** Tracks by genre tag */
    async getByGenre(genre: string, limit = 20): Promise<Song[]> {
        const tracks = await jFetch<JamendoTrack>('tracks', {
            tags: genre, limit, order: 'popularity_total', audioformat: 'mp32',
        });
        return tracks.map(trackToSong);
    }
}

export const jamendoProvider = new JamendoProvider();