import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme/index';
import { Spacing, Layout, BorderRadius, Shadow } from '@theme/spacing';
import { usePlayerStore, usePlayerProgressStore } from '@store/playerStore';
import { ROUTES } from '@constants/index';

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlayIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 4.75L19.5 12L6 19.25V4.75Z" />
  </Svg>
);
const PauseIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Rect x="5" y="4" width="4" height="16" rx="1" />
    <Rect x="15" y="4" width="4" height="16" rx="1" />
  </Svg>
);
const NextIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Path d="M5 4.75L16 12L5 19.25V4.75Z" />
    <Rect x="17" y="4" width="2.5" height="16" rx="1" />
  </Svg>
);

// ─── Progress bar — isolated component so ONLY it re-renders on position ticks
function MiniProgressBar(): React.JSX.Element {
  const { colors } = useTheme();
  // This is the ONLY component subscribing to usePlayerProgressStore here.
  // Everything else in MiniPlayer is unaffected by position updates.
  const positionMs = usePlayerProgressStore((s) => s.positionMs);
  const durationMs = usePlayerProgressStore((s) => s.durationMs);
  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={[progressStyles.track, { backgroundColor: colors.border }]}>
      <View
        style={[
          progressStyles.fill,
          { backgroundColor: colors.brand, width: `${progress * 100}%` },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 2 },
  fill: { height: '100%' },
});

// ─── Main mini player ─────────────────────────────────────────────────────────
export function MiniPlayer(): React.JSX.Element | null {
  const { colors, typography } = useTheme();
  const navigation = useNavigation<any>();

  // Granular selectors — each selector only triggers a re-render when that
  // specific value changes. The song info row never re-renders during playback.
  const isVisible = usePlayerStore((s) => s.isVisible);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const skipToNext = usePlayerStore((s) => s.skipToNext);

  const handlePlayPause = useCallback(() => { void togglePlayPause(); }, [togglePlayPause]);
  const handleNext = useCallback(() => { void skipToNext(); }, [skipToNext]);

  if (!isVisible || !currentSong) return null;

  const hue = (currentSong.id.charCodeAt(0) * 47) % 360;
  const artworkBg = `hsl(${hue}, 35%, 28%)`;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.springify()}
      style={[styles.wrapper, Shadow.md]}
    >
      <Pressable
        style={[
          styles.container,
          { backgroundColor: colors.miniPlayerBackground, borderColor: colors.border },
        ]}
        onPress={() => navigation.navigate(ROUTES.PLAYER)}
      >
        {/* Progress bar — updates every 500ms but is isolated in its own component */}
        <MiniProgressBar />

        <View style={styles.content}>
          {/* Artwork */}
          <View style={[styles.artwork, { backgroundColor: artworkBg }]}>
            <Text style={styles.artworkLetter}>
              {currentSong.title.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Song info — only re-renders when currentSong changes */}
          <View style={styles.info}>
            <Text
              style={[typography.labelLg, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {currentSong.title}
            </Text>
            <Text
              style={[typography.labelSm, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {currentSong.artist}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handlePlayPause}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isLoading ? (
                <View style={[styles.loadingDot, { backgroundColor: colors.textTertiary }]} />
              ) : isPlaying ? (
                <PauseIcon color={colors.textPrimary} />
              ) : (
                <PlayIcon color={colors.textPrimary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <NextIcon color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Layout.tabBarHeight,
    left: Spacing[3],
    right: Spacing[3],
    zIndex: 100,
    borderRadius: BorderRadius.xl,
  },
  container: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.miniPlayerHeight - 2,
    paddingHorizontal: Spacing[3],
    gap: Spacing[3],
  },
  artwork: {
    width: Layout.artworkSm,
    height: Layout.artworkSm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkLetter: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  info: { flex: 1, gap: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  loadingDot: { width: 8, height: 8, borderRadius: 4 },
});