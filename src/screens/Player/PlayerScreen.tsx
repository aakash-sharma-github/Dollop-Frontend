import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated2, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import DraggableFlatList from "react-native-draggable-flatlist";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@theme/index";
import { Spacing, Layout, BorderRadius } from "@theme/spacing";
import { usePlayerStore, usePlayerProgressStore } from "@store/playerStore";
import {
  getLyrics,
  getActiveLyricIndex,
  type SyncedLyricLine,
} from "@services/api/lyrics";
import type { Song } from "@app-types/index";
import type { PlayerScreenProps } from "@app-types/navigation";

const { width: W } = Dimensions.get("window");
const ARTWORK_SIZE = W - (Layout.screenPaddingH + Spacing[4]) * 2;
const BAR_W = W - Layout.screenPaddingH * 2;
const TRACK_H = 4;
const THUMB_SIZE = 14;
const THUMB_TOP = -(THUMB_SIZE / 2) + TRACK_H / 2;

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayIcon = ({ c }: { c: string }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={c}>
    <Path d="M6 4.75L19.5 12L6 19.25V4.75Z" />
  </Svg>
);
const PauseIcon = ({ c }: { c: string }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={c}>
    <Rect x="5" y="4" width="4" height="16" rx="1" />
    <Rect x="15" y="4" width="4" height="16" rx="1" />
  </Svg>
);
const NextIcon = ({ c }: { c: string }) => (
  <Svg width={36} height={36} viewBox="0 0 24 24" fill={c}>
    <Path d="M5 4.75L16 12L5 19.25V4.75Z" />
    <Rect x="17" y="4" width="2.5" height="16" rx="1" />
  </Svg>
);
const PrevIcon = ({ c }: { c: string }) => (
  <Svg width={36} height={36} viewBox="0 0 24 24" fill={c}>
    <Path d="M19 19.25L8 12L19 4.75V19.25Z" />
    <Rect x="4.5" y="4" width="2.5" height="16" rx="1" />
  </Svg>
);
const ShuffleIcon = ({ c, a }: { c: string; a: boolean }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={a ? 2.25 : 1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M16 3h5v5M4 20L21 3M16 21h5v-5M4 4l8 8" />
  </Svg>
);
const RepeatIcon = ({ c, a }: { c: string; a: boolean }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={a ? 2.25 : 1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
  </Svg>
);
const ChevronDown = ({ c }: { c: string }) => (
  <Svg
    width={28}
    height={28}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={2}
    strokeLinecap="round"
  >
    <Path d="M6 9l6 6 6-6" />
  </Svg>
);
const DotsIcon = ({ c }: { c: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={c}>
    <Circle cx="12" cy="5" r="1.5" />
    <Circle cx="12" cy="12" r="1.5" />
    <Circle cx="12" cy="19" r="1.5" />
  </Svg>
);
const QueueIcon = ({ c }: { c: string }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={1.75}
    strokeLinecap="round"
  >
    <Path d="M3 6h18M3 12h18M3 18h12" />
    <Path d="M17 15l3 3-3 3" />
  </Svg>
);
const PlusQueueIcon = ({ c }: { c: string }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={1.75}
    strokeLinecap="round"
  >
    <Path d="M3 6h18M3 12h12M3 18h9" />
    <Path d="M16 14v6M13 17h6" />
  </Svg>
);
const LyricsIcon = ({ c }: { c: string }) => (
  <Svg
    width={22}
    height={22}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 00-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </Svg>
);
const DragIcon = ({ c }: { c: string }) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c}
    strokeWidth={1.75}
    strokeLinecap="round"
  >
    <Path d="M9 5h2M9 12h2M9 19h2M13 5h2M13 12h2M13 19h2" />
  </Svg>
);

// ── Format time ───────────────────────────────────────────────────────────────
function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function artworkBg(id: string): string {
  const hue = (id.charCodeAt(0) * 47) % 360;
  return `hsl(${hue}, 35%, 25%)`;
}

// ── Seek bar ──────────────────────────────────────────────────────────────────
function SeekBar({ onSeek }: { onSeek: (ms: number) => void }) {
  const { colors } = useTheme();
  const positionMs = usePlayerProgressStore((s) => s.positionMs);
  const durationMs = usePlayerProgressStore((s) => s.durationMs);
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const thumbX = useSharedValue(0);
  const dragging = useSharedValue(false);

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragging.value = true;
    })
    .onUpdate((e) => {
      thumbX.value = Math.max(0, Math.min(BAR_W, e.x));
    })
    .onEnd(() => {
      dragging.value = false;
      runOnJS(onSeek)((thumbX.value / BAR_W) * durationMs);
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: dragging.value ? thumbX.value : progress * BAR_W,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const fillW = dragging.value ? thumbX.value : progress * BAR_W;
    return {
      transform: [
        {
          translateX: Math.max(
            0,
            Math.min(BAR_W - THUMB_SIZE, fillW - THUMB_SIZE / 2),
          ),
        },
        { scale: withSpring(dragging.value ? 1.3 : 1, { damping: 15 }) },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={seekSt.touchArea}>
        <View style={seekSt.trackWrap}>
          <View style={[seekSt.track, { backgroundColor: colors.border }]}>
            <Animated2.View
              style={[
                seekSt.fill,
                { backgroundColor: colors.brand },
                fillStyle,
              ]}
            />
          </View>
          <Animated2.View
            style={[
              seekSt.thumb,
              { backgroundColor: colors.brand, top: THUMB_TOP },
              thumbStyle,
            ]}
          />
        </View>
        <View style={seekSt.labels}>
          <Text style={[seekSt.time, { color: colors.textSecondary }]}>
            {fmt(positionMs)}
          </Text>
          <Text style={[seekSt.time, { color: colors.textSecondary }]}>
            {fmt(durationMs)}
          </Text>
        </View>
      </View>
    </GestureDetector>
  );
}

const seekSt = StyleSheet.create({
  touchArea: { width: "100%", paddingVertical: Spacing[3] },
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
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing[2],
  },
  time: { fontSize: 12, fontWeight: "500" },
});

// ── Artwork ───────────────────────────────────────────────────────────────────
function PlayerArtwork({
  song,
  isPlaying,
}: {
  song: Song | null;
  isPlaying: boolean;
}) {
  const bg = song ? artworkBg(song.id) : "#1C1A16";
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isPlaying ? 1 : 0.875, { damping: 14 }) }],
  }));
  return (
    <Animated2.View
      style={[
        art.wrap,
        { width: ARTWORK_SIZE, height: ARTWORK_SIZE, backgroundColor: bg },
        artStyle,
      ]}
    >
      {song?.artworkUrl ? (
        <Image
          source={{ uri: song.artworkUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <Text style={[art.letter, { fontSize: ARTWORK_SIZE * 0.32 }]}>
          {song?.title.charAt(0).toUpperCase() ?? "♪"}
        </Text>
      )}
    </Animated2.View>
  );
}

const art = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  letter: { color: "rgba(255,255,255,0.45)", fontWeight: "700" },
});

