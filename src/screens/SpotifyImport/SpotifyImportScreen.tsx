/**
 * SpotifyImportScreen — restricted-access feature.
 *
 * ACCESS GATE: only visible/usable when the signed-in user's email is
 * exactly 'aakashrockers1@gmail.com' (checked in ProfileScreen before
 * navigating here, AND re-checked here as a safety net).
 *
 * CURRENT STATUS: UI gating + paste-link input only, per explicit
 * instruction to hold the download/storage implementation until the
 * audio-sourcing approach is clarified. See the in-screen notice below
 * for why "download the songs" is not technically straightforward:
 *
 *   - Spotify's Web API does not provide raw audio downloads to third-party
 *     apps (this would violate Spotify's Developer Terms regardless of
 *     implementation).
 *   - "Download and store in Drive" would need to mean one of:
 *       (a) Store track METADATA (title/artist/album/art) + a Jamendo match
 *           audio file (if found) — legal, but not "the Spotify song"
 *       (b) Use a third-party audio-download service for the matched track
 *           — legal/quality varies by source, needs explicit selection
 *   - Until you confirm which of these (or another approach) you want,
 *     this screen only parses the link and shows what WOULD be imported
 *     as metadata (reusing the existing spotifyImport.ts groundwork).
 */
import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@theme/index";
import { Spacing, Layout, BorderRadius } from "@theme/spacing";
import { useAuthStore } from "@store/authStore";
import {
    parseSpotifyLink,
    importSpotifyTrack,
    importSpotifyPlaylist,
    type ImportedTrack,
} from "@services/cloud/spotifyImport";
import { logger } from "@utils/logger";

export const SPOTIFY_IMPORT_ALLOWED_EMAIL = "aakashrockers1@gmail.com";

function BackIcon({ color }: { color: string }) {
    return (
        <Svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <Path d="M19 12H5M12 5l-7 7 7 7" />
        </Svg>
    );
}

