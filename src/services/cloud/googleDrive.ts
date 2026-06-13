/**
 * Google Drive integration — stream audio files stored in the user's Drive.
 *
 * This is a SEPARATE OAuth connection from the Supabase Google sign-in.
 * Supabase's OAuth flow exchanges the Google token server-side and never
 * exposes it to the app, so we can't reuse it for Drive API calls. Instead
 * this requests its own Google access token with the `drive.readonly` scope,
 * stored independently in SecureStore.
 *
 * SETUP REQUIRED:
 * 1. In Google Cloud Console, enable the "Google Drive API" for your project
 * 2. Your existing OAuth Web Client ID (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) works —
 *    no new client needed, just request the extra scope below
 * 3. Add `https://auth.expo.io/@your-username/dollop` (or your dollop:// scheme
 *    redirect) to "Authorized redirect URIs" if not already present
 *
 * Files to stream must live in a folder named "Dollop Music" in the user's
 * Drive (any audio MIME type). Users create this folder and drop files in.
 */
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { logger } from '@utils/logger';
import type { Song } from '@app-types/index';

WebBrowser.maybeCompleteAuthSession();

const TAG = 'GoogleDrive';
const GOOGLE_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '';

const TOKEN_KEY = 'dollop_gdrive_access_token';
const REFRESH_KEY = 'dollop_gdrive_refresh_token';
const EXPIRY_KEY = 'dollop_gdrive_expires_at';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DRIVE_FOLDER_NAME = 'Dollop Music';

const AUDIO_MIME_TYPES = [
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/flac',
    'audio/ogg', 'audio/wav', 'audio/aac', 'audio/x-wav',
];

// ── Connection state ──────────────────────────────────────────────────────────
export async function isConnected(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return !!token;
}

export async function disconnect(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(EXPIRY_KEY);
    logger.info(TAG, 'disconnected');
}

// ── OAuth connect flow ────────────────────────────────────────────────────────
/**
 * Launches Google's OAuth consent screen requesting drive.readonly access.
 * Uses the Authorization Code + PKCE flow via expo-auth-session, then
 * exchanges the code for tokens directly with Google's token endpoint
 * (no backend involvement needed for this — Google's token endpoint
 * supports PKCE public clients).
 */
export async function connect(): Promise<boolean> {
    if (!GOOGLE_CLIENT_ID) {
        logger.error(TAG, 'connect: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set');
        throw new Error('Google Client ID not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env file.');
    }

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'dollop', path: 'gdrive/callback' });
    logger.debug(TAG, 'connect: redirectUri', { redirectUri });

    const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };

    const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: [DRIVE_SCOPE, 'openid', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: { access_type: 'offline', prompt: 'consent' }, // offline → get refresh_token
    });

    const result = await request.promptAsync(discovery);
    logger.info(TAG, 'connect: promptAsync result', { type: result.type });

    if (result.type === 'cancel' || result.type === 'dismiss') {
        return false;
    }
    if (result.type !== 'success' || !result.params['code']) {
        logger.error(TAG, 'connect: OAuth failed', result);
        throw new Error('Google Drive sign-in failed. Please try again.');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
            clientId: GOOGLE_CLIENT_ID,
            code: result.params['code'],
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        discovery,
    );

    logger.info(TAG, 'connect: token exchange success', {
        hasAccessToken: !!tokenResponse.accessToken,
        hasRefreshToken: !!tokenResponse.refreshToken,
        expiresIn: tokenResponse.expiresIn,
    });

    await SecureStore.setItemAsync(TOKEN_KEY, tokenResponse.accessToken);
    if (tokenResponse.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_KEY, tokenResponse.refreshToken);
    }
    const expiresAt = Date.now() + (tokenResponse.expiresIn ?? 3600) * 1000;
    await SecureStore.setItemAsync(EXPIRY_KEY, String(expiresAt));

    return true;
}

