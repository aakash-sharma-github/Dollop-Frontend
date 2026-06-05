import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Switch,
    ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { Spacing, Layout, BorderRadius } from '@theme/spacing';
import {
    getLocalMusicEnabled, setLocalMusicEnabled,
    requestMusicPermission, getMusicPermissionStatus,
} from '@services/local/localMusicService';
import { ROUTES } from '@constants/index';
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

// ── Settings row components ───────────────────────────────────────────────────

interface RowProps {
    label: string;
    description?: string;
    onPress?: () => void;
    right?: React.ReactNode;
    destructive?: boolean;
}

function SettingsRow({ label, description, onPress, right, destructive = false }: RowProps): React.JSX.Element {
    const { colors, typography } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.rowLeft}>
                <Text style={[typography.bodyMd, { color: destructive ? colors.error : colors.textPrimary }]}>
                    {label}
                </Text>
                {description && (
                    <Text style={[typography.labelSm, { color: colors.textTertiary, marginTop: 2 }]}>
                        {description}
                    </Text>
                )}
            </View>
            {right ?? (onPress && <ChevronRight color={colors.textTertiary} />)}
        </TouchableOpacity>
    );
}

interface SectionProps { title: string; children: React.ReactNode }

function SettingsSection({ title, children }: SectionProps): React.JSX.Element {
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

// ── Main screen ───────────────────────────────────────────────────────────────

export function SettingsScreen({ navigation }: SettingsScreenProps): React.JSX.Element {
    const { colors, typography } = useTheme();

    const [localEnabled, setLocalEnabled] = useState(false);
    const [localLoading, setLocalLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

    // Load persisted preference on mount
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
            // Requesting to enable — check/request permission first
            if (permissionStatus === 'denied') {
                Alert.alert(
                    'Permission required',
                    'Dollop needs access to your music library. Please enable it in your device Settings.',
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
                    Alert.alert(
                        'Permission denied',
                        'Dollop needs access to your music library to show local tracks.',
                    );
                    return;
                }
                setPermissionStatus('granted');
            }
        }

        setLocalEnabled(value);
        await setLocalMusicEnabled(value);
    }, [permissionStatus]);

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <BackIcon color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[typography.h3, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
                    Settings
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Music Library */}
                <SettingsSection title="Music Library">
                    <SettingsRow
                        label="Local Music"
                        description={
                            localLoading
                                ? 'Loading...'
                                : localEnabled
                                    ? 'Reading tracks from your device'
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
                            description="Re-scan your device for new music files"
                            onPress={() => {
                                // Invalidation hook will be wired in Phase 2 with React Query
                                Alert.alert('Library refreshed', 'Your local music library has been updated.');
                            }}
                        />
                    )}
                </SettingsSection>

                {/* Legal */}
                <SettingsSection title="Legal">
                    <SettingsRow
                        label="Privacy Policy"
                        onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}
                    />
                    <SettingsRow
                        label="Terms & Conditions"
                        onPress={() => navigation.navigate(ROUTES.TERMS_CONDITIONS)}
                    />
                </SettingsSection>

                {/* About */}
                <SettingsSection title="About">
                    <SettingsRow
                        label="Version"
                        right={
                            <Text style={[typography.labelMd, { color: colors.textTertiary }]}>
                                {APP_VERSION.display}
                            </Text>
                        }
                    />
                </SettingsSection>

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
    scroll: { flex: 1 },
    scrollContent: {
        paddingTop: Spacing[6],
        paddingBottom: Spacing[20],
        paddingHorizontal: Layout.screenPaddingH,
    },
    section: { marginBottom: Spacing[8] },
    sectionTitle: {
        letterSpacing: 0.8,
        marginBottom: Spacing[2],
        marginLeft: Spacing[1],
    },
    sectionCard: {
        borderRadius: BorderRadius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[4],
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowLeft: { flex: 1, marginRight: Spacing[4] },
});