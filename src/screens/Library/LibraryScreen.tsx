import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme/index';
import { Layout, Spacing } from '@theme/spacing';

export function LibraryScreen(): React.JSX.Element {
  const { colors, typography } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.container}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>Library</Text>
        <Text style={[typography.bodyMd, { color: colors.textSecondary, marginTop: Spacing[2] }]}>
          Full implementation coming in Phase 2.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[6] },
});
