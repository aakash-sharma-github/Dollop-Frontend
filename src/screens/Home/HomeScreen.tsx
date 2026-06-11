import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@theme/index";
import { Spacing, Layout, BorderRadius } from "@theme/spacing";
import { useAuthStore } from "@store/authStore";
import { usePlayerStore } from "@store/playerStore";
import {
  useLocalPlaylistStore,
  type LocalPlaylist,
} from "@store/localPlaylistStore";
import { getLocalMusicEnabled } from "@services/local/localMusicService";
import { jamendoProvider } from "@services/api/jamendo";
import type { Song } from "@app-types/index";
import type { HomeScreenProps } from "@app-types/navigation";
import { ROUTES } from "@constants/index";

const { width: W } = Dimensions.get("window");
const SONG_CARD_W = (W - Layout.screenPaddingH * 2 - Spacing[3]) / 2;
const PLAYLIST_CARD_W = 156;

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayIcon = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 4.75L19.5 12L6 19.25V4.75Z" />
  </Svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function artBg(id: string): string {
  return `hsl(${(id.charCodeAt(0) * 47) % 360}, 35%, 28%)`;
}
function getFirstName(
  displayName: string | null,
  email: string | null | undefined,
): string {
  if (displayName?.trim())
    return displayName.trim().split(" ")[0] ?? displayName.trim();
  if (email) return email.split("@")[0] ?? "there";
  return "there";
}
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

