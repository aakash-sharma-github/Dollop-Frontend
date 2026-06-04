import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme/index';
import { Layout, Spacing, BorderRadius } from '@theme/spacing';
import { useAuthStore } from '@store/authStore';
import { APP_VERSION } from '@utils/version';

export function ProfileScreen(): React.JSX.Element {
  const { colors, typography } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.container}>
        <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: Spacing[8] }]}>Profile</Text>

        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
            <Text style={[typography.h1, { color: colors.textOnBrand }]}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[typography.h3, { color: colors.textPrimary }]} numberOfLines={1}>
              {user?.displayName ?? 'Set a display name'}
            </Text>
            <Text style={[typography.bodySm, { color: colors.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
            <Text style={[typography.labelSm, { color: colors.textTertiary, marginTop: Spacing[1] }]}>
              via {user?.provider === 'google' ? 'Google' : 'Magic Link'}
            </Text>
          </View>
        </View>

        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          {[{ label: 'Songs played', value: '—' }, { label: 'Playlists', value: '—' }, { label: 'Hours', value: '—' }].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>{s.value}</Text>
              <Text style={[typography.labelXs, { color: colors.textTertiary, textAlign: 'center' }]}>{s.label}</Text>
            </View>
          ))}
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
          <Text style={[typography.labelLg, { color: colors.error, fontWeight: '600' }]}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[6], paddingBottom: Layout.miniPlayerHeight + Layout.tabBarHeight + Spacing[4] },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4], marginBottom: Spacing[8] },
  avatar: { width: 72, height: 72, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, gap: Spacing[0.5] },
  statsRow: { flexDirection: 'row', borderRadius: BorderRadius.xl, padding: Spacing[5] },
  stat: { flex: 1, alignItems: 'center', gap: Spacing[1] },
  spacer: { flex: 1 },
  signOutBtn: { borderWidth: 1.5, borderRadius: BorderRadius.lg, height: Layout.touchTarget + 8, alignItems: 'center', justifyContent: 'center' },
});
