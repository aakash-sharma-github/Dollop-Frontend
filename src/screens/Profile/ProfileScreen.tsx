import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { Layout, Spacing, BorderRadius } from '@theme/spacing';
import { useAuthStore } from '@store/authStore';
import { APP_VERSION } from '@utils/version';
import { ROUTES } from '@constants/index';
import type { ProfileScreenProps } from '@app-types/navigation';

function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </Svg>
  );
}

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

export function ProfileScreen({ navigation }: ProfileScreenProps): React.JSX.Element {
  const { colors, typography } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.container}>

        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>Profile</Text>
        </View>

        {/* Avatar + user info */}
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
            <Text style={[typography.h1, { color: colors.textOnBrand }]}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[typography.h3, { color: colors.textPrimary }]} numberOfLines={1}>
              {user?.displayName ?? 'Set a display name'}
            </Text>
            <Text style={[typography.bodySm, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
            <Text style={[typography.labelSm, { color: colors.textTertiary, marginTop: Spacing[1] }]}>
              via {user?.provider === 'google' ? 'Google' : 'Magic Link'}
            </Text>
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
              <Text style={[typography.labelXs, { color: colors.textTertiary, textAlign: 'center' }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menu rows */}
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate(ROUTES.SETTINGS)}
            activeOpacity={0.7}
          >
            <Text style={[typography.bodyMd, { color: colors.textPrimary }]}>Settings</Text>
            <ChevronRight color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <Text style={[typography.labelXs, { color: colors.textTertiary, textAlign: 'center', marginBottom: Spacing[4] }]}>
          {APP_VERSION.display}
        </Text>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.error }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={[typography.labelLg, { color: colors.error, fontWeight: '600' }]}>
            Sign out
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Layout.screenPaddingH,
    paddingTop: Spacing[6],
    paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[8],
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    marginBottom: Spacing[8],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1, gap: Spacing[0.5] },
  statsRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginBottom: Spacing[6],
  },
  stat: { flex: 1, alignItems: 'center', gap: Spacing[1] },
  menuCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spacer: { flex: 1 },
  signOutBtn: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    height: Layout.touchTarget + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});