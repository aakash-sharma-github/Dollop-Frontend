/**
 * localMusicService.ts
 *
 * IMPORTANT: This file intentionally keeps the scan fast and simple.
 * Earlier versions called Audio.Sound.createAsync per file which caused
 * the scan to hang on large libraries. DO NOT add any audio loading here.
 *
 * Heavy logging via `logger` (from @utils/logger) — view in Settings →
 * Developer → View Debug Logs, filter by "LocalMusic".
 */
import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '@constants/index';
import { logger } from '@utils/logger';
import type { Song } from '@app-types/index';

const TAG = 'LocalMusic';

// ── Permissions ───────────────────────────────────────────────────────────────
export async function requestMusicPermission(): Promise<boolean> {
  logger.debug(TAG, 'requestMusicPermission: requesting...');
  try {
    const result = await MediaLibrary.requestPermissionsAsync(false);
    logger.info(TAG, 'requestMusicPermission result', result);
    return result.status === 'granted';
  } catch (err) {
    logger.error(TAG, 'requestMusicPermission threw', err);
    return false;
  }
}

export async function getMusicPermissionStatus(): Promise<MediaLibrary.PermissionStatus> {
  try {
    const result = await MediaLibrary.getPermissionsAsync();
    logger.debug(TAG, 'getMusicPermissionStatus', result);
    return result.status;
  } catch (err) {
    logger.error(TAG, 'getMusicPermissionStatus threw', err);
    return 'undetermined' as MediaLibrary.PermissionStatus;
  }
}

// ── Toggle persistence ────────────────────────────────────────────────────────
export async function getLocalMusicEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(STORAGE_KEYS.LOCAL_MUSIC_ENABLED);
    logger.debug(TAG, 'getLocalMusicEnabled', { raw: val, enabled: val === 'true' });
    return val === 'true';
  } catch (err) {
    logger.error(TAG, 'getLocalMusicEnabled threw', err);
    return false;
  }
}

export async function setLocalMusicEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.LOCAL_MUSIC_ENABLED,
      enabled ? 'true' : 'false',
    );
    logger.info(TAG, 'setLocalMusicEnabled', { enabled });
  } catch (err) {
    logger.error(TAG, 'setLocalMusicEnabled threw', err);
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
  const noExt = filename.replace(/\.[^/.]+$/, '').trim();

  const dash = noExt.match(/^(.+?)\s+-\s+(.+)$/);
  if (dash?.[1] && dash?.[2]) {
    return { title: dash[2].trim(), artist: dash[1].trim() };
  }

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
    logger.debug(TAG, 'loadAlbumCache loaded', { albumCount: albums.length });
  } catch (err) {
    logger.warn(TAG, 'loadAlbumCache failed (non-fatal)', err);
  }
}

// ── Asset → Song ──────────────────────────────────────────────────────────────
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
    artworkUrl: null,
    previewUrl: asset.uri,
  };
}

// ── Diagnostics ────────────────────────────────────────────────────────────────
/**
 * Runs a full diagnostic check and logs every step. Call this from the
 * "Enable Local Music" button so the Debug Log screen shows exactly where
 * the scan succeeds or fails.
 */
