import { apiClient } from './client';
import type { Playlist, Song } from '@app-types/index';

export interface PlaylistWithSongs extends Playlist {
    songs: Song[];
}

export const playlistApi = {
    getMyPlaylists: (): Promise<{ playlists: Playlist[] }> =>
        apiClient.get<{ playlists: Playlist[] }>('/playlists'),

    getPlaylist: (id: string): Promise<{ playlist: PlaylistWithSongs }> =>
        apiClient.get<{ playlist: PlaylistWithSongs }>(`/playlists/${id}`),

    createPlaylist: (data: { name: string; description?: string; is_public?: boolean }): Promise<{ playlist: Playlist }> =>
        apiClient.post<{ playlist: Playlist }>('/playlists', data),

    addSong: (playlistId: string, songId: string, position: number): Promise<void> =>
        apiClient.post(`/playlists/${playlistId}/songs`, { song_id: songId, position }),

    removeSong: (playlistId: string, songId: string): Promise<void> =>
        apiClient.delete(`/playlists/${playlistId}/songs/${songId}`),
};