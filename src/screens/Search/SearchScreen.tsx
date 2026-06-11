import React, { useState, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Svg, { Path, Circle } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@theme/index";
import { Layout, Spacing, BorderRadius } from "@theme/spacing";
import { usePlayerStore } from "@store/playerStore";
import { jamendoProvider } from "@services/api/jamendo";
import { QUERY_KEYS, ROUTES } from "@constants/index";
import type { Song } from "@app-types/index";
import type { SearchScreenProps } from "@app-types/navigation";

// ── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = ({ color }: { color: string }) => (
  <Svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
  >
    <Circle cx="11" cy="11" r="8" />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);
const ClearIcon = ({ color }: { color: string }) => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
  >
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);
const PlayIcon = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
    <Path d="M6 4.75L19.5 12L6 19.25V4.75Z" />
  </Svg>
);
const MusicIcon = ({ color }: { color: string }) => (
  <Svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M9 18V5l12-2v13" />
    <Circle cx="6" cy="18" r="3" />
    <Circle cx="18" cy="16" r="3" />
  </Svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function artworkBg(id: string): string {
  return `hsl(${(id.charCodeAt(0) * 47) % 360}, 35%, 28%)`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Genre chips ───────────────────────────────────────────────────────────────
const GENRES = [
  "Pop",
  "Rock",
  "Electronic",
  "Hip-hop",
  "Jazz",
  "Classical",
  "Ambient",
  "Folk",
  "Metal",
  "Reggae",
];

// ── Song result row ───────────────────────────────────────────────────────────
const SONG_ROW_H = 68;

const SongResultRow = memo(function SongResultRow({
  song,
  isPlaying,
  onPress,
}: {
  song: Song;
  isPlaying: boolean;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.songRow, { height: SONG_ROW_H }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.artwork, { backgroundColor: artworkBg(song.id) }]}>
        {song.artworkUrl ? (
          <Image
            source={{ uri: song.artworkUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <MusicIcon color="rgba(255,255,255,0.45)" />
        )}
        {isPlaying && (
          <View style={styles.playingOverlay}>
            <PlayIcon color="white" />
          </View>
        )}
      </View>

      <View style={styles.songMeta}>
        <Text
          style={[
            typography.labelLg,
            { color: isPlaying ? colors.brand : colors.textPrimary },
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
          {song.album ? ` · ${song.album}` : ""}
        </Text>
      </View>

      <Text
        style={[
          typography.labelSm,
          { color: colors.textTertiary, fontVariant: ["tabular-nums"] },
        ]}
      >
        {formatDuration(song.durationMs)}
      </Text>
    </TouchableOpacity>
  );
});

// ── Genre browse section ──────────────────────────────────────────────────────
function GenreBrowse({ onSelect }: { onSelect: (genre: string) => void }) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.genreSection}>
      <Text
        style={[
          typography.h3,
          { color: colors.textPrimary, marginBottom: Spacing[4] },
        ]}
      >
        Browse by genre
      </Text>
      <View style={styles.genreGrid}>
        {GENRES.map((genre) => {
          const hue = (genre.charCodeAt(0) * 37) % 360;
          return (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreChip,
                { backgroundColor: `hsl(${hue},35%,25%)` },
              ]}
              onPress={() => onSelect(genre)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  typography.labelLg,
                  { color: "rgba(255,255,255,0.9)", fontWeight: "600" },
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Attribution notice ────────────────────────────────────────────────────────
function JamendoAttribution() {
  const { colors, typography } = useTheme();
  return (
    <View
      style={[
        styles.attribution,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          typography.labelXs,
          { color: colors.textTertiary, textAlign: "center" },
        ]}
      >
        Music provided by Jamendo · Creative Commons licensed
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function SearchScreen(_props: SearchScreenProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const navigation = useNavigation<any>();
  const playSong = usePlayerStore((s) => s.playSong);
  const currentSong = usePlayerStore((s) => s.currentSong);

  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState(""); // debounced search query
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [inputRef] = useState(() => React.createRef<TextInput>());

  // Debounce: only fire query 500ms after user stops typing
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInputChange = useCallback((text: string) => {
    setInputValue(text);
    setActiveGenre(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(text.trim());
    }, 500);
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
    setQuery("");
    setActiveGenre(null);
  }, []);

  const handleGenreSelect = useCallback((genre: string) => {
    setActiveGenre(genre);
    setInputValue("");
    setQuery("");
    Keyboard.dismiss();
  }, []);

  // ── Text search query ──────────────────────────────────────────────────────
  const {
    data: searchResults,
    isFetching: isSearching,
    error: searchError,
  } = useQuery({
    queryKey: [QUERY_KEYS.SEARCH, query],
    queryFn: () => jamendoProvider.search(query, 30),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 10,
  });

  // ── Genre browse query ─────────────────────────────────────────────────────
  const { data: genreTracks, isFetching: isLoadingGenre } = useQuery({
    queryKey: ["jamendo_genre", activeGenre],
    queryFn: () => jamendoProvider.getByGenre(activeGenre!.toLowerCase(), 30),
    enabled: !!activeGenre,
    staleTime: 1000 * 60 * 10,
  });

  // ── Derived state ──────────────────────────────────────────────────────────
  const tracks: Song[] = useMemo(() => {
    if (activeGenre) return genreTracks ?? [];
    return searchResults?.tracks ?? [];
  }, [activeGenre, genreTracks, searchResults]);

  const isLoading = isSearching || isLoadingGenre;
  const showBrowse = !query && !activeGenre;
  const hasResults = tracks.length > 0;

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SONG_ROW_H,
      offset: SONG_ROW_H * index,
      index,
    }),
    [],
  );

  const handleSongPress = useCallback(
    (song: Song) => {
      void playSong(song, tracks);
      navigation.navigate(ROUTES.PLAYER);
    },
    [playSong, tracks, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Song }) => (
      <SongResultRow
        song={item}
        isPlaying={currentSong?.id === item.id}
        onPress={() => handleSongPress(item)}
      />
    ),
    [currentSong?.id, handleSongPress],
  );

  const keyExtractor = useCallback((item: Song) => item.id, []);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Search bar */}
      <View style={styles.searchHeader}>
        <Text
          style={[
            typography.h1,
            { color: colors.textPrimary, marginBottom: Spacing[4] },
          ]}
        >
          Search
        </Text>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <SearchIcon color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[
              typography.bodyMd,
              styles.searchInput,
              { color: colors.textPrimary },
            ]}
            placeholder="Songs, artists, albums…"
            placeholderTextColor={colors.textTertiary}
            value={inputValue}
            onChangeText={handleInputChange}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {inputValue.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ClearIcon color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Active genre chip */}
        {activeGenre && (
          <View style={styles.activeGenreRow}>
            <View
              style={[
                styles.activeGenrePill,
                {
                  backgroundColor: colors.brand + "20",
                  borderColor: colors.brand,
                },
              ]}
            >
              <Text style={[typography.labelMd, { color: colors.brand }]}>
                {activeGenre}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveGenre(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ClearIcon color={colors.brand} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.brand} size="small" />
          <Text style={[typography.labelMd, { color: colors.textSecondary }]}>
            {activeGenre ? `Loading ${activeGenre}…` : "Searching…"}
          </Text>
        </View>
      )}

      {/* Error */}
      {searchError && !isLoading && (
        <View style={styles.errorBox}>
          <Text style={[typography.bodyMd, { color: colors.error }]}>
            Search failed. Check your connection and try again.
          </Text>
        </View>
      )}

      {/* Browse — shown when no query and no genre */}
      {showBrowse && !isLoading && (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={<GenreBrowse onSelect={handleGenreSelect} />}
          ListFooterComponent={<JamendoAttribution />}
          contentContainerStyle={styles.browseContent}
        />
      )}

      {/* Results */}
      {hasResults && !isLoading && (
        <FlatList
          data={tracks}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          maxToRenderPerBatch={12}
          windowSize={10}
          initialNumToRender={15}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text
              style={[
                typography.labelSm,
                { color: colors.textTertiary, marginBottom: Spacing[3] },
              ]}
            >
              {tracks.length} results
              {activeGenre ? ` in ${activeGenre}` : ` for "${query}"`}
            </Text>
          }
          ListFooterComponent={<JamendoAttribution />}
          contentContainerStyle={styles.resultsContent}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border,
                marginLeft: 48 + Spacing[3] * 2,
              }}
            />
          )}
        />
      )}

      {/* Empty state */}
      {!isLoading && !hasResults && (query.length >= 2 || activeGenre) && (
        <View style={styles.emptyState}>
          <Text
            style={[
              typography.h3,
              { color: colors.textPrimary, marginBottom: Spacing[2] },
            ]}
          >
            No results
          </Text>
          <Text
            style={[
              typography.bodyMd,
              { color: colors.textSecondary, textAlign: "center" },
            ]}
          >
            {query.length >= 2
              ? `Nothing found for "${query}". Try different keywords.`
              : `No ${activeGenre} tracks found.`}
          </Text>
        </View>
      )}

      {/* Waiting for more input */}
      {!isLoading && query.length > 0 && query.length < 2 && (
        <View style={styles.emptyState}>
          <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>
            Keep typing…
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchHeader: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing[6],
    paddingBottom: Spacing[2],
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2.5],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 0 },
  activeGenreRow: { flexDirection: "row", marginTop: Spacing[3] },
  activeGenrePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    paddingVertical: Spacing[4],
  },
  errorBox: {
    margin: Layout.screenPaddingH,
    padding: Spacing[4],
    borderRadius: BorderRadius.lg,
  },
  browseContent: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4],
  },
  resultsContent: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4],
  },
  genreSection: { paddingTop: Spacing[4] },
  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing[2] },
  genreChip: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2.5],
    borderRadius: BorderRadius.lg,
  },
  songRow: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  songMeta: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Layout.screenPaddingH,
  },
  attribution: {
    marginTop: Spacing[6],
    marginHorizontal: 0,
    padding: Spacing[3],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
});
