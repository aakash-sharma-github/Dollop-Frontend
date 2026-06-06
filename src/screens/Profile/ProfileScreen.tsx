import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { Layout, Spacing, BorderRadius } from '@theme/spacing';
import { useAuthStore } from '@store/authStore';
import { useThemeStore, type ThemePreference } from '@store/themeStore';
import { APP_VERSION } from '@utils/version';
import { ROUTES } from '@constants/index';
import type { ProfileScreenProps } from '@app-types/navigation';

// ── Icons ─────────────────────────────────────────────────────────────────────
// function SettingsIcon({ color }: { color: string }) {
//   return (
//     <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
//       <Circle cx="12" cy="12" r="3" />
//       <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
//     </Svg>
//   );
// }

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getUserDisplayName(displayName: string | null, email: string | null | undefined): string {
  if (displayName && displayName.trim().length > 0) return displayName.trim();
  if (email) {
    // Use the part before @ as username, capitalised
    const local = email.split('@')[0] ?? email;
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return 'Dollop User';
}

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

// ── Avatar ────────────────────────────────────────────────────────────────────
interface AvatarProps { name: string; avatarUrl: string | null; size?: number }

function Avatar({ name, avatarUrl, size = 72 }: AvatarProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const initials = getInitials(name);
  const [imgError, setImgError] = React.useState(false);

  const showImage = avatarUrl && !imgError;

  return (
    <View style={[
      styles.avatarContainer,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand },
    ]}>
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={[
          typography.h1,
          { color: colors.textOnBrand, fontSize: size * 0.36 },
        ]}>
          {initials || '?'}
        </Text>
      )}
    </View>
  );
}

// ── Theme option pill ─────────────────────────────────────────────────────────
interface ThemeOptionProps {
  label: string; icon: string; value: ThemePreference;
  current: ThemePreference; onPress: (v: ThemePreference) => void;
}

function ThemeOption({ label, icon, value, current, onPress }: ThemeOptionProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const isActive = current === value;
  return (
    <TouchableOpacity
      style={[
        styles.themeOption,
        { backgroundColor: isActive ? colors.brand : colors.surfaceElevated, borderColor: isActive ? colors.brand : colors.border },
      ]}
      onPress={() => onPress(value)}
      activeOpacity={0.75}
    >
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[typography.labelSm, { color: isActive ? colors.textOnBrand : colors.textSecondary, marginTop: 4 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[typography.labelSm, styles.sectionTitle, { color: colors.textTertiary }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

interface MenuRowProps { label: string; onPress?: () => void; right?: React.ReactNode; last?: boolean }

function MenuRow({ label, onPress, right, last }: MenuRowProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.menuRow, { borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={[typography.bodyMd, { color: colors.textPrimary }]}>{label}</Text>
      {right ?? (onPress && <ChevronRight color={colors.textTertiary} />)}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function ProfileScreen({ navigation }: ProfileScreenProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const user = useAuthStore((s) => s.user);
  const isOffline = useAuthStore((s) => s.isOffline);
  const signOut = useAuthStore((s) => s.signOut);
  const { preference, setPreference } = useThemeStore();

  const displayName = getUserDisplayName(user?.displayName ?? null, user?.email);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Profile</Text>
        </View>

        {/* Offline chip */}
        {isOffline && (
          <View style={[styles.offlineChip, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '40' }]}>
            <Text style={[typography.labelSm, { color: colors.warning }]}>
              Offline — streaming unavailable
            </Text>
          </View>
        )}

        {/* Avatar + info */}
        <View style={styles.avatarRow}>
          <Avatar name={displayName} avatarUrl={user?.avatarUrl ?? null} size={80} />
          <View style={styles.userInfo}>
            <Text style={[typography.h2, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[typography.bodySm, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
            <View style={[styles.providerBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={[typography.labelXs, { color: colors.textTertiary }]}>
                {user?.provider === 'google' ? '🔵 Google' : '✉️ Magic Link'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          {[
            { label: 'Songs played', value: '—' },
            { label: 'Playlists', value: '—' },
            { label: 'Hours', value: '—' },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[typography.labelXs, { color: colors.textTertiary, textAlign: 'center' }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Appearance */}
        <Section title="Appearance">
          <View style={styles.themeRow}>
            <ThemeOption label="System" icon="⚙️" value="system" current={preference} onPress={(v) => void setPreference(v)} />
            <ThemeOption label="Light" icon="☀️" value="light" current={preference} onPress={(v) => void setPreference(v)} />
            <ThemeOption label="Dark" icon="🌙" value="dark" current={preference} onPress={(v) => void setPreference(v)} />
          </View>
        </Section>

        {/* Links */}
        <Section title="More">
          <MenuRow label="Settings" onPress={() => navigation.navigate(ROUTES.SETTINGS)} />
        </Section>

        <View style={styles.spacer} />

        <Text style={[typography.labelXs, { color: colors.textTertiary, textAlign: 'center', marginBottom: Spacing[4] }]}>
          {APP_VERSION.display}
        </Text>

        <TouchableOpacity style={[styles.signOutBtn, { borderColor: colors.error }]} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={[typography.labelLg, { color: colors.error, fontWeight: '600' }]}>Sign out</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[6], paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[4] },
  settingsBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  offlineChip: { borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], alignSelf: 'flex-start', marginBottom: Spacing[4] },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4], marginBottom: Spacing[6] },
  avatarContainer: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  userInfo: { flex: 1, gap: Spacing[1] },
  providerBadge: { alignSelf: 'flex-start', borderRadius: BorderRadius.full, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing[2], paddingVertical: 3, marginTop: Spacing[1] },
  statsRow: { flexDirection: 'row', borderRadius: BorderRadius.xl, padding: Spacing[5], marginBottom: Spacing[5] },
  stat: { flex: 1, alignItems: 'center', gap: Spacing[1] },
  section: { marginBottom: Spacing[4] },
  sectionTitle: { letterSpacing: 0.8, marginBottom: Spacing[2], marginLeft: Spacing[1] },
  sectionCard: { borderRadius: BorderRadius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  themeRow: { flexDirection: 'row', gap: Spacing[2], padding: Spacing[3] },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing[3], borderRadius: BorderRadius.lg, borderWidth: 1.5, gap: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[4] },
  spacer: { flex: 1 },
  signOutBtn: { borderWidth: 1.5, borderRadius: BorderRadius.lg, height: Layout.touchTarget + 8, alignItems: 'center', justifyContent: 'center' },
});