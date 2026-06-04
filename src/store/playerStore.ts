import { create } from 'zustand';
import { audioPlayer } from '@services/audio/audioPlayer';
import type { Song, PlayerState, RepeatMode } from '@types/index';

interface PlayerStore extends PlayerState {
  isVisible: boolean;
  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  playQueue: (songs: Song[], startIndex?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  // Called by audioPlayer status callback
  _syncStatus: (status: { isPlaying: boolean; isLoading: boolean; positionMs: number; durationMs: number; didFinish: boolean }) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => {
  // Wire the audio player status callback into the store
  audioPlayer.setStatusCallback((status) => {
    get()._syncStatus(status);
  });

  return {
    currentSong: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    isLoading: false,
    positionMs: 0,
    durationMs: 0,
    repeatMode: 'off',
    isShuffle: false,
    volume: 1,
    isVisible: false,

    _syncStatus: (status) => {
      set({
        isPlaying: status.isPlaying,
        isLoading: status.isLoading,
        positionMs: status.positionMs,
        durationMs: status.durationMs,
      });

      // Auto-advance queue when track finishes
      if (status.didFinish) {
        const { queue, queueIndex, repeatMode, isShuffle } = get();
        if (repeatMode === 'one') {
          void get().seekTo(0).then(() => get().resume());
          return;
        }
        const nextIndex = isShuffle
          ? Math.floor(Math.random() * queue.length)
          : queueIndex + 1;
        if (nextIndex < queue.length) {
          void get().playQueue(queue, nextIndex);
        } else if (repeatMode === 'all') {
          void get().playQueue(queue, 0);
        } else {
          set({ isPlaying: false });
        }
      }
    },

    playSong: async (song, queue) => {
      const songs = queue ?? [song];
      const index = songs.findIndex((s) => s.id === song.id);
      await get().playQueue(songs, index >= 0 ? index : 0);
    },

    playQueue: async (songs, startIndex = 0) => {
      set({ isLoading: true, isVisible: true });
      const song = songs[startIndex];
      if (!song) { set({ isLoading: false }); return; }
      set({ queue: songs, queueIndex: startIndex, currentSong: song, positionMs: 0 });
      await audioPlayer.loadAndPlay(song);
    },

    pause: async () => { await audioPlayer.pause(); },

    resume: async () => { await audioPlayer.play(); },

    togglePlayPause: async () => {
      if (get().isPlaying) await get().pause();
      else await get().resume();
    },

    skipToNext: async () => {
      const { queue, queueIndex, isShuffle } = get();
      const nextIndex = isShuffle
        ? Math.floor(Math.random() * queue.length)
        : Math.min(queueIndex + 1, queue.length - 1);
      await get().playQueue(queue, nextIndex);
    },

    skipToPrevious: async () => {
      const { positionMs, queue, queueIndex } = get();
      if (positionMs > 3000) {
        await audioPlayer.seekTo(0);
        return;
      }
      const prevIndex = Math.max(0, queueIndex - 1);
      await get().playQueue(queue, prevIndex);
    },

    seekTo: async (positionMs) => {
      await audioPlayer.seekTo(positionMs);
      set({ positionMs });
    },

    setVolume: async (volume) => {
      await audioPlayer.setVolume(volume);
      set({ volume: Math.max(0, Math.min(1, volume)) });
    },

    toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),

    cycleRepeatMode: () => {
      const order: RepeatMode[] = ['off', 'all', 'one'];
      const next = order[(order.indexOf(get().repeatMode) + 1) % order.length] ?? 'off';
      set({ repeatMode: next });
    },
  };
});

/**
 * Call once at app startup to configure the audio session.
 * Lives in App.tsx useEffect — safe in Expo (no native registration needed).
 */
export async function setupAudioPlayer(): Promise<void> {
  await audioPlayer.configure();
}
