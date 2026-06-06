import React, { useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Image, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { Spacing, Layout, BorderRadius } from '@theme/spacing';
import { useAuthStore } from '@store/authStore';
import { usePlayerStore } from '@store/playerStore';
import type { Song, Playlist } from '@app-types/index';
import type { HomeScreenProps } from '@app-types/navigation';
import { ROUTES } from '@constants/index';

const { width: W } = Dimensions.get('window');
const SONG_CARD_W = (W - Layout.screenPaddingH * 2 - Spacing[3]) / 2;
const PLAYLIST_CARD_W = 160;

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayIcon = ({ color }: { color: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}><Path d="M6 4.75L19.5 12L6 19.25V4.75Z" /></Svg>
);

// ── Static placeholder data ───────────────────────────────────────────────────
const RECENTLY_PLAYED: Song[] = [
  { id: '1', title: 'Golden Hour', artist: 'JVKE', album: 'this is what ____ feels like', durationMs: 209000, externalId: 'e1', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '2', title: 'Ceilings', artist: 'Lizzy McAlpine', album: 'five seconds flat', durationMs: 185000, externalId: 'e2', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '3', title: 'Lavender Haze', artist: 'Taylor Swift', album: 'Midnights', durationMs: 202000, externalId: 'e3', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '4', title: 'Escapism.', artist: 'RAYE', album: 'My 21st Century Blues', durationMs: 220000, externalId: 'e4', provider: 'placeholder', artworkUrl: null, previewUrl: null },
];

const PLACEHOLDER_PLAYLISTS: Playlist[] = [
  { id: 'p1', userId: '', name: 'Liked Songs', description: 'Your favourite tracks', artworkUrl: null, isPublic: false, songCount: 0, createdAt: '', updatedAt: '' },
  { id: 'p2', userId: '', name: 'Chill Vibes', description: 'Easy listening', artworkUrl: null, isPublic: false, songCount: 0, createdAt: '', updatedAt: '' },
  { id: 'p3', userId: '', name: 'Morning Run', description: 'High energy', artworkUrl: null, isPublic: false, songCount: 0, createdAt: '', updatedAt: '' },
  { id: 'p4', userId: '', name: 'Late Night', description: 'Mellow and deep', artworkUrl: null, isPublic: false, songCount: 0, createdAt: '', updatedAt: '' },
];

// ── Song card ─────────────────────────────────────────────────────────────────
function SongCard({ song, onPress }: { song: Song; onPress: () => void }) {
  const { colors, typography } = useTheme();
  const hue = (song.id.charCodeAt(0) * 47) % 360;
  const bg = `hsl(${hue}, 35%, 28%)`;

  return (
    <TouchableOpacity
      style={[styles.songCard, { width: SONG_CARD_W }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.songArtwork, { backgroundColor: bg, width: SONG_CARD_W, height: SONG_CARD_W }]}>
        {song.artworkUrl
          ? <Image source={{ uri: song.artworkUrl }} style={StyleSheet.absoluteFillObject} />
          : <Text style={styles.artworkLetter}>{song.title.charAt(0).toUpperCase()}</Text>
        }
      </View>
      <Text style={[typography.labelMd, { color: colors.textPrimary }]} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={[typography.labelSm, { color: colors.textSecondary }]} numberOfLines={1}>
        {song.artist}
      </Text>
    </TouchableOpacity>
  );
}

// ── Playlist card (horizontal scroll) ────────────────────────────────────────
function PlaylistCard({ playlist, onPress }: { playlist: Playlist; onPress: () => void }) {
  const { colors, typography } = useTheme();
  const hue = (playlist.id.charCodeAt(1) * 61) % 360;
  const bg = `hsl(${hue}, 30%, 25%)`;

  return (
    <TouchableOpacity
      style={[styles.playlistCard, { width: PLAYLIST_CARD_W }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Artwork */}
      <View style={[styles.playlistArtwork, { backgroundColor: bg, width: PLAYLIST_CARD_W, height: PLAYLIST_CARD_W }]}>
        {playlist.artworkUrl
          ? <Image source={{ uri: playlist.artworkUrl }} style={StyleSheet.absoluteFillObject} borderRadius={BorderRadius.lg} />
          : (
            <View style={styles.playlistArtworkInner}>
              {/* Four quadrant squares mimicking playlist grid */}
              {[0, 1, 2, 3].map((i) => {
                const qHue = (hue + i * 40) % 360;
                return (
                  <View key={i} style={[styles.playlistQuadrant, { backgroundColor: `hsl(${qHue},35%,32%)` }]} />
                );
              })}
            </View>
          )
        }
        {/* Play button overlay */}
        <View style={[styles.playlistPlayBtn, { backgroundColor: colors.brand }]}>
          <PlayIcon color={colors.textOnBrand} />
        </View>
      </View>

      <Text style={[typography.labelLg, { color: colors.textPrimary, marginTop: Spacing[2] }]} numberOfLines={1}>
        {playlist.name}
      </Text>
      {playlist.description ? (
        <Text style={[typography.labelSm, { color: colors.textSecondary }]} numberOfLines={1}>
          {playlist.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[typography.h2, { color: colors.textPrimary }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[typography.labelMd, { color: colors.brand }]}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function getUserFirstName(displayName: string | null, email: string | null | undefined): string {
  if (displayName && displayName.trim()) {
    return displayName.trim().split(' ')[0] ?? displayName.trim();
  }
  if (email) return email.split('@')[0] ?? 'there';
  return 'there';
}

// ── Playlist detail modal-ish screen would be a separate route.
// For now tapping a playlist navigates to Library tab. This will be
// a proper PlaylistDetailScreen in the next iteration.
// ─────────────────────────────────────────────────────────────────────────────

export function HomeScreen(_props: HomeScreenProps): React.JSX.Element {
  const { colors, typography, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const playSong = usePlayerStore((s) => s.playSong);

  const firstName = getUserFirstName(user?.displayName ?? null, user?.email);

  const handleSongPress = useCallback((song: Song, queue: Song[]) => {
    void playSong(song, queue);
    navigation.navigate(ROUTES.PLAYER);
  }, [playSong, navigation]);

  const handlePlaylistPress = useCallback((_playlist: Playlist) => {
    // Navigate to Library → Playlists tab — full detail screen in Phase 2
    navigation.navigate(ROUTES.LIBRARY);
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gradient header */}
        <LinearGradient
          colors={isDark ? ['#201808', colors.background] : ['#FFF4DC', colors.background]}
          style={styles.gradientHeader}
        >
          <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[typography.displayLg, { color: colors.textPrimary }]}>{firstName}</Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* Recently Played */}
          <View style={styles.section}>
            <SectionHeader title="Recently Played" />
            <View style={styles.songGrid}>
              {RECENTLY_PLAYED.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onPress={() => handleSongPress(song, RECENTLY_PLAYED)}
                />
              ))}
            </View>
          </View>

          {/* Playlists — horizontal scroll */}
          <View style={styles.section}>
            <SectionHeader
              title="Your Playlists"
              onSeeAll={() => navigation.navigate(ROUTES.LIBRARY)}
            />
          </View>
        </View>

        {/* Playlists scroll — full bleed (no horizontal padding so cards touch edges) */}
        <FlatList
          data={PLACEHOLDER_PLAYLISTS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playlistScroll}
          ItemSeparatorComponent={() => <View style={{ width: Spacing[3] }} />}
          renderItem={({ item }) => (
            <PlaylistCard
              playlist={item}
              onPress={() => handlePlaylistPress(item)}
            />
          )}
        />

        {/* Recommended */}
        <View style={styles.body}>
          <View style={styles.section}>
            <SectionHeader title="Recommended" />
            <View style={styles.songGrid}>
              {RECENTLY_PLAYED.map((song, i) => ({
                ...song,
                id: `rec-${i}`,
                title: ['Blinding Lights', 'As It Was', 'Heat Waves', 'Stay'][i] ?? song.title,
                artist: ['The Weeknd', 'Harry Styles', 'Glass Animals', 'The Kid LAROI'][i] ?? song.artist,
              })).map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  onPress={() => handleSongPress(song, RECENTLY_PLAYED)}
                />
              ))}
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4] },
  gradientHeader: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[4], paddingBottom: Spacing[8] },
  body: { paddingHorizontal: Layout.screenPaddingH },
  section: { marginBottom: Spacing[2] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  songGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  songCard: { gap: Spacing[1.5] },
  songArtwork: { borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[1], overflow: 'hidden' },
  artworkLetter: { fontSize: 32, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  // Playlists
  playlistScroll: { paddingHorizontal: Layout.screenPaddingH, paddingBottom: Spacing[6] },
  playlistCard: { gap: Spacing[1] },
  playlistArtwork: { borderRadius: BorderRadius.lg, overflow: 'hidden', alignItems: 'flex-end', justifyContent: 'flex-end', padding: Spacing[2] },
  playlistArtworkInner: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', flexWrap: 'wrap' },
  playlistQuadrant: { width: '50%', height: '50%' },
  playlistPlayBtn: { width: 32, height: 32, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
});