export async function runDiagnostics(): Promise<void> {
  logger.info(TAG, '=== DIAGNOSTICS START ===');
  logger.info(TAG, 'Platform', { os: Platform.OS, version: Platform.Version });

  const permStatus = await getMusicPermissionStatus();
  logger.info(TAG, 'Permission status', permStatus);

  if (permStatus !== 'granted') {
    logger.warn(TAG, 'STOPPING: permission not granted. User must grant access.');
    logger.info(TAG, '=== DIAGNOSTICS END ===');
    return;
  }

  // Try a raw, unfiltered query for ANY media type to confirm MediaLibrary works at all
  try {
    const anyAssets = await MediaLibrary.getAssetsAsync({ first: 5 });
    logger.info(TAG, 'Raw getAssetsAsync (any type) sample', {
      totalCount: anyAssets.totalCount,
      returned: anyAssets.assets.length,
      sample: anyAssets.assets.slice(0, 3).map((a) => ({
        filename: a.filename, mediaType: a.mediaType, uri: a.uri,
      })),
    });
  } catch (err) {
    logger.error(TAG, 'Raw getAssetsAsync (any type) FAILED', err);
  }

  // Now try audio-specific query
  try {
    const audioAssets = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 20,
    });
    logger.info(TAG, 'Audio-only getAssetsAsync', {
      totalCount: audioAssets.totalCount,
      returned: audioAssets.assets.length,
      hasNextPage: audioAssets.hasNextPage,
    });

    if (audioAssets.assets.length === 0) {
      logger.warn(TAG, 'NO AUDIO ASSETS FOUND. Possible causes:', {
        possibleCauses: [
          '1. No audio files exist in MediaStore (files may be in app-private storage, not scanned by MediaStore)',
          '2. Files were added after last MediaStore scan — try restarting the device or using a file manager to "refresh" media',
          '3. On Android 13+, READ_MEDIA_AUDIO permission may be granted but MediaStore index is empty',
          '4. Files are in formats not indexed as "audio" by MediaStore (e.g. .opus on some OEM skins)',
        ],
      });
    } else {
      logger.info(TAG, 'Sample audio assets', {
        sample: audioAssets.assets.slice(0, 5).map((a) => ({
          filename: a.filename,
          duration: a.duration,
          albumId: a.albumId,
          uri: a.uri.slice(0, 60) + '...',
        })),
      });

      // Check filter
      const filteredCount = audioAssets.assets.filter((a) => isAudioFile(a.filename)).length;
      logger.info(TAG, 'Extension filter check', {
        beforeFilter: audioAssets.assets.length,
        afterFilter: filteredCount,
        rejectedFilenames: audioAssets.assets
          .filter((a) => !isAudioFile(a.filename))
          .map((a) => a.filename)
          .slice(0, 10),
      });
    }
  } catch (err) {
    logger.error(TAG, 'Audio-only getAssetsAsync FAILED', err);
  }

  logger.info(TAG, '=== DIAGNOSTICS END ===');
}

// ── Main scan ─────────────────────────────────────────────────────────────────
export async function getLocalTracks(): Promise<Song[]> {
  logger.info(TAG, 'getLocalTracks: scan starting');

  const permStatus = await getMusicPermissionStatus();
  if (permStatus !== 'granted') {
    logger.error(TAG, 'getLocalTracks: permission NOT granted', { permStatus });
    throw new Error(`Music library permission not granted (status: ${permStatus})`);
  }

  await loadAlbumCache();

  const songs: Song[] = [];
  let hasNextPage = true;
  let after: string | undefined;
  let pageNum = 0;
  let totalAssetsScanned = 0;
  let rejectedByExtension = 0;

  while (hasNextPage) {
    pageNum++;
    let page;
    try {
      page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 200,
        after,
        sortBy: [MediaLibrary.SortBy.title],
      });
    } catch (err) {
      logger.error(TAG, `getAssetsAsync threw on page ${pageNum}`, err);
      throw err;
    }

    totalAssetsScanned += page.assets.length;
    logger.debug(TAG, `page ${pageNum} fetched`, {
      assetsInPage: page.assets.length,
      hasNextPage: page.hasNextPage,
      totalCount: page.totalCount,
    });

    for (const asset of page.assets) {
      if (isAudioFile(asset.filename)) {
        songs.push(assetToSong(asset));
      } else {
        rejectedByExtension++;
        logger.debug(TAG, 'rejected (extension filter)', { filename: asset.filename });
      }
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;

    // Safety: stop after 20 pages (4000 assets) to avoid runaway loops
    if (pageNum >= 20) {
      logger.warn(TAG, 'getLocalTracks: stopping after 20 pages (4000 assets) safety limit');
      break;
    }
  }

  logger.info(TAG, 'getLocalTracks: scan complete', {
    pagesScanned: pageNum,
    totalAssetsScanned,
    rejectedByExtension,
    songsReturned: songs.length,
  });

  if (songs.length === 0) {
    logger.warn(TAG, 'getLocalTracks: returning EMPTY array', {
      hint: 'Run runDiagnostics() to investigate why MediaStore has no audio assets.',
    });
  }

  return songs.sort((a, b) => a.title.localeCompare(b.title));
}