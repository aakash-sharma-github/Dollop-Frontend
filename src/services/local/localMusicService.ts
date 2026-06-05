import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@constants/index';
import type { Song } from '@app-types/index';

// ─── Permission handling ──────────────────────────────────────────────────────

export async function requestMusicPermission(): Promise<boolean> {
    const { status } = await MediaLibrary.requestPermissionsAsync(false);
    return status === 'granted';
}

export async function getMusicPermissionStatus(): Promise<MediaLibrary.PermissionStatus> {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status;
}

// ─── Toggle persistence ───────────────────────────────────────────────────────

export async function getLocalMusicEnabled(): Promise<boolean> {
    const val = await SecureStore.getItemAsync(STORAGE_KEYS.LOCAL_MUSIC_ENABLED);
    return val === 'true';
}

export async function setLocalMusicEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.LOCAL_MUSIC_ENABLED, enabled ? 'true' : 'false');
}

// ─── Media library scanning ───────────────────────────────────────────────────

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.aac', '.ogg', '.wav', '.aiff', '.opus'];

function isAudioFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function mediaAssetToSong(asset: MediaLibrary.Asset): Song {
    // Strip file extension from filename for the title
    const title = asset.filename.replace(/\.[^/.]+$/, '');
    return {
        id: `local:${asset.id}`,
        title,
        artist: 'Unknown Artist',
        album: asset.albumId ?? null,
        durationMs: Math.round(asset.duration * 1000),
        externalId: asset.id,
        provider: 'local',
        artworkUrl: null,
        previewUrl: asset.uri,
    };
}

/**
 * Scans the device's music library and returns all audio tracks as Song objects.
 * Automatically filters to audio media type. Paginates through the full library.
 */
export async function getLocalTracks(): Promise<Song[]> {
    const permissionStatus = await getMusicPermissionStatus();
    if (permissionStatus !== 'granted') {
        throw new Error('Music library permission not granted');
    }

    const songs: Song[] = [];
    let hasNextPage = true;
    let after: string | undefined;

    while (hasNextPage) {
        const page = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            first: 100,
            after,
            sortBy: MediaLibrary.SortBy.default,
        });

        for (const asset of page.assets) {
            // Extra guard — some devices return non-audio assets in audio queries
            if (isAudioFile(asset.filename)) {
                songs.push(mediaAssetToSong(asset));
            }
        }

        hasNextPage = page.hasNextPage;
        after = page.endCursor;
    }

    // Sort alphabetically by title
    return songs.sort((a, b) => a.title.localeCompare(b.title));
}