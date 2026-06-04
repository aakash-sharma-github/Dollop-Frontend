import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { Song } from '@types/index';

/**
 * AudioPlayer wraps expo-av's Audio.Sound with a clean interface
 * the player Zustand store uses. One singleton lives for the app lifetime.
 */

export type PlaybackStatusCallback = (status: {
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  didFinish: boolean;
}) => void;

class AudioPlayer {
  private sound: Audio.Sound | null = null;
  private onStatusUpdate: PlaybackStatusCallback | null = null;

  async configure(): Promise<void> {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
  }

  setStatusCallback(cb: PlaybackStatusCallback): void {
    this.onStatusUpdate = cb;
  }

  private handleStatus = (status: AVPlaybackStatus): void => {
    if (!status.isLoaded) {
      if (status.error) console.warn('[AudioPlayer] error:', status.error);
      return;
    }
    this.onStatusUpdate?.({
      isPlaying: status.isPlaying,
      isLoading: status.isBuffering,
      positionMs: status.positionMillis,
      durationMs: status.durationMillis ?? 0,
      didFinish: status.didJustFinish,
    });
  };

  async loadAndPlay(song: Song): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }

    if (!song.previewUrl) {
      console.warn('[AudioPlayer] No previewUrl for:', song.title);
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: song.previewUrl },
      { shouldPlay: true, progressUpdateIntervalMillis: 500 },
      this.handleStatus,
    );
    this.sound = sound;
  }

  async play(): Promise<void> {
    await this.sound?.playAsync();
  }

  async pause(): Promise<void> {
    await this.sound?.pauseAsync();
  }

  async seekTo(positionMs: number): Promise<void> {
    await this.sound?.setPositionAsync(positionMs);
  }

  async setVolume(volume: number): Promise<void> {
    await this.sound?.setVolumeAsync(Math.max(0, Math.min(1, volume)));
  }

  async unload(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export const audioPlayer = new AudioPlayer();
