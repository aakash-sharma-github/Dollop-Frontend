import { create } from 'zustand';
import { audioPlayer } from '@services/audio/audioPlayer';
import type { Song, PlayerState, RepeatMode } from '@app-types/index';

// ─── State is split into two slices ──────────────────────────────────────────
//
// WHY: expo-av fires a status callback every 500ms while playing. If positionMs
// lives in the same Zustand slice as currentSong/isPlaying, every single tick
// triggers a re-render of any component that subscribes to the store without a
// granular selector — this was the cause of the <2 FPS issue.
//
// FIX: positionMs and durationMs are isolated in a separate store
// (usePlayerProgressStore). Components that only show the song title/controls
// subscribe to usePlayerStore with stable selectors. Only the seek bar and
// the mini player's progress bar subscribe to usePlayerProgressStore, so only
// those two tiny views re-render every 500ms.
// ─────────────────────────────────────────────────────────────────────────────

// ── Progress store (updates every 500ms) ─────────────────────────────────────
interface ProgressState {
  positionMs: number;
  durationMs: number;
}

export const usePlayerProgressStore = create<ProgressState>(() => ({
  positionMs: 0,
  durationMs: 0,
}));

// ── Main player store (only updates on meaningful events) ─────────────────────
interface PlayerStore extends Omit<PlayerState, 'positionMs' | 'durationMs'> {
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
}

export const usePlayerStore = create<PlayerStore>((set, get) => {
  // Wire the audio player status callback into the stores.
  // Progress (positionMs/durationMs) goes to the isolated progress store.
  // Playback state (isPlaying/isLoading) updates the main store only when
  // the value actually changes (Object.is check via Zustand's default equality).
  audioPlayer.setStatusCallback((status) => {
    // Always update progress store — only seek bar and mini-player progress
    // bar subscribe to this, so only those re-render.
    usePlayerProgressStore.setState({
      positionMs: status.positionMs,
      durationMs: status.durationMs,
    });

    // Only update main store for state transitions, not every tick
    const { isPlaying, isLoading } = get();
    if (status.isPlaying !== isPlaying || status.isLoading !== isLoading) {
      set({ isPlaying: status.isPlaying, isLoading: status.isLoading });
    }

    // Handle track completion
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

    pause: async () => {
      await audioPlayer.pause();
    },

    resume: async () => {
      await audioPlayer.play();
    },

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
      const { positionMs } = usePlayerProgressStore.getState();
      if (positionMs > 3000) {
        await audioPlayer.seekTo(0);
        usePlayerProgressStore.setState({ positionMs: 0 });
        return;
      }
      const { queue, queueIndex } = get();
      const prevIndex = Math.max(0, queueIndex - 1);
      await get().playQueue(queue, prevIndex);
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