import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { Spacing } from '@theme/spacing';
import { useAuthStore } from '@store/authStore';

function WifiOffIcon({ color }: { color: string }) {
    return (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M1 1l22 22" />
            <Path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
            <Path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
            <Path d="M10.71 5.05A16 16 0 0122.56 9" />
            <Path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
            <Path d="M8.53 16.11a6 6 0 016.95 0" />
            <Path d="M12 20h.01" />
        </Svg>
    );
}

export function OfflineBanner(): React.JSX.Element | null {
    const { colors, typography } = useTheme();
    const isOffline = useAuthStore((s) => s.isOffline);
    const slideAnim = useRef(new Animated.Value(-40)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isOffline ? 0 : -40,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    }, [isOffline, slideAnim]);

    if (!isOffline) return null;

    return (
        <Animated.View
            style={[
                styles.banner,
                { backgroundColor: colors.warning + '18', borderBottomColor: colors.warning + '30' },
                { transform: [{ translateY: slideAnim }] },
            ]}
        >
            <WifiOffIcon color={colors.warning} />
            <Text style={[typography.labelSm, { color: colors.warning, marginLeft: Spacing[2] }]}>
                You're offline — streaming unavailable. Local music still works.
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing[2],
        paddingHorizontal: Spacing[4],
        borderBottomWidth: 1,
    },
});