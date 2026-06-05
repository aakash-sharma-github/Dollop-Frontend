import React, { type ReactNode } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { Spacing, Layout, BorderRadius } from '@theme/spacing';

function BackIcon({ color }: { color: string }) {
    return (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M19 12H5M12 5l-7 7 7 7" />
        </Svg>
    );
}

interface LegalScreenProps {
    title: string;
    onBack: () => void;
    children: ReactNode;
}

export function LegalScreen({ title, onBack, children }: LegalScreenProps): React.JSX.Element {
    const { colors, typography } = useTheme();

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <BackIcon color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[typography.h3, { color: colors.textPrimary, flex: 1, textAlign: 'center' }]}>
                    {title}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        </SafeAreaView>
    );
}

interface SectionProps { heading: string; children: ReactNode }

export function LegalSection({ heading, children }: SectionProps): React.JSX.Element {
    const { colors, typography } = useTheme();
    return (
        <View style={styles.section}>
            <Text style={[typography.h4, { color: colors.brand, marginBottom: Spacing[2] }]}>
                {heading}
            </Text>
            {children}
        </View>
    );
}

interface ParaProps { children: ReactNode }

export function LegalPara({ children }: ParaProps): React.JSX.Element {
    const { colors, typography } = useTheme();
    return (
        <Text style={[typography.bodyMd, { color: colors.textSecondary, lineHeight: 24, marginBottom: Spacing[3] }]}>
            {children}
        </Text>
    );
}

export function LegalBullet({ children }: ParaProps): React.JSX.Element {
    const { colors, typography } = useTheme();
    return (
        <View style={styles.bullet}>
            <View style={[styles.dot, { backgroundColor: colors.brand }]} />
            <Text style={[typography.bodyMd, { color: colors.textSecondary, lineHeight: 24, flex: 1 }]}>
                {children}
            </Text>
        </View>
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
    content: {
        paddingHorizontal: Layout.screenPaddingH,
        paddingTop: Spacing[6],
        paddingBottom: Spacing[16],
    },
    section: { marginBottom: Spacing[8] },
    bullet: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[3] },
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
});