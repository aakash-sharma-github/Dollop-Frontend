import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@theme/index';
import { Spacing, BorderRadius, Layout } from '@theme/spacing';
import { authApi } from '@services/api';
import { signInWithOtp } from '@services/auth/supabase';
import { ERROR_MESSAGES, ROUTES } from '@constants/index';
import type { LoginScreenProps } from '@types/navigation';

export function LoginScreen({ navigation }: LoginScreenProps): React.JSX.Element {
  const { colors, typography, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async (): Promise<void> => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { Alert.alert('Email required', ERROR_MESSAGES.EMAIL_REQUIRED); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) { Alert.alert('Invalid email', ERROR_MESSAGES.EMAIL_INVALID); return; }

    setIsLoading(true);
    try {
      await signInWithOtp(trimmed);
      await authApi.sendOtp(trimmed);
      navigation.navigate(ROUTES.OTP_VERIFY, { email: trimmed });
    } catch {
      Alert.alert('Error', ERROR_MESSAGES.GENERIC);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#201408', '#0A0805'] : ['#FFF4DC', '#F2EEE5']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.container}>

            {/* Brand */}
            <View style={styles.header}>
              <View style={[styles.logoMark, { backgroundColor: colors.brand }]}>
                {/* Equaliser bars inside the logo */}
                <View style={styles.eqRow}>
                  {[0.5, 0.85, 1, 0.7, 0.4].map((h, i) => (
                    <View key={i} style={[styles.eqBar, {
                      height: 18 * h,
                      backgroundColor: colors.textOnBrand,
                      opacity: i === 2 ? 1 : 0.75,
                    }]} />
                  ))}
                </View>
              </View>
              <Text style={[typography.displayXl, { color: colors.textPrimary, letterSpacing: -2, marginTop: Spacing[3] }]}>
                dollop
              </Text>
              <Text style={[typography.bodyMd, { color: colors.textSecondary, marginTop: Spacing[1], fontStyle: 'italic' }]}>
                Music worth savouring.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: Spacing[3] }]}>
                Sign in or create an account
              </Text>

              <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  style={[typography.bodyLg, styles.input, { color: colors.textPrimary }]}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="send"
                  onSubmitEditing={handleSendOtp}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.brand }, isLoading && styles.disabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading
                  ? <ActivityIndicator color={colors.textOnBrand} />
                  : <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>Continue with Email</Text>
                }
              </TouchableOpacity>
            </View>

            <Text style={[typography.labelSm, { color: colors.textTertiary, textAlign: 'center', lineHeight: 18 }]}>
              By continuing you agree to Dollop's Terms of Service and Privacy Policy.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Layout.screenPaddingH, justifyContent: 'space-between', paddingVertical: Spacing[8] },
  header: { alignItems: 'center', paddingTop: Spacing[10] },
  logoMark: { width: 72, height: 72, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center' },
  eqRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24 },
  eqBar: { width: 5, borderRadius: 3 },
  form: { gap: Spacing[3] },
  inputWrapper: { borderWidth: 1.5, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  input: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3.5], minHeight: Layout.touchTarget },
  primaryBtn: { borderRadius: BorderRadius.lg, height: Layout.touchTarget + 8, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.6 },
});