export function SpotifyImportScreen({
    navigation,
}: {
    navigation: { goBack: () => void };
}): React.JSX.Element {
    const { colors, typography } = useTheme();
    const user = useAuthStore((s) => s.user);
    const [link, setLink] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<ImportedTrack[]>([]);
    const [playlistName, setPlaylistName] = useState<string | null>(null);

    // Safety-net gate — ProfileScreen already hides the entry point, but this
    // ensures direct navigation can't bypass it either.
    const isAllowed = user?.email === SPOTIFY_IMPORT_ALLOWED_EMAIL;

    const handleImport = useCallback(async () => {
        const parsed = parseSpotifyLink(link);
        if (!parsed) {
            Alert.alert(
                "Invalid link",
                "Paste a Spotify track or playlist share link (from the Share button in Spotify).",
            );
            return;
        }

        setIsLoading(true);
        setResults([]);
        setPlaylistName(null);

        try {
            if (parsed.type === "track") {
                const result = await importSpotifyTrack(link);
                setResults([result]);
            } else if (parsed.type === "playlist") {
                const { name, tracks } = await importSpotifyPlaylist(link);
                setPlaylistName(name);
                setResults(tracks);
            } else {
                Alert.alert(
                    "Unsupported link",
                    "Only track and playlist links are supported right now.",
                );
            }
        } catch (err) {
            logger.error("SpotifyImport", "import failed", err);
            Alert.alert(
                "Import failed",
                err instanceof Error
                    ? err.message
                    : "Please check the link and try again.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [link]);

    if (!isAllowed) {
        return (
            <SafeAreaView
                style={[styles.safe, { backgroundColor: colors.background }]}
            >
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <BackIcon color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text
                        style={[
                            typography.h3,
                            { color: colors.textPrimary, flex: 1, textAlign: "center" },
                        ]}
                    >
                        Import
                    </Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centred}>
                    <Text
                        style={[
                            typography.bodyMd,
                            { color: colors.textSecondary, textAlign: "center" },
                        ]}
                    >
                        This feature isn't available for your account.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <BackIcon color={colors.textPrimary} />
                </TouchableOpacity>
                <Text
                    style={[
                        typography.h3,
                        { color: colors.textPrimary, flex: 1, textAlign: "center" },
                    ]}
                >
                    Import from Spotify
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.body}>
                {/* Clarification notice — see file header for full context */}
                <View
                    style={[
                        styles.notice,
                        {
                            backgroundColor: colors.warning + "15",
                            borderColor: colors.warning + "40",
                        },
                    ]}
                >
                    <Text
                        style={[
                            typography.labelSm,
                            {
                                color: colors.warning,
                                fontWeight: "700",
                                marginBottom: Spacing[1],
                            },
                        ]}
                    >
                        Preview only — download not yet implemented
                    </Text>
                    <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
                        Spotify's API doesn't provide audio downloads. This shows what would
                        be imported as metadata, with a Jamendo match for playback where one
                        exists. Confirm the approach for "download to Drive" before this is
                        built out further.
                    </Text>
                </View>

                <View
                    style={[
                        styles.inputRow,
                        {
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceElevated,
                        },
                    ]}
                >
                    <TextInput
                        style={[typography.bodyMd, { color: colors.textPrimary, flex: 1 }]}
                        placeholder="Paste Spotify track or playlist link…"
                        placeholderTextColor={colors.textTertiary}
                        value={link}
                        onChangeText={setLink}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.importBtn,
                        { backgroundColor: colors.brand },
                        (!link.trim() || isLoading) && { opacity: 0.5 },
                    ]}
                    onPress={() => void handleImport()}
                    disabled={!link.trim() || isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.textOnBrand} />
                    ) : (
                        <Text
                            style={[
                                typography.labelLg,
                                { color: colors.textOnBrand, fontWeight: "700" },
                            ]}
                        >
                            Preview Import
                        </Text>
                    )}
                </TouchableOpacity>

                {playlistName && (
                    <Text
                        style={[
                            typography.h3,
                            {
                                color: colors.textPrimary,
                                marginTop: Spacing[5],
                                marginBottom: Spacing[2],
                            },
                        ]}
                    >
                        {playlistName}
                    </Text>
                )}
            </View>

            <FlatList
                data={results}
                keyExtractor={(item) => item.spotifyMeta.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View
                        style={[styles.resultRow, { borderBottomColor: colors.border }]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text
                                style={[typography.labelLg, { color: colors.textPrimary }]}
                                numberOfLines={1}
                            >
                                {item.spotifyMeta.title}
                            </Text>
                            <Text
                                style={[typography.labelSm, { color: colors.textSecondary }]}
                                numberOfLines={1}
                            >
                                {item.spotifyMeta.artist}
                                {item.spotifyMeta.album ? ` · ${item.spotifyMeta.album}` : ""}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.statusPill,
                                {
                                    backgroundColor: item.jamendoMatch
                                        ? colors.success + "20"
                                        : colors.textTertiary + "20",
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    typography.labelXs,
                                    {
                                        color: item.jamendoMatch
                                            ? colors.success
                                            : colors.textTertiary,
                                        fontWeight: "700",
                                    },
                                ]}
                            >
                                {item.jamendoMatch ? "Playable match" : "Unavailable"}
                            </Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.centred}>
                            <Text
                                style={[
                                    typography.bodyMd,
                                    { color: colors.textSecondary, textAlign: "center" },
                                ]}
                            >
                                Paste a link above to preview an import.
                            </Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Layout.screenPaddingH,
        paddingVertical: Spacing[4],
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    body: { paddingHorizontal: Layout.screenPaddingH, paddingTop: Spacing[4] },
    notice: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing[3],
        marginBottom: Spacing[4],
    },
    inputRow: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[3],
        marginBottom: Spacing[3],
    },
    importBtn: {
        height: 48,
        borderRadius: BorderRadius.lg,
        alignItems: "center",
        justifyContent: "center",
    },
    centred: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: Layout.screenPaddingH,
        paddingTop: Spacing[10],
    },
    listContent: {
        paddingHorizontal: Layout.screenPaddingH,
        paddingBottom: Spacing[10],
    },
    resultRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing[3],
        paddingVertical: Spacing[3],
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    statusPill: {
        paddingHorizontal: Spacing[2.5],
        paddingVertical: Spacing[1],
        borderRadius: BorderRadius.full,
    },
});
