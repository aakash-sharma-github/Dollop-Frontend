/**
 * Spotify import — paste a Spotify share link (track or playlist) and Dollop
 * fetches the track/playlist metadata via Spotify's Web API, then attempts to
 * find a playable match on Jamendo.
 *
 * IMPORTANT LIMITATION (read before wiring up UI):
 * Spotify's Web API does NOT provide full-length audio streams to third-party
 * apps — only `preview_url` (30-second clips), and as of late 2024 Spotify
 * has been removing `preview_url` from API responses entirely for many
 * tracks/regions. This means:
 *
 *   - We CAN get accurate title/artist/album/artwork from Spotify links
 *   - We CANNOT reliably play the actual Spotify track audio
 *   - Instead, for each imported track we search Jamendo for a track with a
 *     matching title+artist and use THAT for playback (best-effort — Jamendo
 *     is independent/CC-licensed music, so exact matches are uncommon)
 *
 * This is communicated to the user in the import UI: "Imported as metadata —
 * matching tracks found on Jamendo will be playable; others will show as
 * unavailable."
 *
 * AUTH: Spotify's Client Credentials flow needs a `client_secret`, which
 * must NOT be embedded in the mobile app. This calls YOUR Dollop backend,
 * which holds the secret and proxies the request. See
 * dollop-backend/src/routes/spotify.routes.ts (to be added).
 */
import { logger } from '@utils/logger';
import { jamendoProvider } from '@services/api/jamendo';
import { apiClient } from '@services/api/client';
import type { Song } from '@app-types/index';

const TAG = 'SpotifyImport';

// ── Link parsing ──────────────────────────────────────────────────────────────
export type SpotifyLinkType = 'track' | 'playlist' | 'album' | 'unknown';

export interface ParsedSpotifyLink {
    type: SpotifyLinkType;
    id: string;
}

/**
 * Parses a Spotify share link or URI into a type + ID.
 * Handles:
 *   https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=...
 *   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *   spotify:track:4cOdK2wGLETKBW3PvgPWqT
 */
export function parseSpotifyLink(input: string): ParsedSpotifyLink | null {
    const trimmed = input.trim();

    // URI form: spotify:track:ID
    const uriMatch = trimmed.match(/^spotify:(track|playlist|album):([a-zA-Z0-9]+)$/);
    if (uriMatch?.[1] && uriMatch?.[2]) {
        return { type: uriMatch[1] as SpotifyLinkType, id: uriMatch[2] };
    }

    // URL form: https://open.spotify.com/track/ID?si=...
    try {
        const url = new URL(trimmed);
        if (!url.hostname.includes('spotify.com')) return null;

        const parts = url.pathname.split('/').filter(Boolean);
        // parts could be ['track', 'ID'] or ['intl-en', 'track', 'ID']
        const typeIndex = parts.findIndex((p) => ['track', 'playlist', 'album'].includes(p));
        if (typeIndex === -1 || !parts[typeIndex + 1]) return null;

        return {
            type: parts[typeIndex] as SpotifyLinkType,
            id: parts[typeIndex + 1]!,
        };
    } catch {
        return null;
    }
}

// ── Spotify metadata via Dollop backend proxy ─────────────────────────────────
interface SpotifyTrackMeta {
    id: string;
    title: string;
    artist: string;
    album: string | null;
    artworkUrl: string | null;
    durationMs: number;
}

interface SpotifyPlaylistMeta {
    id: string;
    name: string;
    description: string | null;
    tracks: SpotifyTrackMeta[];
}

/**
 * Fetches track metadata via the Dollop backend proxy.
 * Backend endpoint: GET /api/v1/spotify/track/:id
 * (To be implemented — see dollop-backend section in CLOUD_STORAGE.md / PROGRESS.md)
 */
async function fetchSpotifyTrack(id: string): Promise<SpotifyTrackMeta> {
    logger.debug(TAG, 'fetchSpotifyTrack', { id });
    return apiClient.get<SpotifyTrackMeta>(`/spotify/track/${id}`);
}

