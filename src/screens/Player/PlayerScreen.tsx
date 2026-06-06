import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Path, Rect } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@theme/index";
import { Spacing, Layout, BorderRadius } from "@theme/spacing";
import { usePlayerStore, usePlayerProgressStore } from "@store/playerStore";
import type { PlayerScreenProps } from "@app-types/navigation";

const { width: W } = Dimensions.get("window");
const ARTWORK_SIZE = W - (Layout.screenPaddingH + Spacing[4]) * 2;
const BAR_W = W - Layout.screenPaddingH * 2;
const TRACK_H = 4;
const THUMB_SIZE = 14;
// FIX: centre thumb on track. Thumb top = -(THUMB_SIZE/2) + (TRACK_H/2)
// The wrap has no paddingTop on the track itself, so this is purely geometric.
const THUMB_TOP = -(THUMB_SIZE / 2) + TRACK_H / 2; // = -5

const PlayIcon = ({ color }: { color: string }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 4.75L19.5 12L6 19.25V4.75Z" />
  </Svg>
);
const PauseIcon = ({ color }: { color: string }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={color}>
    <Rect x="5" y="4" width="4" height="16" rx="1" />
    <Rect x="15" y="4" width="4" height="16" rx="1" />
  </Svg>
);
const NextIcon = ({ color }: { color: string }) => (
  <Svg width={36} height={36} viewBox="0 0 24 24" fill={color}>
    <Path d="M5 4.75L16 12L5 19.25V4.75Z" />
    <Rect x="17" y="4" width="2.5" height="16" rx="1" />
  </Svg>
);
const PrevIcon = ({ color }: { color: string }) => (
  <Svg width={36} height={36} viewBox="0 0 24 24" fill={color}>
    <Path d="M19 19.25L8 12L19 4.75V19.25Z" />
    <Rect x="4.5" y="4" width="2.5" height="16" rx="1" />
  </Svg>
);
const ShuffleIcon = ({ color, active }: { color: string; active: boolean }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={active ? 2.25 : 1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M16 3h5v5M4 20L21 3M16 21h5v-5M4 4l8 8" />
  </Svg>
);
const RepeatIcon = ({ color, active }: { color: string; active: boolean }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={active ? 2.25 : 1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
  </Svg>
);
const ChevronDown = ({ color }: { color: string }) => (
  <Svg
    width={28}
    height={28}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
  >
    <Path d="M6 9l6 6 6-6" />
  </Svg>
);

// ── Seek bar — isolated so only it re-renders on position ticks ───────────────
function SeekBar({
  onSeek,
}: {
  onSeek: (ms: number) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const positionMs = usePlayerProgressStore((s) => s.positionMs);
  const durationMs = usePlayerProgressStore((s) => s.durationMs);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const thumbX = useSharedValue(progress * BAR_W);
  const dragging = useSharedValue(false);

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragging.value = true;
    })
    .onUpdate((e) => {
      thumbX.value = Math.max(0, Math.min(BAR_W, e.x));
    })
    .onEnd(() => {
      const ms = (thumbX.value / BAR_W) * durationMs;
      dragging.value = false;
      runOnJS(onSeek)(ms);
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: dragging.value ? thumbX.value : progress * BAR_W,
  }));

  // Thumb x = left edge of track + fill width - half thumb size, clamped to bar
  const thumbStyle = useAnimatedStyle(() => {
    const fillW = dragging.value ? thumbX.value : progress * BAR_W;
    const clampedX = Math.max(
      0,
      Math.min(BAR_W - THUMB_SIZE, fillW - THUMB_SIZE / 2),
    );
    return {
      transform: [
        { translateX: clampedX },
        { scale: withSpring(dragging.value ? 1.3 : 1, { damping: 15 }) },
      ],
    };
  });

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <GestureDetector gesture={pan}>
      {/* Extra vertical padding for easier touch target without shifting the track */}
      <View style={seekStyles.touchArea}>
        <View style={seekStyles.trackWrap}>
          {/* Track background */}
          <View style={[seekStyles.track, { backgroundColor: colors.border }]}>
            {/* Fill */}
            <Animated.View
              style={[
                seekStyles.fill,
                { backgroundColor: colors.brand },
                fillStyle,
              ]}
            />
          </View>
          {/* Thumb — absolutely positioned, centred on track using THUMB_TOP */}
          <Animated.View
            style={[
              seekStyles.thumb,
              { backgroundColor: colors.brand, top: THUMB_TOP },
              thumbStyle,
            ]}
          />
        </View>
        <View style={seekStyles.labels}>
          <Text style={[seekStyles.time, { color: colors.textSecondary }]}>
            {fmt(positionMs)}
          </Text>
          <Text style={[seekStyles.time, { color: colors.textSecondary }]}>
            {fmt(durationMs)}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const seekStyles = StyleSheet.create({
  // Extra vertical padding for hit area without affecting visual alignment
  touchArea: { width: "100%", paddingVertical: Spacing[3] },
  // The track wrap is the reference for absolute-positioned thumb
  trackWrap: { position: "relative", height: TRACK_H },
  track: {
    height: TRACK_H,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: BorderRadius.full },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    // top is set inline using THUMB_TOP constant
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing[2],
  },
  time: { fontSize: 12, fontWeight: "500" },
});

