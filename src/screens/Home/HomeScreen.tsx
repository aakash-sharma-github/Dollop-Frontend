import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@theme/index';
import { Spacing, Layout, BorderRadius } from '@theme/spacing';
import { useAuthStore } from '@store/authStore';
import { usePlayerStore } from '@store/playerStore';
import type { Song } from '@app-types/index';
import type { HomeScreenProps } from '@app-types/navigation';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Layout.screenPaddingH * 2 - Spacing[3]) / 2;

const PLACEHOLDER_SONGS: Song[] = [
  { id: '1', title: 'Golden Hour', artist: 'JVKE', album: 'this is what ____ feels like', durationMs: 209000, externalId: 'e1', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '2', title: 'Ceilings', artist: 'Lizzy McAlpine', album: 'five seconds flat', durationMs: 185000, externalId: 'e2', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '3', title: 'Lavender Haze', artist: 'Taylor Swift', album: 'Midnights', durationMs: 202000, externalId: 'e3', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '4', title: 'Escapism.', artist: 'RAYE', album: 'My 21st Century Blues', durationMs: 220000, externalId: 'e4', provider: 'placeholder', artworkUrl: null, previewUrl: null },
];

const RECOMMENDED_SONGS: Song[] = [
  { id: '5', title: 'Fast Car', artist: 'Luke Combs', album: "Gettin' Old", durationMs: 254000, externalId: 'e5', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '6', title: 'Sunflower', artist: 'Post Malone', album: 'Spider-Verse', durationMs: 158000, externalId: 'e6', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '7', title: 'Watermelon Sugar', artist: 'Harry Styles', album: 'Fine Line', durationMs: 174000, externalId: 'e7', provider: 'placeholder', artworkUrl: null, previewUrl: null },
  { id: '8', title: 'drivers license', artist: 'Olivia Rodrigo', album: 'SOUR', durationMs: 242000, externalId: 'e8', provider: 'placeholder', artworkUrl: null, previewUrl: null },
];

function SongCard({ song, onPress }: { song: Song; onPress: (s: Song) => void }) {
  const { colors, typography } = useTheme();
  const hue = (song.id.charCodeAt(0) * 47) % 360;
  const bg = `hsl(${hue}, 35%, 28%)`;
  return (
    <TouchableOpacity style={{ width: CARD_W, gap: Spacing[1.5] }} onPress={() => onPress(song)} activeOpacity={0.75}>
      <View style={[styles.artwork, { backgroundColor: bg, width: CARD_W, height: CARD_W }]}>
        {song.artworkUrl
          ? <Image source={{ uri: song.artworkUrl }} style={StyleSheet.absoluteFillObject} />
          : <Text style={styles.artworkLetter}>{song.title.charAt(0)}</Text>
        }
      </View>
      <Text style={[typography.labelMd, { color: colors.textPrimary }]} numberOfLines={1}>{song.title}</Text>
      <Text style={[typography.labelSm, { color: colors.textSecondary }]} numberOfLines={1}>{song.artist}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { colors, typography } = useTheme();
  return <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: Spacing[4] }]}>{title}</Text>;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export function HomeScreen(_props: HomeScreenProps): React.JSX.Element {
  const { colors, typography, isDark } = useTheme();
  const user = useAuthStore((s) => s.user);
  const playSong = usePlayerStore((s) => s.playSong);
  const name = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header gradient */}
        <LinearGradient
          colors={isDark ? ['#201808', colors.background] : ['#FFF4DC', colors.background]}
          style={styles.headerGradient}
        >
          <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[typography.displayLg, { color: colors.textPrimary }]}>{name}</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.section}>
            <SectionHeader title="Recently Played" />
            <View style={styles.grid}>
              {PLACEHOLDER_SONGS.map((s) => (
                <SongCard key={s.id} song={s} onPress={(song) => void playSong(song, PLACEHOLDER_SONGS)} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Recommended" />
            <View style={styles.grid}>
              {RECOMMENDED_SONGS.map((s) => (
                <SongCard key={s.id} song={s} onPress={(song) => void playSong(song, RECOMMENDED_SONGS)} />
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
  scroll: { paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4] },
  headerGradient: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[4], paddingBottom: Spacing[8] },
  content: { paddingHorizontal: Layout.screenPaddingH },
  section: { marginBottom: Layout.sectionSpacing },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  artwork: { borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  artworkLetter: { fontSize: 32, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
});
