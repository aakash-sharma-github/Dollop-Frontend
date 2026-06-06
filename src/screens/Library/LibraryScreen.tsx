import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@theme/index';
import { Layout, Spacing, BorderRadius } from '@theme/spacing';
import { usePlayerStore } from '@store/playerStore';
import { getLocalTracks, getLocalMusicEnabled, requestMusicPermission } from '@services/local/localMusicService';
import { QUERY_KEYS } from '@constants/index';
import type { Song } from '@app-types/index';
import type { LibraryScreenProps } from '@app-types/navigation';

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill={color}><Path d="M6 4.75L19.5 12L6 19.25V4.75Z" /></Svg>
);
const MusicIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18V5l12-2v13" />
    <Circle cx="6" cy="18" r="3" />
    <Circle cx="18" cy="16" r="3" />
  </Svg>
);
const FolderIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </Svg>
);

// ── Format duration ───────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// ── Song row ──────────────────────────────────────────────────────────────────
interface SongRowProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  onPress: () => void;
}

function SongRow({ song, index, isPlaying, onPress }: SongRowProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity style={styles.songRow} onPress={onPress} activeOpacity={0.7}>
      {/* Index / playing indicator */}
      <View style={[styles.songIndex, { backgroundColor: isPlaying ? colors.brand + '18' : 'transparent' }]}>
        {isPlaying
          ? <PlayIcon color={colors.brand} />
          : <Text style={[typography.labelMd, { color: colors.textTertiary, fontVariant: ['tabular-nums'] }]}>
            {(index + 1).toString().padStart(2, ' ')}
          </Text>
        }
      </View>

      {/* Artwork placeholder */}
      <View style={[styles.songArtwork, { backgroundColor: `hsl(${(song.id.charCodeAt(6) ?? 0) * 37 % 360},30%,28%)` }]}>
        <MusicIcon color="rgba(255,255,255,0.5)" />
      </View>

      {/* Title + artist */}
      <View style={styles.songMeta}>
        <Text style={[typography.labelLg, { color: isPlaying ? colors.brand : colors.textPrimary }]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={[typography.labelSm, { color: colors.textSecondary }]} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>

      {/* Duration */}
      <Text style={[typography.labelSm, { color: colors.textTertiary, fontVariant: ['tabular-nums'] }]}>
        {formatDuration(song.durationMs)}
      </Text>
    </TouchableOpacity>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
interface TabProps { label: string; active: boolean; onPress: () => void }

function Tab({ label, active, onPress }: TabProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.tab, active && { borderBottomColor: colors.brand, borderBottomWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[typography.labelMd, { color: active ? colors.brand : colors.textTertiary, fontWeight: active ? '600' : '400' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Local music tab ───────────────────────────────────────────────────────────
function LocalMusicTab(): React.JSX.Element {
  const { colors, typography } = useTheme();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playSong = usePlayerStore((s) => s.playSong);

  const { data: tracks, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [QUERY_KEYS.LOCAL_TRACKS],
    queryFn: async () => {
      const enabled = await getLocalMusicEnabled();
      if (!enabled) return null; // null = not enabled
      return getLocalTracks();
    },
    staleTime: 1000 * 60 * 5,
  });

  const handleEnableAndRequest = useCallback(async () => {
    const granted = await requestMusicPermission();
    if (granted) {
      const { setLocalMusicEnabled } = await import('@services/local/localMusicService');
      await setLocalMusicEnabled(true);
      await refetch();
    } else {
      Alert.alert('Permission denied', 'Please allow music library access in Settings to use this feature.');
    }
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={[typography.bodyMd, { color: colors.textSecondary, marginTop: Spacing[3] }]}>
          Scanning your music library…
        </Text>
      </View>
    );
  }

  // null means local music is not enabled yet
  if (tracks === null || tracks === undefined) {
    return (
      <View style={styles.centred}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
          <FolderIcon color={colors.textTertiary} />
        </View>
        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: Spacing[4], marginBottom: Spacing[2] }]}>
          Local music is off
        </Text>
        <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing[6] }]}>
          Enable local music to listen to tracks stored on your device — no internet needed.
        </Text>
        <TouchableOpacity
          style={[styles.enableBtn, { backgroundColor: colors.brand }]}
          onPress={() => void handleEnableAndRequest()}
          activeOpacity={0.8}
        >
          <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>
            Enable Local Music
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centred}>
        <Text style={[typography.bodyMd, { color: colors.error }]}>Failed to load local tracks.</Text>
        <TouchableOpacity onPress={() => void refetch()} style={{ marginTop: Spacing[4] }}>
          <Text style={[typography.labelLg, { color: colors.brand }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (tracks.length === 0) {
    return (
      <View style={styles.centred}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
          <MusicIcon color={colors.textTertiary} />
        </View>
        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: Spacing[4], marginBottom: Spacing[2] }]}>
          No music found
        </Text>
        <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center' }]}>
          No audio files were found on your device. Add music files and pull to refresh.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <SongRow
          song={item}
          index={index}
          isPlaying={currentSong?.id === item.id}
          onPress={() => void playSong(item, tracks)}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brand} />
      }
      ListHeaderComponent={
        <Text style={[typography.labelSm, { color: colors.textTertiary, marginBottom: Spacing[4] }]}>
          {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} on this device
        </Text>
      }
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
    />
  );
}

// ── Playlists tab (Phase 2 stub) ───────────────────────────────────────────────
function PlaylistsTab(): React.JSX.Element {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.centred}>
      <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>
        Your playlists will appear here.
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
type LibTab = 'local' | 'playlists';

export function LibraryScreen(_props: LibraryScreenProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const [activeTab, setActiveTab] = useState<LibTab>('local');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Library</Text>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Tab label="On this device" active={activeTab === 'local'} onPress={() => setActiveTab('local')} />
        <Tab label="Playlists" active={activeTab === 'playlists'} onPress={() => setActiveTab('playlists')} />
      </View>

      <View style={styles.content}>
        {activeTab === 'local' ? <LocalMusicTab /> : <PlaylistsTab />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[6], paddingBottom: Spacing[2] },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Layout.screenPaddingH },
  tab: { paddingVertical: Spacing[3], marginRight: Spacing[6], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  content: { flex: 1 },
  listContent: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[4], paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4] },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Layout.screenPaddingH, gap: 0 },
  emptyIcon: { width: 72, height: 72, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  enableBtn: { borderRadius: BorderRadius.lg, paddingHorizontal: Spacing[8], height: Layout.touchTarget + 8, alignItems: 'center', justifyContent: 'center' },
  songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[2.5], gap: Spacing[3] },
  songIndex: { width: 32, height: 32, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  songArtwork: { width: Layout.artworkSm, height: Layout.artworkSm, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  songMeta: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 32 + Spacing[3] + Layout.artworkSm + Spacing[3] },
});