// ── Animated artwork ──────────────────────────────────────────────────────────
function PlayerArtwork({
  title,
  bg,
  isPlaying,
}: {
  title: string;
  bg: string;
  isPlaying: boolean;
}) {
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isPlaying ? 1 : 0.875, { damping: 14 }) }],
  }));
  return (
    <Animated.View
      style={[
        styles.artwork,
        { backgroundColor: bg, width: ARTWORK_SIZE, height: ARTWORK_SIZE },
        artStyle,
      ]}
    >
      <Text style={[styles.artworkLetter, { fontSize: ARTWORK_SIZE * 0.32 }]}>
        {title.charAt(0).toUpperCase()}
      </Text>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function PlayerScreen(_props: PlayerScreenProps): React.JSX.Element {
  const { colors, typography, isDark } = useTheme();
  const navigation = useNavigation();

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isShuffle = usePlayerStore((s) => s.isShuffle);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const skipToNext = usePlayerStore((s) => s.skipToNext);
  const skipToPrevious = usePlayerStore((s) => s.skipToPrevious);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  const handleSeek = useCallback(
    (ms: number) => {
      void seekTo(ms);
    },
    [seekTo],
  );
  const hue = currentSong ? (currentSong.id.charCodeAt(0) * 47) % 360 : 30;
  const artBg = `hsl(${hue}, 35%, 25%)`;

  return (
    <LinearGradient
      colors={[colors.playerGradientTop, colors.playerGradientBottom]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronDown color={colors.textSecondary} />
            </TouchableOpacity>
            <Text
              style={[
                typography.labelMd,
                {
                  color: colors.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                },
              ]}
            >
              Now Playing
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.artworkWrap}>
            <PlayerArtwork
              title={currentSong?.title ?? "♪"}
              bg={artBg}
              isPlaying={isPlaying}
            />
          </View>

          <View style={styles.songInfo}>
            <Text
              style={[typography.h1, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {currentSong?.title ?? "No track selected"}
            </Text>
            <Text
              style={[typography.bodyLg, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {currentSong?.artist ?? "—"}
            </Text>
            {currentSong?.provider === "local" && (
              <Text
                style={[
                  typography.labelSm,
                  { color: colors.brand, marginTop: 2 },
                ]}
              >
                📱 On this device
              </Text>
            )}
          </View>

          <View style={styles.seekWrap}>
            <SeekBar onSeek={handleSeek} />
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={toggleShuffle}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ShuffleIcon
                color={isShuffle ? colors.brand : colors.textTertiary}
                active={isShuffle}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void skipToPrevious()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <PrevIcon color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: colors.brand }]}
              onPress={() => void togglePlayPause()}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={styles.loadingDot} />
              ) : isPlaying ? (
                <PauseIcon color={colors.textOnBrand} />
              ) : (
                <PlayIcon color={colors.textOnBrand} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void skipToNext()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <NextIcon color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cycleRepeatMode}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <RepeatIcon
                color={
                  repeatMode !== "off" ? colors.brand : colors.textTertiary
                }
                active={repeatMode !== "off"}
              />
            </TouchableOpacity>
          </View>

          {/* {currentSong?.album && (
            <Text
              style={[
                typography.labelMd,
                { color: colors.textTertiary, textAlign: "center" },
              ]}
              numberOfLines={1}
            >
              {currentSong.album}
            </Text>
          )} */}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingH + Spacing[2],
    paddingBottom: Spacing[8],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
  },
  artworkWrap: { alignItems: "center", marginBottom: Spacing[8] },
  artwork: {
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  artworkLetter: { color: "rgba(255,255,255,0.45)", fontWeight: "700" },
  songInfo: { marginBottom: Spacing[4], gap: Spacing[1] },
  seekWrap: { marginBottom: Spacing[6] },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing[6],
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
});
