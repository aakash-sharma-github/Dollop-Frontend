import type { Song } from '@app-types/index';

export interface MusicApiProvider {
  readonly name: string;
  search(query: string, limit?: number): Promise<SearchResult>;
  getTrack(externalId: string): Promise<Song | null>;
  getArtistTopTracks(artistId: string, limit?: number): Promise<Song[]>;
  getAlbumTracks(albumId: string): Promise<Song[]>;
  getStreamUrl(externalId: string): Promise<string | null>;
}

export interface SearchResult { tracks: Song[]; artists: Artist[]; albums: Album[]; query: string; }
export interface Artist { id: string; name: string; imageUrl: string | null; provider: string; }
export interface Album { id: string; title: string; artist: string; artworkUrl: string | null; trackCount: number; year: number | null; provider: string; }
