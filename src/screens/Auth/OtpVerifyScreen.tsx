import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme/index';
import { Spacing, BorderRadius, Layout } from '@theme/spacing';
import { authApi } from '@services/api';
import { verifyOtp, signInWithOtp } from '@services/auth/supabase';
import { useAuthStore } from '@store/authStore';
import { ERROR_MESSAGES, OTP_COOLDOWN_SECONDS } from '@constants/index';
import type { OtpVerifyScreenProps } from '@app-types/navigation';

const OTP_LENGTH = 6;

export function OtpVerifyScreen({ route, navigation }: OtpVerifyScreenProps): React.JSX.Element {
  const { email, sentAt } = route.params;
  const { colors, typography } = useTheme();
  const signIn = useAuthStore((s) => s.signInWithResult);

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // ── Resend cooldown — initialised from the sentAt timestamp so even if the
  // user navigates back and forward, the timer is consistent. ─────────────────
  const elapsedSinceOtpSent = Math.floor((Date.now() - sentAt) / 1000);
  const initialCooldown = Math.max(0, OTP_COOLDOWN_SECONDS - elapsedSinceOtpSent);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((seconds = OTP_COOLDOWN_SECONDS) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
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

  // Start timer immediately if there's still cooldown remaining from the send
  useEffect(() => {
    if (initialCooldown > 0) startCooldown(initialCooldown);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep a stable ref to the input ──────────────────────────────────────────
  // FIX: zero-size hidden input is invisible to Android's focus system.
  // We render it off-screen (translateY: -200) with real dimensions instead.
  const inputRef = useRef<TextInput>(null);

  // Auto-focus on mount with a short delay to ensure the screen has rendered
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Verify OTP ───────────────────────────────────────────────────────────────
  const handleVerify = useCallback(async (): Promise<void> => {
    if (otp.length !== OTP_LENGTH || isVerifying) return;
    setIsVerifying(true);
    try {
      const supabaseToken = await verifyOtp(email, otp);
      const authResult = await authApi.exchangeToken(supabaseToken);
      await signIn(authResult);
    } catch {
      Alert.alert('Invalid code', ERROR_MESSAGES.INVALID_OTP);
      setOtp('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setIsVerifying(false);
    }
  }, [otp, isVerifying, email, signIn]);

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResend = useCallback(async (): Promise<void> => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      // Use signInWithOtp directly — the backend endpoint is not needed here
      await signInWithOtp(email);
      startCooldown();
      Alert.alert('Code sent', `A new code has been sent to ${email}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC;
      if (msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('rate limit')) {
        startCooldown();
        Alert.alert('Rate limited', ERROR_MESSAGES.OTP_RATE_LIMIT);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsResending(false);
    }
  }, [cooldown, isResending, email, startCooldown]);

  // ── Input handler ────────────────────────────────────────────────────────────
  const handleChange = useCallback((text: string): void => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    // Auto-submit when all 6 digits are entered
    if (digits.length === OTP_LENGTH) {
      setTimeout(() => {
        void (async () => {
          if (isVerifying) return;
          setIsVerifying(true);
          try {
            const supabaseToken = await verifyOtp(email, digits);
            const authResult = await authApi.exchangeToken(supabaseToken);
            await signIn(authResult);
          } catch {
            Alert.alert('Invalid code', ERROR_MESSAGES.INVALID_OTP);
            setOtp('');
            setTimeout(() => inputRef.current?.focus(), 100);
          } finally {
            setIsVerifying(false);
          }
        })();
      }, 200);
    }
  }, [isVerifying, email, signIn]);

  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/*
        FIX: The hidden TextInput must NOT have height:0 / width:0.
        On Android, a zero-size view cannot receive focus and the keyboard
        never appears. We position it off-screen instead using absolute
        positioning and a transform, keeping it focusable.
      */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={otp}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        caretHidden
        // Android needs this to keep the keyboard type consistent
        textContentType="oneTimeCode"
        importantForAutofill="yes"
      />

      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={[typography.labelLg, { color: colors.brand }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Heading */}
          <Text style={[typography.displayLg, { color: colors.textPrimary, textAlign: 'center' }]}>
            Check your email
          </Text>
          <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center', lineHeight: 24 }]}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{email}</Text>
          </Text>

          {/* OTP cells — tapping anywhere in the row re-focuses the hidden input */}
          <TouchableOpacity
            style={styles.otpRow}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
              const isActive = otp.length === i && !isVerifying;
              const isFilled = otp.length > i;
              return (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    isActive && { borderColor: colors.brand, backgroundColor: colors.surfaceElevated },
                    isFilled && { borderColor: colors.brandDark, backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  {isVerifying && isFilled ? (
                    i === 2 ? <View style={{ width: 20, height: 20 }} /> : null
                  ) : (
                    <Text style={[typography.h1, { color: colors.textPrimary }]}>
                      {otp[i] ?? ''}
                    </Text>
                  )}
                </View>
              );
            })}
          </TouchableOpacity>

          {/* Verify button */}
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              { backgroundColor: colors.brand },
              (otp.length < OTP_LENGTH || isVerifying) && styles.disabled,
            ]}
            onPress={handleVerify}
            disabled={otp.length < OTP_LENGTH || isVerifying}
            activeOpacity={0.8}
          >
            {isVerifying
              ? <ActivityIndicator color={colors.textOnBrand} />
              : <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>
                Verify Code
              </Text>
            }
          </TouchableOpacity>

          {/* Resend — shows countdown timer when on cooldown */}
          <View style={styles.resendRow}>
            {isOnCooldown ? (
              <View style={styles.cooldownContainer}>
                <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>
                  Didn't receive a code?{' '}
                </Text>
                <View style={[styles.cooldownBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Text style={[typography.labelMd, { color: colors.brand, fontVariant: ['tabular-nums'] }]}>
                    {`Resend in ${cooldown}s`}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>
                    Didn't receive a code?{' '}
                    <Text style={{ color: colors.brand, fontWeight: '600' }}>Resend</Text>
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Hint */}
          <Text style={[typography.labelSm, { color: colors.textTertiary, textAlign: 'center' }]}>
            The code expires in 10 minutes.{'\n'}Check your spam folder if it doesn't arrive.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // FIX: real size (1×1), off-screen via transform — focusable on all platforms
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    transform: [{ translateY: -200 }],
    ...Platform.select({ android: { top: 0 } }),
  },
  container: { flex: 1, paddingHorizontal: Layout.screenPaddingH },
  back: { paddingVertical: Spacing[4] },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[5],
    paddingBottom: Spacing[8],
  },
  otpRow: { flexDirection: 'row', gap: Spacing[2], marginVertical: Spacing[2] },
  cell: {
    width: 48,
    height: 60,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtn: {
    borderRadius: BorderRadius.lg,
    height: Layout.touchTarget + 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  resendRow: { alignItems: 'center' },
  cooldownContainer: { alignItems: 'center', gap: Spacing[2] },
  cooldownBadge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});