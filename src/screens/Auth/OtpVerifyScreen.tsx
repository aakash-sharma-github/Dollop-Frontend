import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@theme/index';
import { Spacing, BorderRadius, Layout } from '@theme/spacing';
import { authApi } from '@services/api';
import { verifyOtp } from '@services/auth/supabase';
import { useAuthStore } from '@store/authStore';
import { ERROR_MESSAGES } from '@constants/index';
import type { OtpVerifyScreenProps } from '@types/navigation';

const OTP_LENGTH = 6;

export function OtpVerifyScreen({ route, navigation }: OtpVerifyScreenProps): React.JSX.Element {
  const { email } = route.params;
  const { colors, typography } = useTheme();
  const signIn = useAuthStore((s) => s.signInWithResult);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async (): Promise<void> => {
    if (otp.length !== OTP_LENGTH) return;
    setIsVerifying(true);
    try {
      const supabaseToken = await verifyOtp(email, otp);
      const authResult = await authApi.exchangeToken(supabaseToken);
      await signIn(authResult);
    } catch {
      Alert.alert('Invalid code', ERROR_MESSAGES.INVALID_OTP);
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    setIsResending(true);
    try {
      await authApi.sendOtp(email);
      Alert.alert('Code sent', `A new code has been sent to ${email}`);
    } catch {
      Alert.alert('Error', ERROR_MESSAGES.GENERIC);
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (text: string): void => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    if (digits.length === OTP_LENGTH) setTimeout(() => { void handleVerify(); }, 150);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={[typography.labelLg, { color: colors.brand }]}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={[typography.displayLg, { color: colors.textPrimary, textAlign: 'center' }]}>
            Check your email
          </Text>
          <Text style={[typography.bodyMd, { color: colors.textSecondary, textAlign: 'center', lineHeight: 24 }]}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{email}</Text>
          </Text>

          {/* OTP display */}
          <TouchableOpacity style={styles.otpRow} onPress={() => inputRef.current?.focus()} activeOpacity={1}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <View key={i} style={[
                styles.cell,
                { borderColor: colors.border, backgroundColor: colors.surface },
                otp.length === i && { borderColor: colors.brand },
                otp.length > i && { borderColor: colors.brandDark, backgroundColor: colors.surfaceElevated },
              ]}>
                <Text style={[typography.h1, { color: colors.textPrimary }]}>{otp[i] ?? ''}</Text>
              </View>
            ))}
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.verifyBtn, { backgroundColor: colors.brand }, (otp.length < OTP_LENGTH || isVerifying) && styles.disabled]}
            onPress={handleVerify}
            disabled={otp.length < OTP_LENGTH || isVerifying}
            activeOpacity={0.8}
          >
            {isVerifying
              ? <ActivityIndicator color={colors.textOnBrand} />
              : <Text style={[typography.labelLg, { color: colors.textOnBrand, fontWeight: '700' }]}>Verify</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={isResending}>
            {isResending
              ? <ActivityIndicator size="small" color={colors.brand} />
              : <Text style={[typography.bodyMd, { color: colors.textSecondary }]}>
                  Didn't receive a code?{' '}
                  <Text style={{ color: colors.brand, fontWeight: '600' }}>Resend</Text>
                </Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Layout.screenPaddingH },
  back: { paddingVertical: Spacing[4] },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing[5] },
  otpRow: { flexDirection: 'row', gap: Spacing[2], marginVertical: Spacing[4] },
  cell: { width: 48, height: 60, borderRadius: BorderRadius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  verifyBtn: { borderRadius: BorderRadius.lg, height: Layout.touchTarget + 8, width: '100%', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  resendBtn: { paddingVertical: Spacing[2] },
});
