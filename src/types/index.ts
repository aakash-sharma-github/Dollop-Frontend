export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: 'google' | 'magic_link';
  createdAt: string;
  updatedAt: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  durationMs: number;
  externalId: string;
  provider: string;
  artworkUrl: string | null;
  previewUrl: string | null;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  artworkUrl: string | null;
  isPublic: boolean;
  songCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  volume: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