// ── Dots menu ─────────────────────────────────────────────────────────────────
interface DotsMenuProps {
  visible: boolean;
  onClose: () => void;
  onShowQueue: () => void;
  onAddToQueue: () => void;
  lyricsOn: boolean;
  onToggleLyrics: () => void;
}

function DotsMenu({
  visible,
  onClose,
  onShowQueue,
  onAddToQueue,
  lyricsOn,
  onToggleLyrics,
}: DotsMenuProps) {
  const { colors, typography } = useTheme();
  const currentSong = usePlayerStore((s) => s.currentSong);

  const items = [
    {
      icon: <QueueIcon c={colors.textPrimary} />,
      label: "View queue",
      onPress: () => {
        onClose();
        onShowQueue();
      },
    },
    {
      icon: <PlusQueueIcon c={colors.textPrimary} />,
      label: currentSong
        ? `Add "${currentSong.title}" to queue`
        : "Add to queue",
      onPress: () => {
        if (currentSong) {
          Alert.alert(
            "Added",
            `"${currentSong.title}" will repeat in the queue`,
          );
        }
        onClose();
        onAddToQueue();
      },
    },
    {
      icon: <LyricsIcon c={lyricsOn ? colors.brand : colors.textPrimary} />,
      label: lyricsOn ? "Hide lyrics" : "Show lyrics",
      onPress: () => {
        onToggleLyrics();
        onClose();
      },
      accent: lyricsOn,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={menuSt.overlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <TouchableOpacity
          style={[
            menuSt.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={1}
        >
          {currentSong && (
            <View
              style={[menuSt.songPreview, { borderBottomColor: colors.border }]}
            >
              <View
                style={[
                  menuSt.previewArt,
                  { backgroundColor: artworkBg(currentSong.id) },
                ]}
              >
                {currentSong.artworkUrl && (
                  <Image
                    source={{ uri: currentSong.artworkUrl }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
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
            </View>
          )}
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                menuSt.item,
                i < items.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              {item.icon}
              <Text
                style={[
                  typography.bodyMd,
                  {
                    color: item.accent ? colors.brand : colors.textPrimary,
                    flex: 1,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const menuSt = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
    paddingBottom: Spacing[10],
  },
  card: {
    marginHorizontal: Layout.screenPaddingH,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    overflow: "hidden",
  },
  songPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    padding: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewArt: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[4],
    padding: Spacing[4],
  },
});

// ── Queue item ─────────────────────────────────────────────────────────────────
interface QueueItemProps {
  song: Song;
  isActive: boolean;
  onPress: () => void;
  onRemove: () => void;
  /** Called when the drag handle receives a long-press — starts the drag */
  onDragStart: () => void;
  isDragging?: boolean;
}

function QueueItem({
  song,
  isActive,
  onPress,
  onRemove,
  onDragStart,
  isDragging,
}: QueueItemProps) {
  const { colors, typography } = useTheme();
  return (
    <View
      style={[
        qSt.row,
        {
          backgroundColor: isDragging
            ? colors.surfaceElevated
            : isActive
              ? colors.brand + "14"
              : "transparent",
        },
      ]}
    >
      <TouchableOpacity
        style={qSt.pressArea}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[qSt.art, { backgroundColor: artworkBg(song.id) }]}>
          {song.artworkUrl && (
            <Image
              source={{ uri: song.artworkUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          )}
          {isActive && (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: "rgba(0,0,0,0.4)",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <PlayIcon c="white" />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.labelLg,
              { color: isActive ? colors.brand : colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text
            style={[typography.labelSm, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {song.artist}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textTertiary}
          strokeWidth={2}
          strokeLinecap="round"
        >
          <Path d="M18 6L6 18M6 6l12 12" />
        </Svg>
      </TouchableOpacity>

      {/* Drag handle — onPressIn + long-press starts the drag.
          Only this area triggers dragging; the rest of the row stays tappable. */}
      <TouchableOpacity
        onLongPress={onDragStart}
        delayLongPress={150}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ paddingLeft: Spacing[2] }}
      >
        <DragIcon c={isDragging ? colors.brand : colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const qSt = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    paddingHorizontal: Layout.screenPaddingH,
    paddingVertical: Spacing[2.5],
  },
  pressArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
});

// ── Queue modal ───────────────────────────────────────────────────────────────
function QueueModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, typography } = useTheme();
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const { skipToIndex, removeFromQueue, reorderQueue, clearQueue } =
    usePlayerStore();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[qModalSt.safe, { backgroundColor: colors.background }]}
      >
        <View style={[qModalSt.header, { borderBottomColor: colors.border }]}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>
            Up Next
          </Text>
          <View style={qModalSt.headerRight}>
            <TouchableOpacity
              onPress={() => {
                void clearQueue();
                onClose();
              }}
              style={{ marginRight: Spacing[4] }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[typography.labelMd, { color: colors.error }]}>
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[typography.labelMd, { color: colors.brand }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={[
            typography.labelSm,
            {
              color: colors.textTertiary,
              paddingHorizontal: Layout.screenPaddingH,
              paddingTop: Spacing[3],
              paddingBottom: Spacing[1],
            },
          ]}
        >
          {queue.length} songs · Press and hold the ⠿ handle to reorder
        </Text>

        <DraggableFlatList
          data={queue}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          // DraggableFlatList auto-scrolls near top/bottom edges while dragging
          autoscrollThreshold={60}
          autoscrollSpeed={150}
          activationDistance={0}
          onDragEnd={({ from, to }) => {
            if (from !== to) reorderQueue(from, to);
          }}
          renderItem={({ item, index, drag, isActive: isDragging }) => (
            <QueueItem
              song={item}
              isActive={index === queueIndex}
              isDragging={isDragging}
              onPress={() => void skipToIndex(index ?? 0)}
              onRemove={() => removeFromQueue(index ?? 0)}
              onDragStart={drag}
            />
          )}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border,
                marginLeft: Layout.screenPaddingH + 48 + Spacing[3],
              }}
            />
          )}
          contentContainerStyle={{ paddingBottom: Spacing[16] }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const qModalSt = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.screenPaddingH,
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
});

// ── Lyrics view ───────────────────────────────────────────────────────────────
function LyricsView({ song }: { song: Song | null }) {
  const { colors, typography } = useTheme();
  const positionMs = usePlayerProgressStore((s) => s.positionMs);
  const listRef = useRef<FlatList<SyncedLyricLine | { text: string }>>(null);
  const lastScrolledIndex = useRef(-1);

  const { data: lyrics, isLoading } = useQuery({
    queryKey: ["lyrics", song?.title, song?.artist],
    queryFn: () =>
      getLyrics({
        title: song!.title,
        artist: song!.artist,
        album: song?.album,
        durationSec: song ? Math.round(song.durationMs / 1000) : undefined,
      }),
    enabled: !!song,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const synced = lyrics?.syncedLyrics ?? null;
  const activeIndex = synced ? getActiveLyricIndex(synced, positionMs) : -1;

  // Auto-scroll to the active synced line
  useEffect(() => {
    if (!synced || activeIndex < 0 || activeIndex === lastScrolledIndex.current)
      return;
    lastScrolledIndex.current = activeIndex;
    listRef.current?.scrollToIndex({
      index: activeIndex,
      animated: true,
      viewPosition: 0.35,
    });
  }, [activeIndex, synced]);

  if (!song) {
    return (
      <View style={lyricsSt.wrap}>
        <Text
          style={[
            typography.bodyMd,
            { color: colors.textSecondary, textAlign: "center" },
          ]}
        >
          No track playing
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={lyricsSt.wrap}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!lyrics || (!lyrics.plainLyrics && !lyrics.syncedLyrics)) {
    return (
      <View style={lyricsSt.wrap}>
        <Text
          style={[
            typography.bodyMd,
            { color: colors.textSecondary, textAlign: "center" },
          ]}
        >
          Lyrics not available.
        </Text>
      </View>
    );
  }

  if (lyrics.instrumental) {
    return (
      <View style={lyricsSt.wrap}>
        <Text
          style={[
            typography.bodyMd,
            { color: colors.textSecondary, textAlign: "center" },
          ]}
        >
          This track is instrumental.
        </Text>
      </View>
    );
  }

  // ── Synced lyrics: scrollable, highlight active line ─────────────────────────
  if (synced && synced.length > 0) {
    return (
      <FlatList
        ref={listRef}
        data={synced}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={lyricsSt.syncedContent}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={() => {
          /* ignore — list not yet measured */
        }}
        renderItem={({ item, index }) => (
          <Text
            style={[
              typography.h3,
              lyricsSt.syncedLine,
              {
                color:
                  index === activeIndex ? colors.brand : colors.textTertiary,
                fontWeight: index === activeIndex ? "700" : "500",
              },
            ]}
          >
            {item.text || "⋯"}
          </Text>
        )}
      />
    );
  }

  // ── Plain lyrics: simple scrollable text block ────────────────────────────────
  return (
    <FlatList
      data={[{ text: lyrics.plainLyrics ?? "" }]}
      keyExtractor={() => "plain"}
      contentContainerStyle={lyricsSt.plainContent}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <Text
          style={[
            typography.bodyLg,
            { color: colors.textPrimary, lineHeight: 28 },
          ]}
        >
          {item.text}
        </Text>
      )}
    />
  );
}

const lyricsSt = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Layout.screenPaddingH,
  },
  syncedContent: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingVertical: Spacing[10],
    gap: Spacing[4],
  },
  syncedLine: { textAlign: "center" },
  plainContent: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingVertical: Spacing[4],
  },
});

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
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const [showDots, setShowDots] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [lyricsOn, setLyricsOn] = useState(false);

  const handleSeek = useCallback(
    (ms: number) => {
      void seekTo(ms);
    },
    [seekTo],
  );

  // ── Swipe-right-to-dismiss ───────────────────────────────────────────────────
  // Swiping right from the LEFT EDGE of the screen dismisses the player
  // (mirrors iOS-style edge-swipe-back). This is implemented as a thin
  // (24px) invisible strip with its own GestureDetector — NOT wrapping the
  // whole screen. Wrapping the entire content in a Pan GestureDetector
  // previously blocked all TouchableOpacity presses on Android (buttons
  // appeared "frozen"), which this fixes.
  const screenTranslateX = useSharedValue(0);
  const SWIPE_DISMISS_THRESHOLD = 80;
  const EDGE_WIDTH = 24;

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const edgeSwipeGesture = Gesture.Pan()
    .activeOffsetX([10, 999])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      if (e.translationX > 0) screenTranslateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_DISMISS_THRESHOLD) {
        screenTranslateX.value = withSpring(W, { damping: 20 });
        runOnJS(goBack)();
      } else {
        screenTranslateX.value = withSpring(0, { damping: 18 });
      }
    });

  const screenAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: screenTranslateX.value }],
    opacity: 1 - Math.min(screenTranslateX.value / W, 0.5),
  }));

  return (
    <LinearGradient
      colors={[colors.playerGradientTop, colors.playerGradientBottom]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Left-edge swipe strip — does NOT cover buttons/content */}
        <GestureDetector gesture={edgeSwipeGesture}>
          <View
            style={[styles.edgeStrip, { width: EDGE_WIDTH }]}
            pointerEvents="box-only"
          />
        </GestureDetector>

        <Animated2.View style={[styles.container, screenAnimStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronDown c={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
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
              {currentSong?.provider === "local" && (
                <Text style={[typography.labelXs, { color: colors.brand }]}>
                  📱 Local
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowDots(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <DotsIcon c={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Artwork or Lyrics */}
          {lyricsOn ? (
            <LyricsView song={currentSong} />
          ) : (
            <View style={styles.artworkWrap}>
              <PlayerArtwork song={currentSong} isPlaying={isPlaying} />
            </View>
          )}

          {/* Song info */}
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
          </View>

          {/* Seek bar */}
          <View style={styles.seekWrap}>
            <SeekBar onSeek={handleSeek} />
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={toggleShuffle}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ShuffleIcon
                c={isShuffle ? colors.brand : colors.textTertiary}
                a={isShuffle}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void skipToPrevious()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <PrevIcon c={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: colors.brand }]}
              onPress={() => void togglePlayPause()}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={styles.loadingDot} />
              ) : isPlaying ? (
                <PauseIcon c={colors.textOnBrand} />
              ) : (
                <PlayIcon c={colors.textOnBrand} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void skipToNext()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <NextIcon c={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cycleRepeatMode}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <RepeatIcon
                c={repeatMode !== "off" ? colors.brand : colors.textTertiary}
                a={repeatMode !== "off"}
              />
            </TouchableOpacity>
          </View>

          {/* Queue shortcut */}
          <TouchableOpacity
            style={[styles.queueBtn, { borderColor: colors.border }]}
            onPress={() => setShowQueue(true)}
            activeOpacity={0.7}
          >
            <QueueIcon c={colors.textSecondary} />
            <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
              View queue
            </Text>
          </TouchableOpacity>

          {currentSong?.album && (
            <Text
              style={[
                typography.labelMd,
                {
                  color: colors.textTertiary,
                  textAlign: "center",
                  marginTop: Spacing[2],
                },
              ]}
              numberOfLines={1}
            >
              {currentSong.album}
            </Text>
          )}
        </Animated2.View>

        {/* Modals — outside the swipeable area so they aren't affected by translateX */}
        <DotsMenu
          visible={showDots}
          onClose={() => setShowDots(false)}
          onShowQueue={() => setShowQueue(true)}
          onAddToQueue={() => {
            if (currentSong) addToQueue(currentSong);
          }}
          lyricsOn={lyricsOn}
          onToggleLyrics={() => setLyricsOn((v) => !v)}
        />
        <QueueModal visible={showQueue} onClose={() => setShowQueue(false)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  edgeStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingH + Spacing[2],
    paddingBottom: Spacing[6],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing[4],
    paddingBottom: Spacing[4],
  },
  headerCenter: { alignItems: "center", gap: 2 },
  artworkWrap: { alignItems: "center", marginBottom: Spacing[6] },
  songInfo: { marginBottom: Spacing[2], gap: Spacing[1] },
  seekWrap: { marginBottom: Spacing[4] },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing[4],
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
  queueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    paddingVertical: Spacing[2.5],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing[2],
  },
});
