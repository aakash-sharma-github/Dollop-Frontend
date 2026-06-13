/**
 * Toast — brief, auto-dismissing notification overlay.
 *
 * Does not occupy permanent layout space (unlike the old OfflineBanner).
 * Renders absolutely positioned near the top of the screen, fades/slides
 * in, stays for `duration` ms, then fades/slides out.
 *
 * Usage:
 *   const { show, toast } = useToast();
 *   // render `{toast}` once near the root
 *   show('Back online');
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@theme/index';
import { Spacing, BorderRadius } from '@theme/spacing';

export type ToastVariant = 'default' | 'success' | 'warning' | 'error';

interface ToastState {
    id: number;
    message: string;
    variant: ToastVariant;
}

const DEFAULT_DURATION = 2000;

export function useToast(): {
    show: (message: string, variant?: ToastVariant, duration?: number) => void;
    toast: React.JSX.Element;
} {
    const { colors, typography } = useTheme();
    const [current, setCurrent] = useState<ToastState | null>(null);
    const anim = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idRef = useRef(0);

    const show = useCallback((message: string, variant: ToastVariant = 'default', duration = DEFAULT_DURATION) => {
        if (hideTimer.current) clearTimeout(hideTimer.current);

        const id = ++idRef.current;
        setCurrent({ id, message, variant });

        anim.setValue(0);
        Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();

        hideTimer.current = setTimeout(() => {
            Animated.timing(anim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                setCurrent((c) => (c?.id === id ? null : c));
            });
        }, duration);
    }, [anim]);

    useEffect(() => {
        return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
    }, []);

    const variantColor: Record<ToastVariant, string> = {
        default: colors.brand,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
    };

    const toast = current ? (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                {
                    opacity: anim,
                    transform: [
                        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                    ],
                },
            ]}
        >
            <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.dot, { backgroundColor: variantColor[current.variant] }]} />
                <Text style={[typography.labelMd, { color: colors.textPrimary }]}>{current.message}</Text>
            </View>
        </Animated.View>
    ) : <></>;

    return { show, toast };
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Spacing[3],
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[2.5],
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});