// ── Token refresh ──────────────────────────────────────────────────────────────
async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken || !GOOGLE_CLIENT_ID) return null;

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }).toString(),
        });

        if (!response.ok) {
            logger.error(TAG, 'refreshAccessToken: failed', { status: response.status });
            return null;
        }

        const data = (await response.json()) as { access_token: string; expires_in: number };
        await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
        await SecureStore.setItemAsync(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
        logger.info(TAG, 'refreshAccessToken: success');
        return data.access_token;
    } catch (err) {
        logger.error(TAG, 'refreshAccessToken: threw', err);
        return null;
    }
}

/** Returns a valid access token, refreshing it first if it's expired or about to expire. */
async function getValidAccessToken(): Promise<string | null> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;

    const expiryStr = await SecureStore.getItemAsync(EXPIRY_KEY);
    const expiresAt = expiryStr ? parseInt(expiryStr, 10) : 0;

    // Refresh if expiring within 60 seconds
    if (Date.now() > expiresAt - 60_000) {
        logger.debug(TAG, 'getValidAccessToken: token expired, refreshing');
        return refreshAccessToken();
    }
    return token;
}

// ── Drive API ────────────────────────────────────────────────────────────────
interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
}

async function findMusicFolder(accessToken: string): Promise<string | null> {
    const q = encodeURIComponent(
        `mimeType='application/vnd.google-apps.folder' and name='${DRIVE_FOLDER_NAME}' and trashed=false`,
    );
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        logger.error(TAG, 'findMusicFolder: request failed', { status: res.status });
        return null;
    }

    const data = (await res.json()) as { files: DriveFile[] };
    logger.info(TAG, 'findMusicFolder result', { found: data.files.length });
    return data.files[0]?.id ?? null;
}

/**
 * Lists audio files in the user's "Dollop Music" Drive folder.
 * Returns Songs with `previewUrl` set to an authenticated streaming URL.
 *
 * NOTE: Because the stream URL requires an Authorization header, the
 * audioPlayer must be extended to pass `headers` to Audio.Sound.createAsync:
 *
 *   await Audio.Sound.createAsync(
 *     { uri: song.previewUrl, headers: { Authorization: `Bearer ${token}` } },
 *     { shouldPlay: true }
 *   );
 *
 * Since tokens expire hourly, call `getStreamHeaders()` right before playback
 * rather than caching the header.
 */
export async function listMusicFiles(): Promise<Song[]> {
    const token = await getValidAccessToken();
    if (!token) {
        logger.warn(TAG, 'listMusicFiles: not connected');
        throw new Error('Google Drive is not connected. Connect it in Settings.');
    }

    const folderId = await findMusicFolder(token);
    if (!folderId) {
        logger.warn(TAG, 'listMusicFiles: "Dollop Music" folder not found');
        throw new Error(
            `No "${DRIVE_FOLDER_NAME}" folder found in your Google Drive. ` +
            `Create a folder named "${DRIVE_FOLDER_NAME}" and add audio files to it.`,
        );
    }

    const mimeQuery = AUDIO_MIME_TYPES.map((m) => `mimeType='${m}'`).join(' or ');
    const q = encodeURIComponent(`'${folderId}' in parents and (${mimeQuery}) and trashed=false`);
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=200`,
        { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
        logger.error(TAG, 'listMusicFiles: request failed', { status: res.status });
        throw new Error(`Google Drive API error: ${res.status}`);
    }

    const data = (await res.json()) as { files: DriveFile[] };
    logger.info(TAG, 'listMusicFiles: found files', { count: data.files.length });

    return data.files.map((file) => {
        const noExt = file.name.replace(/\.[^/.]+$/, '');
        const dashMatch = noExt.match(/^(.+?)\s+-\s+(.+)$/);
        const title = dashMatch?.[2]?.trim() ?? noExt;
        const artist = dashMatch?.[1]?.trim() ?? 'Unknown Artist';

        return {
            id: `gdrive:${file.id}`,
            title,
            artist,
            album: null,
            durationMs: 0, // Drive doesn't expose audio duration via metadata API
            externalId: file.id,
            provider: 'gdrive',
            artworkUrl: null,
            previewUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        };
    });
}

/** Returns the Authorization header needed to stream a Drive file. Call right before playback. */
export async function getStreamHeaders(): Promise<Record<string, string> | null> {
    const token = await getValidAccessToken();
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
}