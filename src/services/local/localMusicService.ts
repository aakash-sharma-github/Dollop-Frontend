/**
 * localMusicService.ts
 *
 * IMPORTANT: This file intentionally keeps the scan fast and simple.
 * Previous versions called Audio.Sound.createAsync per file which caused
 * the scan to hang on large libraries. DO NOT add any audio loading here.
 */
import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@constants/index';
import type { Song } from '@app-types/index';

// ── Permissions ───────────────────────────────────────────────────────────────
export async function requestMusicPermission(): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(false);
    console.log('[LocalMusic] permission status after request:', status);
    return status === 'granted';
  } catch (err) {
    console.warn('[LocalMusic] requestMusicPermission error:', err);
    return false;
  }
}

export async function getMusicPermissionStatus(): Promise<MediaLibrary.PermissionStatus> {
  try {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status;
  } catch {
    return 'undetermined' as MediaLibrary.PermissionStatus;
  }
}

// ── Toggle persistence ────────────────────────────────────────────────────────
export async function getLocalMusicEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(STORAGE_KEYS.LOCAL_MUSIC_ENABLED);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setLocalMusicEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.LOCAL_MUSIC_ENABLED,
      enabled ? 'true' : 'false',
    );
    console.log('[LocalMusic] setLocalMusicEnabled:', enabled);
  } catch (err) {
    console.warn('[LocalMusic] setLocalMusicEnabled error:', err);
  }
}

// ── Audio extension filter ────────────────────────────────────────────────────
const AUDIO_EXTENSIONS = [
  '.mp3', '.m4a', '.flac', '.aac', '.ogg', '.wav', '.aiff', '.opus', '.wma',
];

function isAudioFile(filename: string): boolean {
  return AUDIO_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));
}

// ── Filename → metadata ───────────────────────────────────────────────────────
function parseFilename(filename: string): { title: string; artist: string | null } {
  // Strip extension
  const noExt = filename.replace(/\.[^/.]+$/, '').trim();

  // "Artist - Title"
  const dash = noExt.match(/^(.+?)\s+-\s+(.+)$/);
  if (dash?.[1] && dash?.[2]) {
    return { title: dash[2].trim(), artist: dash[1].trim() };
  }

  // "01. Title" or "01 Title"
  const track = noExt.match(/^\d{1,3}[\s.\-)]+(.+)$/);
  if (track?.[1]) {
    return { title: track[1].trim(), artist: null };
  }

  return { title: noExt, artist: null };
}

// ── Album cache ───────────────────────────────────────────────────────────────
const albumCache = new Map<string, string>();

async function loadAlbumCache(): Promise<void> {
  try {
    const albums = await MediaLibrary.getAlbumsAsync();
    for (const a of albums) albumCache.set(a.id, a.title);
    console.log('[LocalMusic] album cache loaded:', albumCache.size, 'albums');
  } catch (err) {
    console.warn('[LocalMusic] loadAlbumCache error:', err);
  }
}

// ── Asset → Song (no async, no audio loading) ─────────────────────────────────
function assetToSong(asset: MediaLibrary.Asset): Song {
  const { title, artist } = parseFilename(asset.filename);
  const album = asset.albumId ? (albumCache.get(asset.albumId) ?? null) : null;

  return {
    id: `local:${asset.id}`,
    title,
    artist: artist ?? 'Unknown Artist',
    album,
    durationMs: Math.round(asset.duration * 1000),
    externalId: asset.id,
    provider: 'local',
    artworkUrl: null,         // Never attempt artwork during scan — causes hangs
    previewUrl: asset.uri,    // Direct file URI — expo-av can play this directly
  };
}

// ── Main scan ─────────────────────────────────────────────────────────────────
export async function getLocalTracks(): Promise<Song[]> {
  console.log('[LocalMusic] getLocalTracks: starting scan');

  const permStatus = await getMusicPermissionStatus();
  console.log('[LocalMusic] permission:', permStatus);

  if (permStatus !== 'granted') {
    throw new Error(`Music library permission not granted (status: ${permStatus})`);
  }

  // Load album names once before scanning
  await loadAlbumCache();

  const songs: Song[] = [];
  let hasNextPage = true;
  let after: string | undefined;
  let pageNum = 0;

  while (hasNextPage) {
    pageNum++;
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 200,
      after,
      sortBy: [MediaLibrary.SortBy.title],
    });

    console.log(`[LocalMusic] page ${pageNum}: ${page.assets.length} assets, hasNextPage: ${page.hasNextPage}`);

    for (const asset of page.assets) {
      if (isAudioFile(asset.filename)) {
        songs.push(assetToSong(asset));
      }
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;
  }

  console.log('[LocalMusic] scan complete:', songs.length, 'songs found');
  return songs.sort((a, b) => a.title.localeCompare(b.title));
}