import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@theme/index';
import { Spacing, BorderRadius, Layout } from '@theme/spacing';
import { authApi } from '@services/api';
import { signInWithOtp, signInWithGoogle } from '@services/auth/supabase';
import { useAuthStore } from '@store/authStore';
import { ERROR_MESSAGES, ROUTES, OTP_COOLDOWN_SECONDS } from '@constants/index';
import type { LoginScreenProps } from '@app-types/navigation';

function GoogleIcon(): React.JSX.Element {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export function LoginScreen({ navigation }: LoginScreenProps): React.JSX.Element {
  const { colors, typography, isDark } = useTheme();
  const signIn = useAuthStore((s) => s.signInWithResult);

  const [email, setEmail] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(OTP_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const isOnCooldown = cooldown > 0;
  const anyLoading = isEmailLoading || isGoogleLoading;

  const handleSendOtp = async (): Promise<void> => {
    if (isOnCooldown || anyLoading) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { Alert.alert('Email required', ERROR_MESSAGES.EMAIL_REQUIRED); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Invalid email', ERROR_MESSAGES.EMAIL_INVALID);
      return;
    }
    setIsEmailLoading(true);
    try {
      await signInWithOtp(trimmed);
      startCooldown();
      // Pass sentAt so OtpVerifyScreen can show its own resend cooldown
      navigation.navigate(ROUTES.OTP_VERIFY, { email: trimmed, sentAt: Date.now() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC;
      if (msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('rate limit')) {
        startCooldown();
        Alert.alert('Rate limit reached', ERROR_MESSAGES.OTP_RATE_LIMIT);
      } else {
        Alert.alert('Error sending code', msg);
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    if (anyLoading) return;
    setIsGoogleLoading(true);
    try {
      const { supabaseToken } = await signInWithGoogle();
      const authResult = await authApi.exchangeToken(supabaseToken);
      await signIn(authResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC;
      if (msg === 'Sign-in was cancelled') return;
      if (
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('network request failed')
      ) {
        Alert.alert(
          'Connection error',
          `Could not reach the Dollop server.\n\nCurrent API URL:\n${process.env['EXPO_PUBLIC_API_BASE_URL'] ?? '(not set)'}\n\nMake sure this is your machine's LAN IP, not localhost. Then stop Metro, run: bun run start --clear`,
        );
      } else {
        Alert.alert('Google sign-in failed', msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const emailBtnLabel = isOnCooldown ? `Resend in ${cooldown}s` : 'Continue with Email';
  const emailBtnDisabled = anyLoading || isOnCooldown;

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
              <Text style={[typography.h3, { color: colors.textPrimary, marginBottom: Spacing[1] }]}>
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
                  editable={!anyLoading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { backgroundColor: isOnCooldown ? colors.surfaceElevated : colors.brand },
                  emailBtnDisabled && styles.disabled,
                ]}
                onPress={handleSendOtp}
                disabled={emailBtnDisabled}
                activeOpacity={0.8}
              >
                {isEmailLoading
                  ? <ActivityIndicator color={colors.textOnBrand} />
                  : <Text style={[typography.labelLg, {
                    color: isOnCooldown ? colors.textSecondary : colors.textOnBrand,
                    fontWeight: '700',
                  }]}>{emailBtnLabel}</Text>
                }
              </TouchableOpacity>

              {isOnCooldown && (
                <Text style={[typography.labelSm, { color: colors.textTertiary, textAlign: 'center' }]}>
                  Code sent — check your inbox. Expires in 10 minutes.
                </Text>
              )}

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[typography.labelMd, { color: colors.textTertiary }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.borderStrong }, anyLoading && styles.disabled]}
                onPress={handleGoogleSignIn}
                disabled={anyLoading}
                activeOpacity={0.8}
              >
                {isGoogleLoading
                  ? <ActivityIndicator color={colors.brand} />
                  : <>
                    <GoogleIcon />
                    <Text style={[typography.labelLg, { color: colors.textPrimary, marginLeft: Spacing[2] }]}>
                      Continue with Google
                    </Text>
                  </>
                }
              </TouchableOpacity>
            </View>

            <View style={styles.legalRow}>
              <Text style={[typography.labelSm, { color: colors.textTertiary }]}>By continuing you agree to our </Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.TERMS_CONDITIONS)}>
                <Text style={[typography.labelSm, { color: colors.brand }]}>Terms</Text>
              </TouchableOpacity>
              <Text style={[typography.labelSm, { color: colors.textTertiary }]}> and </Text>
              <TouchableOpacity onPress={() => navigation.navigate(ROUTES.PRIVACY_POLICY)}>
                <Text style={[typography.labelSm, { color: colors.brand }]}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
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
  disabled: { opacity: 0.55 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], marginVertical: Spacing[1] },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  googleBtn: { borderWidth: 1.5, borderRadius: BorderRadius.lg, height: Layout.touchTarget + 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
});