async function fetchSpotifyPlaylist(id: string): Promise<SpotifyPlaylistMeta> {
    logger.debug(TAG, 'fetchSpotifyPlaylist', { id });
    return apiClient.get<SpotifyPlaylistMeta>(`/spotify/playlist/${id}`);
}

// ── Jamendo matching ───────────────────────────────────────────────────────────
export interface ImportedTrack {
    spotifyMeta: SpotifyTrackMeta;
    /** A playable Jamendo match, or null if none was found */
    jamendoMatch: Song | null;
}

function normalise(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Searches Jamendo for a track matching the given title + artist.
 * Returns the best match if title and artist both appear similar enough,
 * otherwise null (track will be shown as "metadata only, not playable").
 */
async function findJamendoMatch(title: string, artist: string): Promise<Song | null> {
    try {
        const result = await jamendoProvider.search(`${title} ${artist}`, 10);
        const targetTitle = normalise(title);
        const targetArtist = normalise(artist);

        const match = result.tracks.find((t) => {
            const tTitle = normalise(t.title);
            const tArtist = normalise(t.artist);
            return (
                (tTitle.includes(targetTitle) || targetTitle.includes(tTitle)) &&
                (tArtist.includes(targetArtist) || targetArtist.includes(tArtist))
            );
        });

        if (match) {
            logger.info(TAG, 'findJamendoMatch: found', { title, artist, matchTitle: match.title });
        } else {
            logger.debug(TAG, 'findJamendoMatch: no match', { title, artist });
        }
        return match ?? null;
    } catch (err) {
        logger.error(TAG, 'findJamendoMatch threw', err);
        return null;
    }
}

// ── Public import functions ───────────────────────────────────────────────────

/**
 * Imports a single Spotify track link. Returns metadata plus an optional
 * Jamendo playback match.
 */
export async function importSpotifyTrack(link: string): Promise<ImportedTrack> {
    const parsed = parseSpotifyLink(link);
    if (!parsed || parsed.type !== 'track') {
        throw new Error('That doesn\'t look like a Spotify track link. Use the "Share → Copy Link" option from Spotify on a song.');
    }

    const meta = await fetchSpotifyTrack(parsed.id);
    const jamendoMatch = await findJamendoMatch(meta.title, meta.artist);

    return { spotifyMeta: meta, jamendoMatch };
}

/**
 * Imports a Spotify playlist link. Returns the playlist name plus each track
 * with its Jamendo match (if any). Tracks without a match are still returned
 * so the UI can show them as "unavailable".
 */
export async function importSpotifyPlaylist(
    link: string,
    onProgress?: (done: number, total: number) => void,
): Promise<{ name: string; description: string | null; tracks: ImportedTrack[] }> {
    const parsed = parseSpotifyLink(link);
    if (!parsed || parsed.type !== 'playlist') {
        throw new Error('That doesn\'t look like a Spotify playlist link. Use the "Share → Copy Link to Playlist" option from Spotify.');
    }

    const meta = await fetchSpotifyPlaylist(parsed.id);
    logger.info(TAG, 'importSpotifyPlaylist: fetched', { name: meta.name, trackCount: meta.tracks.length });

    const results: ImportedTrack[] = [];
    for (let i = 0; i < meta.tracks.length; i++) {
        const track = meta.tracks[i]!;
        const jamendoMatch = await findJamendoMatch(track.title, track.artist);
        results.push({ spotifyMeta: track, jamendoMatch });
        onProgress?.(i + 1, meta.tracks.length);
    }

    const matchedCount = results.filter((r) => r.jamendoMatch !== null).length;
    logger.info(TAG, 'importSpotifyPlaylist: complete', {
        total: results.length,
        matched: matchedCount,
        unmatched: results.length - matchedCount,
    });

    return { name: meta.name, description: meta.description, tracks: results };
}