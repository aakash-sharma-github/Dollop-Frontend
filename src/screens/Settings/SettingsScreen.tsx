import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Switch,
    ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@theme/index';
import { Spacing, Layout, BorderRadius } from '@theme/spacing';
import {
    getLocalMusicEnabled, setLocalMusicEnabled,
    requestMusicPermission, getMusicPermissionStatus,
} from '@services/local/localMusicService';
import { QUERY_KEYS, ROUTES } from '@constants/index';
import { APP_VERSION } from '@utils/version';
import type { SettingsScreenProps } from '@app-types/navigation';

function BackIcon({ color }: { color: string }) {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M19 12H5M12 5l-7 7 7 7" />
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

// ── Row components ────────────────────────────────────────────────────────────
interface RowProps {
    label: string;
    description?: string;
    onPress?: () => void;
    right?: React.ReactNode;
    last?: boolean;
}

function SettingsRow({ label, description, onPress, right, last }: RowProps): React.JSX.Element {
    const { colors, typography } = useTheme();
    return (
        <TouchableOpacity
            style={[
                styles.row,
                { borderBottomColor: colors.border, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
            ]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.rowLeft}>
                <Text style={[typography.bodyMd, { color: colors.textPrimary }]}>{label}</Text>
                {description ? (
                    <Text style={[typography.labelSm, { color: colors.textTertiary, marginTop: 2 }]}>
                        {description}
                    </Text>
                ) : null}
            </View>
            {right ?? (onPress && <ChevronRight color={colors.textTertiary} />)}
        </TouchableOpacity>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
    const { colors, typography } = useTheme();
    return (
        <View style={styles.section}>
            <Text style={[typography.labelSm, styles.sectionLabel, { color: colors.textTertiary }]}>
                {title.toUpperCase()}
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {children}
            </View>
        </View>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function SettingsScreen({ navigation }: SettingsScreenProps): React.JSX.Element {
    const { colors, typography } = useTheme();
    const queryClient = useQueryClient();

    const [localEnabled, setLocalEnabled] = useState(false);
    const [localLoading, setLocalLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

    useEffect(() => {
        void (async () => {
            const [enabled, status] = await Promise.all([
                getLocalMusicEnabled(),
                getMusicPermissionStatus(),
            ]);
            setLocalEnabled(enabled);
            setPermissionStatus(status);
            setLocalLoading(false);
        })();
    }, []);

    const handleLocalMusicToggle = useCallback(async (value: boolean) => {
        if (value) {
            // Enabling — check/request permission first
            if (permissionStatus === 'denied') {
                Alert.alert(
                    'Permission required',
                    'Music library access was denied. Please enable it in your device Settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
                    ],
                );
                return;
            }

            if (permissionStatus !== 'granted') {
                const granted = await requestMusicPermission();
                if (!granted) {
                    Alert.alert('Permission denied', 'Dollop needs access to your music library.');
                    return;
                }
                setPermissionStatus('granted');
            }
        }

        // Persist the new value
        await setLocalMusicEnabled(value);
        setLocalEnabled(value);

        // KEY FIX: Invalidate the React Query cache so LibraryScreen re-fetches
        // immediately when the user navigates back. Without this, the query still
        // returns the old null result for up to 5 minutes (staleTime).
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LOCAL_TRACKS] });
    }, [permissionStatus, queryClient]);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <BackIcon color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[typography.h3, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
                    Settings
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Music Library */}
                <Section title="Music Library">
                    <SettingsRow
                        label="Local Music"
                        description={
                            localLoading ? 'Loading…'
                                : localEnabled ? 'Showing tracks from this device'
                                    : 'Show music stored on this device'
                        }
                        right={
                            localLoading ? (
                                <ActivityIndicator size="small" color={colors.brand} />
                            ) : (
                                <Switch
                                    value={localEnabled}
                                    onValueChange={(v) => void handleLocalMusicToggle(v)}
                                    trackColor={{ false: colors.border, true: colors.brand }}
                                    thumbColor={colors.surface}
                                    ios_backgroundColor={colors.border}
                                />
                            )
                        }
                    />
                    {localEnabled && permissionStatus === 'granted' && (
                        <SettingsRow
                            label="Refresh Library"
                            description="Re-scan device for new audio files"
                            last
                            onPress={() => {
                                void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LOCAL_TRACKS] });
                                Alert.alert('Refreshing', 'Your local music library is being updated.');
                            }}
                        />
                    )}
                </Section>

                {/* Legal */}
                <Section title="Legal">
                    <SettingsRow
                        label="Privacy Policy"
                        onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
                    />
                    <SettingsRow
                        label="Terms & Conditions"
                        onPress={() => navigation.navigate(ROUTES.TERMS_CONDITIONS)}
                        last
                    />
                </Section>

                {/* About */}
                <Section title="About">
                    <SettingsRow
                        label="Version"
                        last
                        right={
                            <Text style={[typography.labelMd, { color: colors.textTertiary }]}>
                                {APP_VERSION.display}
                            </Text>
                        }
                    />
                </Section>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Layout.screenPaddingH,
        paddingVertical: Spacing[4],
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    content: {
        paddingTop: Spacing[6],
        paddingBottom: Spacing[20],
        paddingHorizontal: Layout.screenPaddingH,
    },
    section: { marginBottom: Spacing[8] },
    sectionLabel: { letterSpacing: 0.8, marginBottom: Spacing[2], marginLeft: Spacing[1] },
    card: { borderRadius: BorderRadius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[4],
    },
    rowLeft: { flex: 1, marginRight: Spacing[4] },
});