// ── Song card ─────────────────────────────────────────────────────────────────
function SongCard({ song, onPress }: { song: Song; onPress: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.songCard, { width: SONG_CARD_W }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.songArtwork,
          {
            width: SONG_CARD_W,
            height: SONG_CARD_W,
            backgroundColor: artBg(song.id),
          },
        ]}
      >
        {song.artworkUrl ? (
          <Image
            source={{ uri: song.artworkUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <Text style={styles.artLetter}>
            {song.title.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text
        style={[typography.labelMd, { color: colors.textPrimary }]}
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
    </TouchableOpacity>
  );
}

// ── Playlist card ─────────────────────────────────────────────────────────────
function PlaylistCard({
  name,
  artworkUrl,
  id,
  onPress,
}: {
  name: string;
  artworkUrl: string | null;
  id: string;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.plCard, { width: PLAYLIST_CARD_W }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.plArtwork,
          {
            width: PLAYLIST_CARD_W,
            height: PLAYLIST_CARD_W,
            backgroundColor: artBg(id),
          },
        ]}
      >
        {artworkUrl ? (
          <Image
            source={{ uri: artworkUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <View style={StyleSheet.absoluteFillObject}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.quadrant,
                  {
                    backgroundColor: `hsl(${(id.charCodeAt(i % id.length) * 31 + i * 60) % 360},30%,32%)`,
                  },
                ]}
              />
            ))}
          </View>
        )}
        <View style={[styles.playBtn, { backgroundColor: colors.brand }]}>
          <PlayIcon color={colors.textOnBrand} />
        </View>
      </View>
      <Text
        style={[
          typography.labelLg,
          { color: colors.textPrimary, marginTop: Spacing[2] },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
}

// ── Local playlist card ───────────────────────────────────────────────────────
function LocalPlaylistCard({
  playlist,
  onPress,
}: {
  playlist: LocalPlaylist;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const thumbs = playlist.songs.slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.plCard, { width: PLAYLIST_CARD_W }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.plArtwork,
          {
            width: PLAYLIST_CARD_W,
            height: PLAYLIST_CARD_W,
            backgroundColor: artBg(playlist.id),
          },
        ]}
      >
        <View style={StyleSheet.absoluteFillObject}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.quadrant,
                {
                  backgroundColor: artBg(thumbs[i]?.id ?? `${playlist.id}${i}`),
                },
              ]}
            >
              {thumbs[i]?.artworkUrl && (
                <Image
                  source={{ uri: thumbs[i]!.artworkUrl! }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
              )}
            </View>
          ))}
        </View>
        <View style={[styles.playBtn, { backgroundColor: colors.brand }]}>
          <PlayIcon color={colors.textOnBrand} />
        </View>
        <View
          style={[styles.localBadge, { backgroundColor: "rgba(0,0,0,0.55)" }]}
        >
          <Text style={{ fontSize: 10 }}>📱</Text>
        </View>
      </View>
      <Text
        style={[
          typography.labelLg,
          { color: colors.textPrimary, marginTop: Spacing[2] },
        ]}
        numberOfLines={1}
      >
        {playlist.name}
      </Text>
      <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
        {playlist.songs.length} songs
      </Text>
    </TouchableOpacity>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll?: () => void;
}) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[typography.h2, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity
          onPress={onSeeAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[typography.labelMd, { color: colors.brand }]}>
            See all
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Songs skeleton ────────────────────────────────────────────────────────────
function SongGridSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={styles.songGrid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: SONG_CARD_W }}>
          <View
            style={[
              styles.songArtwork,
              {
                width: SONG_CARD_W,
                height: SONG_CARD_W,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              {
                backgroundColor: colors.surfaceElevated,
                width: "80%",
                marginTop: 6,
              },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              {
                backgroundColor: colors.surfaceElevated,
                width: "55%",
                marginTop: 4,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function HomeScreen(_props: HomeScreenProps): React.JSX.Element {
  const { colors, typography, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const playSong = usePlayerStore((s) => s.playSong);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const { playlists: localPlaylists, isLoaded, load } = useLocalPlaylistStore();
  const [localEnabled, setLocalEnabled] = useState(false);

  const firstName = getFirstName(user?.displayName ?? null, user?.email);

  useEffect(() => {
    if (!isLoaded) void load();
    void getLocalMusicEnabled().then(setLocalEnabled);
  }, [isLoaded, load]);

  // ── Jamendo featured tracks (Recommended section) ─────────────────────────
  const { data: featuredTracks, isLoading: featuredLoading } = useQuery({
    queryKey: ["jamendo_featured_home"],
    queryFn: () => jamendoProvider.getFeatured(8),
    staleTime: 1000 * 60 * 15,
  });

  // ── Jamendo genre tracks (Recently Played placeholder until we have real history) ──
  const { data: popTracks, isLoading: popLoading } = useQuery({
    queryKey: ["jamendo_pop_home"],
    queryFn: () => jamendoProvider.getByGenre("pop", 8),
    staleTime: 1000 * 60 * 15,
  });

  const showLocalPlaylists = localEnabled && localPlaylists.length > 0;

  const handleSongPress = useCallback(
    (song: Song, queue: Song[]) => {
      void playSong(song, queue);
      navigation.navigate(ROUTES.PLAYER);
    },
    [playSong, navigation],
  );

  const handleLocalPlaylistPress = useCallback(
    (playlist: LocalPlaylist) => {
      if (playlist.songs.length === 0) {
        navigation.navigate(ROUTES.LIBRARY);
        return;
      }
      void playQueue(playlist.songs, 0);
      navigation.navigate(ROUTES.PLAYER);
    },
    [playQueue, navigation],
  );

  // ── Placeholder playlists (until backend playlists are fetched) ───────────
  const PLACEHOLDER_PLAYLISTS = [
    { id: "p1", name: "Liked Songs", artworkUrl: null },
    { id: "p2", name: "Chill Vibes", artworkUrl: null },
    { id: "p3", name: "Morning Run", artworkUrl: null },
  ];

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gradient header */}
        <LinearGradient
          colors={
            isDark
              ? ["#201808", colors.background]
              : ["#FFF4DC", colors.background]
          }
          style={styles.gradientHeader}
        >
          <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>
            {getGreeting()}
          </Text>
          <Text style={[typography.displayLg, { color: colors.textPrimary }]}>
            {firstName}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Recently Played — Jamendo pop tracks */}
          <View style={styles.section}>
            <SectionHeader title="Popular Right Now" />
            {popLoading ? (
              <SongGridSkeleton />
            ) : (
              <View style={styles.songGrid}>
                {(popTracks ?? []).slice(0, 4).map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onPress={() => handleSongPress(song, popTracks ?? [])}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Your Playlists header */}
          <View style={styles.section}>
            <SectionHeader
              title="Your Playlists"
              onSeeAll={() => navigation.navigate(ROUTES.LIBRARY)}
            />
          </View>
        </View>

        {/* Playlists horizontal scroll */}
        <FlatList
          data={PLACEHOLDER_PLAYLISTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.hScroll}
          ItemSeparatorComponent={() => <View style={{ width: Spacing[3] }} />}
          renderItem={({ item }) => (
            <PlaylistCard
              id={item.id}
              name={item.name}
              artworkUrl={item.artworkUrl}
              onPress={() => navigation.navigate(ROUTES.LIBRARY)}
            />
          )}
        />

        {/* Local playlists */}
        {showLocalPlaylists && (
          <>
            <View style={styles.body}>
              <View style={styles.section}>
                <SectionHeader
                  title="On This Device"
                  onSeeAll={() => navigation.navigate(ROUTES.LIBRARY)}
                />
              </View>
            </View>
            <FlatList
              data={localPlaylists}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.hScroll}
              ItemSeparatorComponent={() => (
                <View style={{ width: Spacing[3] }} />
              )}
              renderItem={({ item }) => (
                <LocalPlaylistCard
                  playlist={item}
                  onPress={() => handleLocalPlaylistPress(item)}
                />
              )}
            />
          </>
        )}

        <View style={styles.body}>
          {/* Recommended — Jamendo featured */}
          <View style={styles.section}>
            <SectionHeader title="Recommended" />
            {featuredLoading ? (
              <SongGridSkeleton />
            ) : (
              <View style={styles.songGrid}>
                {(featuredTracks ?? []).slice(0, 4).map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onPress={() => handleSongPress(song, featuredTracks ?? [])}
                  />
                ))}
              </View>
            )}
            {!featuredLoading &&
              featuredTracks &&
              featuredTracks.length > 4 && (
                <View style={styles.songGrid}>
                  {featuredTracks.slice(4, 8).map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onPress={() => handleSongPress(song, featuredTracks)}
                    />
                  ))}
                </View>
              )}
          </View>

          {/* Jamendo attribution */}
          <View
            style={[
              styles.attribution,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                typography.labelXs,
                { color: colors.textTertiary, textAlign: "center" },
              ]}
            >
              Music powered by Jamendo · Creative Commons licensed
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4],
  },
  gradientHeader: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },
  body: { paddingHorizontal: Layout.screenPaddingH },
  section: { marginBottom: Spacing[2] },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  songGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  songCard: { gap: Spacing[1.5] },
  songArtwork: {
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: Spacing[1],
  },
  artLetter: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    position: "absolute",
  },
  hScroll: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Spacing[6],
  },
  plCard: { gap: Spacing[1] },
  plArtwork: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: Spacing[2],
  },
  quadrant: { width: "50%", height: "50%" },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  localBadge: {
    position: "absolute",
    top: Spacing[2],
    left: Spacing[2],
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  skeletonLine: { height: 10, borderRadius: 5 },
  attribution: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
});
