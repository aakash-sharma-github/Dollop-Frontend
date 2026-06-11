import { create } from 'zustand';
import { audioPlayer } from '@services/audio/audioPlayer';
import type { Song, PlayerState, RepeatMode } from '@app-types/index';

// ── Progress store — updates every 500ms, isolated to prevent FPS drops ────────
interface ProgressState {
  positionMs: number;
  durationMs: number;
}

export const usePlayerProgressStore = create<ProgressState>(() => ({
  positionMs: 0,
  durationMs: 0,
}));

// ── Main player store ──────────────────────────────────────────────────────────
interface PlayerStore extends Omit<PlayerState, 'positionMs' | 'durationMs'> {
  isVisible: boolean;

  // Queue management
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => Promise<void>;

  // Playback
  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  playQueue: (songs: Song[], startIndex?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  skipToIndex: (index: number) => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => {
  audioPlayer.setStatusCallback((status) => {
    // Progress → isolated store only
    usePlayerProgressStore.setState({
      positionMs: status.positionMs,
      durationMs: status.durationMs,
    });

    // Playback state → only update on actual change
    const { isPlaying, isLoading } = get();
    if (status.isPlaying !== isPlaying || status.isLoading !== isLoading) {
      set({ isPlaying: status.isPlaying, isLoading: status.isLoading });
    }

    // Auto-advance
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
  });

  return {
    currentSong: null,
    queue: [],
    queueIndex: 0,
    isPlaying: false,
    isLoading: false,
    repeatMode: 'off',
    isShuffle: false,
    volume: 1,
    isVisible: false,

    // ── Queue management ────────────────────────────────────────────────────
    addToQueue: (song: Song) => {
      const { queue } = get();
      if (!queue.some((s) => s.id === song.id)) {
        set({ queue: [...queue, song], isVisible: true });
      }
    },

    removeFromQueue: (index: number) => {
      const { queue, queueIndex } = get();
      if (index < 0 || index >= queue.length) return;
      const newQueue = queue.filter((_, i) => i !== index);
      const newIndex = index < queueIndex ? queueIndex - 1 : queueIndex;
      set({ queue: newQueue, queueIndex: Math.min(newIndex, newQueue.length - 1) });
    },

    reorderQueue: (fromIndex: number, toIndex: number) => {
      const { queue, queueIndex } = get();
      const newQueue = [...queue];
      const [moved] = newQueue.splice(fromIndex, 1);
      if (moved) newQueue.splice(toIndex, 0, moved);

      // Update queueIndex to keep current song correct
      let newQueueIndex = queueIndex;
      if (queueIndex === fromIndex) {
        newQueueIndex = toIndex;
      } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
        newQueueIndex = queueIndex - 1;
      } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
        newQueueIndex = queueIndex + 1;
      }
      set({ queue: newQueue, queueIndex: newQueueIndex });
    },

    clearQueue: async () => {
      await audioPlayer.unload();
      set({ queue: [], queueIndex: 0, currentSong: null, isPlaying: false, isVisible: false });
      usePlayerProgressStore.setState({ positionMs: 0, durationMs: 0 });
    },

    // ── Playback ────────────────────────────────────────────────────────────
    playSong: async (song, queue) => {
      const songs = queue ?? [song];
      const index = songs.findIndex((s) => s.id === song.id);
      await get().playQueue(songs, index >= 0 ? index : 0);
    },

    playQueue: async (songs, startIndex = 0) => {
      set({ isLoading: true, isVisible: true });
      const song = songs[startIndex];
      if (!song) { set({ isLoading: false }); return; }
      set({ queue: songs, queueIndex: startIndex, currentSong: song });
      usePlayerProgressStore.setState({ positionMs: 0, durationMs: song.durationMs });
      await audioPlayer.loadAndPlay(song);
    },

    pause: async () => { await audioPlayer.pause(); },
    resume: async () => { await audioPlayer.play(); },
    togglePlayPause: async () => {
      if (get().isPlaying) await get().pause(); else await get().resume();
    },

    skipToNext: async () => {
      const { queue, queueIndex, isShuffle } = get();
      const nextIndex = isShuffle
        ? Math.floor(Math.random() * queue.length)
        : Math.min(queueIndex + 1, queue.length - 1);
      await get().playQueue(queue, nextIndex);
    },

    skipToPrevious: async () => {
      const { positionMs } = usePlayerProgressStore.getState();
      if (positionMs > 3000) { await audioPlayer.seekTo(0); return; }
      const { queue, queueIndex } = get();
      await get().playQueue(queue, Math.max(0, queueIndex - 1));
    },

    skipToIndex: async (index: number) => {
      const { queue } = get();
      if (index >= 0 && index < queue.length) {
        await get().playQueue(queue, index);
      }
    },

    seekTo: async (positionMs) => {
      await audioPlayer.seekTo(positionMs);
      usePlayerProgressStore.setState({ positionMs });
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

export async function setupAudioPlayer(): Promise<void> {
  await audioPlayer.configure();
}