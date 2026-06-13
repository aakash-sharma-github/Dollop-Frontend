/**
 * ConfirmDialog — themed confirmation modal to replace Alert.alert.
 *
 * Two ways to use:
 *
 * 1. Declarative (render in JSX, control with state):
 *    <ConfirmDialog
 *      visible={showConfirm}
 *      title="Delete Playlist"
 *      message='Delete "My Playlist"? This cannot be undone.'
 *      confirmLabel="Delete"
 *      destructive
 *      onConfirm={() => { doDelete(); setShowConfirm(false); }}
 *      onCancel={() => setShowConfirm(false)}
 *    />
 *
 * 2. Imperative (like Alert.alert) via the useConfirmDialog hook:
 *    const { confirm, dialog } = useConfirmDialog();
 *    // in JSX: {dialog}
 *    const ok = await confirm({ title: '...', message: '...', destructive: true });
 *    if (ok) doDelete();
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useTheme } from '@theme/index';
import { Spacing, BorderRadius } from '@theme/spacing';

export interface ConfirmDialogProps {
    visible: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Renders the confirm button in the theme's error colour */
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    visible,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps): React.JSX.Element {
    const { colors, typography } = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
            <Pressable style={styles.overlay} onPress={onCancel}>
                <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
                    <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: message ? Spacing[2] : Spacing[5] }]}>
                        {title}
                    </Text>
                    {message ? (
                        <Text style={[typography.bodyMd, { color: colors.textSecondary, marginBottom: Spacing[5] }]}>
                            {message}
                        </Text>
                    ) : null}

                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.btn, { borderColor: colors.border }]}
                            onPress={onCancel}
                            activeOpacity={0.75}
                        >
                            <Text style={[typography.labelLg, { color: colors.textSecondary, fontWeight: '600' }]}>
                                {cancelLabel}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.btn,
                                {
                                    backgroundColor: destructive ? colors.error : colors.brand,
                                    borderColor: destructive ? colors.error : colors.brand,
                                },
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.85}
                        >
                            <Text style={[typography.labelLg, { color: destructive ? '#FFFFFF' : colors.textOnBrand, fontWeight: '700' }]}>
                                {confirmLabel}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ── Imperative hook ────────────────────────────────────────────────────────────
interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
    resolve: (value: boolean) => void;
}

/**
 * Imperative confirm dialog — drop-in alternative to Alert.alert that matches
 * the app theme. Render `dialog` once near the root of your component, then
 * call `confirm({...})` which returns a Promise<boolean>.
 */
export function useConfirmDialog(): {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    dialog: React.JSX.Element;
} {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setPending({ ...options, resolve });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        pending?.resolve(true);
        setPending(null);
    }, [pending]);

    const handleCancel = useCallback(() => {
        pending?.resolve(false);
        setPending(null);
    }, [pending]);

    const dialog = (
        <ConfirmDialog
            visible={pending !== null}
            title={pending?.title ?? ''}
            message={pending?.message}
            confirmLabel={pending?.confirmLabel}
            cancelLabel={pending?.cancelLabel}
            destructive={pending?.destructive}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );

    return { confirm, dialog };
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing[6],
    },
    card: {
        width: '100%',
        maxWidth: 400,
        borderRadius: BorderRadius['2xl'],
        borderWidth: 1,
        padding: Spacing[6],
    },
    btnRow: {
        flexDirection: 'row',
        gap: Spacing[3],
    },
    btn: {
        flex: 1,
        height: 48,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
});