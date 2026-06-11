import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Song } from '@app-types/index';

const STORAGE_KEY = 'dollop_local_playlists';

export interface LocalPlaylist {
    id: string;
    name: string;
    createdAt: number;
    songs: Song[];
}

interface LocalPlaylistStore {
    playlists: LocalPlaylist[];
    isLoaded: boolean;
    load: () => Promise<void>;
    createPlaylist: (name: string) => Promise<LocalPlaylist>;
    deletePlaylist: (id: string) => Promise<void>;
    addSong: (playlistId: string, song: Song) => Promise<void>;
    removeSong: (playlistId: string, songId: string) => Promise<void>;
    reorderSongs: (playlistId: string, songs: Song[]) => Promise<void>;
    renamePlaylist: (id: string, name: string) => Promise<void>;
}

async function persist(playlists: LocalPlaylist[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export const useLocalPlaylistStore = create<LocalPlaylistStore>((set, get) => ({
    playlists: [],
    isLoaded: false,

    load: async () => {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            const playlists: LocalPlaylist[] = raw ? (JSON.parse(raw) as LocalPlaylist[]) : [];
            set({ playlists, isLoaded: true });
        } catch {
            set({ playlists: [], isLoaded: true });
        }
    },

    createPlaylist: async (name: string): Promise<LocalPlaylist> => {
        const playlist: LocalPlaylist = {
            id: `lp_${Date.now()}`,
            name: name.trim(),
            createdAt: Date.now(),
            songs: [],
        };
        const updated = [playlist, ...get().playlists];
        set({ playlists: updated });
        await persist(updated);
        return playlist;
    },

    deletePlaylist: async (id: string) => {
        const updated = get().playlists.filter((p) => p.id !== id);
        set({ playlists: updated });
        await persist(updated);
    },

    addSong: async (playlistId: string, song: Song) => {
        const updated = get().playlists.map((p) => {
            if (p.id !== playlistId) return p;
            if (p.songs.some((s) => s.id === song.id)) return p; // already in playlist
            return { ...p, songs: [...p.songs, song] };
        });
        set({ playlists: updated });
        await persist(updated);
    },

    removeSong: async (playlistId: string, songId: string) => {
        const updated = get().playlists.map((p) => {
            if (p.id !== playlistId) return p;
            return { ...p, songs: p.songs.filter((s) => s.id !== songId) };
        });
        set({ playlists: updated });
        await persist(updated);
    },

    reorderSongs: async (playlistId: string, songs: Song[]) => {
        const updated = get().playlists.map((p) =>
            p.id === playlistId ? { ...p, songs } : p,
        );
        set({ playlists: updated });
        await persist(updated);
    },

    renamePlaylist: async (id: string, name: string) => {
        const updated = get().playlists.map((p) =>
            p.id === id ? { ...p, name: name.trim() } : p,
        );
        set({ playlists: updated });
        await persist(updated);
    },
}));