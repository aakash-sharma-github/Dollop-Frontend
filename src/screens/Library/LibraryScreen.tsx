import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, TextInput,
  Modal, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@theme/index';
import { Layout, Spacing, BorderRadius } from '@theme/spacing';
import { usePlayerStore } from '@store/playerStore';
import { useLocalPlaylistStore, type LocalPlaylist } from '@store/localPlaylistStore';
import {
  getLocalTracks, getLocalMusicEnabled, getMusicPermissionStatus,
  requestMusicPermission, setLocalMusicEnabled, runDiagnostics,
} from '@services/local/localMusicService';
import { logger } from '@utils/logger';
import { useConfirmDialog } from '@components/common/ConfirmDialog';
import * as googleDrive from '@services/cloud/googleDrive';
import { QUERY_KEYS } from '@constants/index';
import type { Song } from '@app-types/index';
import type { LibraryScreenProps } from '@app-types/navigation';

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayIcon = ({ c, s = 18 }: { c: string; s?: number }) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" fill={c}><Path d="M6 4.75L19.5 12L6 19.25V4.75Z" /></Svg>
);
const MusicIcon = ({ c }: { c: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18V5l12-2v13" /><Circle cx="6" cy="18" r="3" /><Circle cx="18" cy="16" r="3" />
  </Svg>
);
const PlusIcon = ({ c }: { c: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round">
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);
const SearchIcon = ({ c }: { c: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round">
    <Circle cx="11" cy="11" r="8" /><Path d="M21 21l-4.35-4.35" />
  </Svg>
);
const TrashIcon = ({ c }: { c: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
  </Svg>
);
const ChevronRight = ({ c }: { c: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round">
    <Path d="M9 18l6-6-6-6" />
  </Svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
function artBg(id: string): string {
  return `hsl(${(id.charCodeAt(id.length > 6 ? 6 : 0) * 37) % 360}, 30%, 28%)`;
}

// ── Song row ──────────────────────────────────────────────────────────────────
const ROW_H = 68;

const SongRow = memo(function SongRow({
  song, index, isPlaying, onPress, onLongPress,
}: { song: Song; index: number; isPlaying: boolean; onPress: () => void; onLongPress?: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity style={[styles.songRow, { height: ROW_H }]} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <View style={styles.indexWrap}>
        {isPlaying
          ? <PlayIcon c={colors.brand} s={16} />
          : <Text style={[typography.labelSm, { color: colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{index + 1}</Text>
        }
      </View>
      <View style={[styles.artWrap, { backgroundColor: artBg(song.id) }]}>
        {song.artworkUrl
          ? <Image source={{ uri: song.artworkUrl }} style={styles.artImg} contentFit="cover" transition={200} />
          : <MusicIcon c="rgba(255,255,255,0.45)" />
        }
      </View>
      <View style={styles.songMeta}>
        <Text style={[typography.labelLg, { color: isPlaying ? colors.brand : colors.textPrimary }]} numberOfLines={1}>{song.title}</Text>
        <Text style={[typography.labelSm, { color: colors.textSecondary }]} numberOfLines={1}>
          {song.artist}{song.album ? ` · ${song.album}` : ''}
        </Text>
      </View>
      <Text style={[typography.labelSm, { color: colors.textTertiary, fontVariant: ['tabular-nums'] }]}>{fmt(song.durationMs)}</Text>
    </TouchableOpacity>
  );
});

// ── Cross-platform text input modal ───────────────────────────────────────────
// Alert.prompt is iOS-only. This works on Android too.
interface TextInputModalProps {
  visible: boolean;
  title: string;
  placeholder: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}

function TextInputModal({ visible, title, placeholder, onCancel, onSubmit }: TextInputModalProps) {
  const { colors, typography } = useTheme();
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Delay focus so the modal animation finishes first — required on Android
  useEffect(() => {
    if (visible) {
      setValue('');
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: Spacing[4] }]}>{title}</Text>

          <View style={[styles.modalInput, { borderColor: colors.brand, backgroundColor: colors.surfaceElevated }]}>
            <TextInput
              ref={inputRef}
              style={[typography.bodyMd, { color: colors.textPrimary, paddingVertical: 0, flex: 1 }]}
              placeholder={placeholder}
              placeholderTextColor={colors.textTertiary}
              value={value}
              onChangeText={setValue}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              // Android-specific: ensure keyboard shows
              autoFocus={Platform.OS === 'ios'}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setValue(''); onCancel(); }}>
              <Text style={[typography.labelLg, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.brand, borderColor: colors.brand }]}
              onPress={handleSubmit}
            >
              <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Add-to-playlist sheet ─────────────────────────────────────────────────────
interface AddSheetProps { visible: boolean; song: Song | null; onClose: () => void }

function AddToPlaylistSheet({ visible, song, onClose }: AddSheetProps) {
  const { colors, typography } = useTheme();
  const { playlists, addSong, createPlaylist } = useLocalPlaylistStore();
  const [showCreate, setShowCreate] = useState(false);

  const handleAdd = async (id: string) => {
    if (!song) return;
    await addSong(id, song);
    Alert.alert('Added', `"${song.title}" added to playlist`);
    onClose();
  };

  const handleCreate = async (name: string) => {
    if (!song) return;
    const pl = await createPlaylist(name);
    await addSong(pl.id, song);
    Alert.alert('Done', `Added to "${pl.name}"`);
    setShowCreate(false);
    onClose();
  };

  return (
    <>
      <Modal visible={visible && !showCreate} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.sheetOverlay} onPress={onClose} activeOpacity={1}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: Spacing[1] }]}>Add to Playlist</Text>
            {song && <Text style={[typography.bodySm, { color: colors.textSecondary, marginBottom: Spacing[4] }]}>"{song.title}"</Text>}

            <TouchableOpacity style={styles.sheetRow} onPress={() => setShowCreate(true)}>
              <View style={[styles.sheetIcon, { backgroundColor: colors.brand }]}><PlusIcon c={colors.textOnBrand} /></View>
              <Text style={[typography.labelLg, { color: colors.textPrimary }]}>New Playlist</Text>
            </TouchableOpacity>

            {playlists.map((p) => (
              <TouchableOpacity key={p.id} style={styles.sheetRow} onPress={() => void handleAdd(p.id)}>
                <View style={[styles.sheetIcon, { backgroundColor: artBg(p.id) }]}><MusicIcon c="rgba(255,255,255,0.6)" /></View>
                <View>
                  <Text style={[typography.labelLg, { color: colors.textPrimary }]}>{p.name}</Text>
                  <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{p.songs.length} songs</Text>
                </View>
              </TouchableOpacity>
            ))}

            {playlists.length === 0 && (
              <Text style={[typography.bodyMd, { color: colors.textTertiary, textAlign: 'center', paddingVertical: Spacing[4] }]}>
                No playlists yet. Create one above.
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cross-platform name input */}
      <TextInputModal
        visible={showCreate}
        title="New Playlist"
        placeholder="Playlist name"
        onCancel={() => setShowCreate(false)}
        onSubmit={(name) => void handleCreate(name)}
      />
    </>
  );
}

// ── Local tracks tab ──────────────────────────────────────────────────────────
function LocalTracksTab() {
  const { colors, typography } = useTheme();
  const queryClient = useQueryClient();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playSong = usePlayerStore((s) => s.playSong);
  const [q, setQ] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  const { data: tracks, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [QUERY_KEYS.LOCAL_TRACKS],
    queryFn: async () => {
      logger.debug('LibraryScreen', 'queryFn running');
      const enabled = await getLocalMusicEnabled();
      logger.info('LibraryScreen', 'queryFn: localEnabled', { enabled });
      if (!enabled) return null;
      const result = await getLocalTracks();
      logger.info('LibraryScreen', 'queryFn: getLocalTracks returned', { count: result.length });
      return result;
    },
    staleTime: 0,          // Always re-fetch on focus
    gcTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => {
    if (!tracks || !q.trim()) return tracks;
    const lq = q.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(lq) ||
        t.artist.toLowerCase().includes(lq) ||
        (t.album?.toLowerCase().includes(lq) ?? false),
    );
  }, [tracks, q]);

  // Enable local music — full flow with permission + SecureStore + cache invalidation
  const handleEnable = useCallback(async () => {
    setIsEnabling(true);
    try {
      logger.info('LibraryScreen', 'handleEnable: checking permission');
      const currentStatus = await getMusicPermissionStatus();
      logger.info('LibraryScreen', 'handleEnable: current permission', { currentStatus });

      if (currentStatus === 'denied') {
        logger.warn('LibraryScreen', 'handleEnable: permission previously denied — must use device Settings');
        Alert.alert(
          'Permission denied',
          'Music library access was denied. Please enable it in your device Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }

      if (currentStatus !== 'granted') {
        const granted = await requestMusicPermission();
        logger.info('LibraryScreen', 'handleEnable: requestMusicPermission result', { granted });
        if (!granted) {
          Alert.alert('Permission denied', 'Dollop needs access to your music library to show local tracks.');
          return;
        }
      }

      // Permission is granted — save the enabled flag
      logger.debug('LibraryScreen', 'handleEnable: saving enabled flag');
      await setLocalMusicEnabled(true);

      // Run full diagnostics — logs every step of MediaLibrary access so the
      // Debug Log screen shows exactly where things succeed/fail
      await runDiagnostics();

      // Force the query to re-run now. We do both invalidate AND refetch
      // to avoid any race condition with the React Query scheduler.
      logger.debug('LibraryScreen', 'handleEnable: invalidating and refetching');
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LOCAL_TRACKS] });
      const result = await refetch();
      logger.info('LibraryScreen', 'handleEnable: refetch complete', {
        status: result.status,
        songCount: result.data?.length ?? 0,
      });

      if (!result.data || result.data.length === 0) {
        Alert.alert(
          'No songs found',
          'Permission was granted but no audio files were found on your device. ' +
          'Open Settings → Developer → View Debug Logs (filter "LocalMusic") for details on why.',
        );
      }
    } catch (err) {
      logger.error('LibraryScreen', 'handleEnable threw', err);
      Alert.alert('Error', `Failed to enable local music: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEnabling(false);
    }
  }, [queryClient, refetch]);

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: ROW_H, offset: ROW_H * i, index: i }),
    [],
  );
  const keyExtractor = useCallback((item: Song) => item.id, []);
  const renderItem = useCallback(({ item, index }: { item: Song; index: number }) => (
    <SongRow
      song={item}
      index={index}
      isPlaying={currentSong?.id === item.id}
      onPress={() => void playSong(item, filtered ?? [])}
      onLongPress={() => { setSelectedSong(item); setShowSheet(true); }}
    />
  ), [currentSong?.id, filtered, playSong]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) return (
    <View style={styles.centred}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={[typography.bodyMd, { color: colors.textSecondary, marginTop: Spacing[3] }]}>
        Scanning music library…
      </Text>
    </View>
  );

  // ── Not enabled ───────────────────────────────────────────────────────────
  if (tracks === null || tracks === undefined) return (
    <View style={styles.centred}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
        <MusicIcon c={colors.textTertiary} />
      </View>
      <Text style={[typography.h3, { color: colors.textPrimary, marginTop: Spacing[4], marginBottom: Spacing[2] }]}>
        Local music is off
      </Text>
      <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing[6], paddingHorizontal: Spacing[4] }]}>
        Enable to listen to tracks stored on this device — works offline, no internet needed.
      </Text>
      <TouchableOpacity
        style={[styles.enableBtn, { backgroundColor: colors.brand }, isEnabling && { opacity: 0.6 }]}
        onPress={() => void handleEnable()}
        disabled={isEnabling}
        activeOpacity={0.8}
      >
        {isEnabling
          ? <ActivityIndicator color={colors.textOnBrand} />
          : <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>Enable Local Music</Text>
        }
      </TouchableOpacity>
    </View>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <View style={styles.centred}>
      <Text style={[typography.bodyMd, { color: colors.error, textAlign: 'center', marginBottom: Spacing[4] }]}>
        {error instanceof Error ? error.message : 'Failed to load local tracks.'}
      </Text>
      <TouchableOpacity onPress={() => void refetch()}>
        <Text style={[typography.labelLg, { color: colors.brand }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Track list ────────────────────────────────────────────────────────────
  return (
    <>
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <SearchIcon c={colors.textTertiary} />
        <TextInput
          style={[typography.bodyMd, { color: colors.textPrimary, flex: 1, paddingVertical: 0 }]}
          placeholder="Search songs, artists, albums…"
          placeholderTextColor={colors.textTertiary}
          value={q}
          onChangeText={setQ}
          clearButtonMode="while-editing"
        />
      </View>

      <Text style={[typography.labelSm, { color: colors.textTertiary, paddingHorizontal: Layout.screenPaddingH, marginBottom: Spacing[2] }]}>
        {filtered?.length ?? 0} {(filtered?.length ?? 0) === 1 ? 'song' : 'songs'}
        {q ? ` matching "${q}"` : ' on this device'}
      </Text>

      <FlatList
        data={filtered ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        initialNumToRender={15}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.brand}
          />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          q ? (
            <View style={styles.centred}>
              <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>No results for "{q}"</Text>
            </View>
          ) : (
            <View style={styles.centred}>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: Spacing[2] }]}>No songs found</Text>
              <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing[5] }]}>
                Local music is enabled but no audio files were found on this device.
              </Text>
              <TouchableOpacity
                style={[styles.enableBtn, { backgroundColor: colors.brand }]}
                onPress={() => void (async () => {
                  await runDiagnostics();
                  await refetch();
                  Alert.alert('Diagnostics complete', 'Check Settings → Developer → View Debug Logs (filter "LocalMusic") for details.');
                })()}
              >
                <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>
                  Run Diagnostics
                </Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      <AddToPlaylistSheet visible={showSheet} song={selectedSong} onClose={() => setShowSheet(false)} />
    </>
  );
}

// ── Playlist detail ───────────────────────────────────────────────────────────
function PlaylistDetail({ playlist, onBack }: { playlist: LocalPlaylist; onBack: () => void }) {
  const { colors, typography } = useTheme();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playSong = usePlayerStore((s) => s.playSong);
  const playQueue = usePlayerStore((s) => s.playQueue);
  const { removeSong, playlists } = useLocalPlaylistStore();
  const [q, setQ] = useState('');
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const live = playlists.find((p) => p.id === playlist.id) ?? playlist;
  const filtered = useMemo(() => {
    if (!q.trim()) return live.songs;
    const lq = q.toLowerCase();
    return live.songs.filter(
      (s) => s.title.toLowerCase().includes(lq) || s.artist.toLowerCase().includes(lq),
    );
  }, [live.songs, q]);

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: ROW_H, offset: ROW_H * i, index: i }),
    [],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[typography.labelLg, { color: colors.brand }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
          {live.name}
        </Text>
        <TouchableOpacity
          onPress={() => live.songs.length > 0 && void playQueue(live.songs, 0)}
          disabled={live.songs.length === 0}
        >
          <Text style={[typography.labelLg, { color: live.songs.length > 0 ? colors.brand : colors.textTertiary }]}>
            Play all
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <SearchIcon c={colors.textTertiary} />
        <TextInput
          style={[typography.bodyMd, { color: colors.textPrimary, flex: 1, paddingVertical: 0 }]}
          placeholder="Search in playlist…"
          placeholderTextColor={colors.textTertiary}
          value={q}
          onChangeText={setQ}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={10}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            index={index}
            isPlaying={currentSong?.id === item.id}
            onPress={() => void playSong(item, filtered)}
            onLongPress={() => {
              void (async () => {
                const ok = await confirm({
                  title: 'Remove song',
                  message: `Remove "${item.title}" from "${live.name}"?`,
                  confirmLabel: 'Remove',
                  destructive: true,
                });
                if (ok) await removeSong(live.id, item.id);
              })();
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          <View style={styles.centred}>
            <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center' }]}>
              {q ? `No results for "${q}"` : 'No songs yet.\nLong-press a song in "On this device" to add it here.'}
            </Text>
          </View>
        }
      />
      {confirmDialog}
    </View>
  );
}

// ── Playlists tab ─────────────────────────────────────────────────────────────
function PlaylistsTab() {
  const { colors, typography } = useTheme();
  const { playlists, createPlaylist, deletePlaylist, isLoaded, load } = useLocalPlaylistStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<LocalPlaylist | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => { if (!isLoaded) void load(); }, [isLoaded, load]);

  if (selected) {
    return <PlaylistDetail playlist={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.plRow} onPress={() => setSelected(item)} activeOpacity={0.7}>
            <View style={[styles.plThumb, { backgroundColor: artBg(item.id) }]}>
              <MusicIcon c="rgba(255,255,255,0.5)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelLg, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{item.songs.length} songs</Text>
            </View>
            <ChevronRight c={colors.textTertiary} />
            <TouchableOpacity
              onPress={() => {
                void (async () => {
                  const ok = await confirm({
                    title: 'Delete playlist',
                    message: `Delete "${item.name}"? This cannot be undone.`,
                    confirmLabel: 'Delete',
                    destructive: true,
                  });
                  if (ok) await deletePlaylist(item.id);
                })();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ paddingLeft: Spacing[2] }}
            >
              <TrashIcon c={colors.textTertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          <View style={styles.centred}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
              <MusicIcon c={colors.textTertiary} />
            </View>
            <Text style={[typography.h3, { color: colors.textPrimary, marginTop: Spacing[4], marginBottom: Spacing[2] }]}>
              No playlists yet
            </Text>
            <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center' }]}>
              Tap the + button to create your first playlist.
            </Text>
          </View>
        }
      />

      {/* FAB bottom-right */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.brand }]}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
      >
        <PlusIcon c={colors.textOnBrand} />
      </TouchableOpacity>

      <TextInputModal
        visible={showCreate}
        title="New Playlist"
        placeholder="Playlist name"
        onCancel={() => setShowCreate(false)}
        onSubmit={(name) => void createPlaylist(name)}
      />
      {confirmDialog}
    </View>
  );
}

// ── Google Drive tab ──────────────────────────────────────────────────────────
function GoogleDriveTab() {
  const { colors, typography } = useTheme();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playSong = usePlayerStore((s) => s.playSong);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: connected, refetch: refetchConnected } = useQuery({
    queryKey: ['gdrive_connected'],
    queryFn: () => googleDrive.isConnected(),
    staleTime: 0,
  });

  const { data: tracks, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['gdrive_tracks'],
    queryFn: () => googleDrive.listMusicFiles(),
    enabled: !!connected,
    staleTime: 1000 * 60 * 5,
  });

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const ok = await googleDrive.connect();
      logger.info('GoogleDriveTab', 'connect result', { ok });
      if (ok) {
        await refetchConnected();
        await refetch();
      }
    } catch (err) {
      logger.error('GoogleDriveTab', 'connect threw', err);
      Alert.alert('Connection failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [refetchConnected, refetch]);

  const handleDisconnect = useCallback(async () => {
    const ok = await confirm({
      title: 'Disconnect Google Drive',
      message: 'Dollop will no longer be able to play songs from your Drive.',
      confirmLabel: 'Disconnect',
      destructive: true,
    });
    if (!ok) return;
    await googleDrive.disconnect();
    await refetchConnected();
  }, [confirm, refetchConnected]);

  const getItemLayout = useCallback((_: unknown, i: number) => ({ length: ROW_H, offset: ROW_H * i, index: i }), []);

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <View style={styles.centred}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
          <MusicIcon c={colors.textTertiary} />
        </View>
        <Text style={[typography.h3, { color: colors.textPrimary, marginTop: Spacing[4], marginBottom: Spacing[2] }]}>
          Connect Google Drive
        </Text>
        <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing[6], paddingHorizontal: Spacing[4] }]}>
          Stream audio files from a folder named "Dollop Music" in your Google Drive.
        </Text>
        <TouchableOpacity
          style={[styles.enableBtn, { backgroundColor: colors.brand }, isConnecting && { opacity: 0.6 }]}
          onPress={() => void handleConnect()}
          disabled={isConnecting}
          activeOpacity={0.8}
        >
          {isConnecting
            ? <ActivityIndicator color={colors.textOnBrand} />
            : <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>Connect Google Drive</Text>
          }
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) return (
    <View style={styles.centred}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={[typography.bodyMd, { color: colors.textSecondary, marginTop: Spacing[3] }]}>
        Loading from Google Drive…
      </Text>
    </View>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <View style={styles.centred}>
      <Text style={[typography.bodyMd, { color: colors.error, textAlign: 'center', marginBottom: Spacing[4] }]}>
        {error instanceof Error ? error.message : 'Failed to load Google Drive files.'}
      </Text>
      <TouchableOpacity onPress={() => void refetch()} style={{ marginBottom: Spacing[3] }}>
        <Text style={[typography.labelLg, { color: colors.brand }]}>Retry</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => void handleDisconnect()}>
        <Text style={[typography.labelMd, { color: colors.textTertiary }]}>Disconnect</Text>
      </TouchableOpacity>
      {confirmDialog}
    </View>
  );

  return (
    <>
      <View style={styles.gdriveHeader}>
        <Text style={[typography.labelSm, { color: colors.textTertiary }]}>
          {tracks?.length ?? 0} {(tracks?.length ?? 0) === 1 ? 'file' : 'files'} in "Dollop Music"
        </Text>
        <TouchableOpacity onPress={() => void handleDisconnect()}>
          <Text style={[typography.labelSm, { color: colors.error }]}>Disconnect</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={tracks ?? []}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={10}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            index={index}
            isPlaying={currentSong?.id === item.id}
            onPress={() => void playSong(item, tracks ?? [])}
          />
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.brand} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          <View style={styles.centred}>
            <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center' }]}>
              No audio files found.{'\n'}Add files to the "Dollop Music" folder in your Drive and pull to refresh.
            </Text>
          </View>
        }
      />
      {confirmDialog}
    </>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
type LibTab = 'local' | 'gdrive' | 'playlists';

const TAB_LABELS: Record<LibTab, string> = {
  local: 'On this device',
  gdrive: 'Google Drive',
  playlists: 'Playlists',
};

function TabBar({ active, onSelect }: { active: LibTab; onSelect: (t: LibTab) => void }) {
  const { colors, typography } = useTheme();
  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
      {(['local', 'gdrive', 'playlists'] as LibTab[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, active === tab && { borderBottomColor: colors.brand, borderBottomWidth: 2 }]}
          onPress={() => onSelect(tab)}
          activeOpacity={0.7}
        >
          <Text style={[typography.labelMd, {
            color: active === tab ? colors.brand : colors.textTertiary,
            fontWeight: active === tab ? '600' : '400',
          }]} numberOfLines={1}>
            {TAB_LABELS[tab]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function LibraryScreen(_props: LibraryScreenProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const [activeTab, setActiveTab] = useState<LibTab>('local');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Library</Text>
      </View>
      <TabBar active={activeTab} onSelect={setActiveTab} />
      <View style={{ flex: 1 }}>
        {activeTab === 'local' && <LocalTracksTab />}
        {activeTab === 'gdrive' && <GoogleDriveTab />}
        {activeTab === 'playlists' && <PlaylistsTab />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[6], paddingBottom: Spacing[2] },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: Layout.screenPaddingH },
  tab: { paddingVertical: Spacing[3], marginRight: Spacing[5], borderBottomWidth: 2, borderBottomColor: 'transparent' },
  gdriveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Layout.screenPaddingH, paddingVertical: Spacing[3] },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    marginHorizontal: Layout.screenPaddingH, marginVertical: Spacing[3],
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2.5],
    borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  listContent: {
    paddingHorizontal: Layout.screenPaddingH,
    paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4],
    flexGrow: 1,
  },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Layout.screenPaddingH, paddingTop: Spacing[16] },
  emptyIcon: { width: 72, height: 72, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  enableBtn: { borderRadius: BorderRadius.lg, paddingHorizontal: Spacing[8], height: Layout.touchTarget + 8, alignItems: 'center', justifyContent: 'center', minWidth: 200 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  indexWrap: { width: 28, alignItems: 'center' },
  artWrap: { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  artImg: { width: 48, height: 48 },
  songMeta: { flex: 1 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 28 + Spacing[3] + 48 + Spacing[3] },
  plRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[3] },
  plThumb: { width: 56, height: 56, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.screenPaddingH, paddingVertical: Spacing[4], borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing[2] },
  fab: {
    position: 'absolute', bottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4],
    right: Layout.screenPaddingH, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: Spacing[6] },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: BorderRadius['2xl'], borderWidth: 1, padding: Spacing[6] },
  modalInput: { borderRadius: BorderRadius.lg, borderWidth: 1.5, paddingHorizontal: Spacing[4], paddingVertical: Platform.OS === 'android' ? Spacing[3] : Spacing[3], marginBottom: Spacing[5], minHeight: 52 },
  modalBtns: { flexDirection: 'row', gap: Spacing[3] },
  modalBtn: { flex: 1, height: Layout.touchTarget + 4, borderRadius: BorderRadius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], borderWidth: StyleSheet.hairlineWidth, padding: Spacing[6], paddingBottom: Spacing[12] },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[3] },
  sheetIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
});