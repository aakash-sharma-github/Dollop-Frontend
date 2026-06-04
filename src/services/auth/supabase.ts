import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

// Required so the browser session closes cleanly after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
const GOOGLE_WEB_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in your .env file.',
  );
}

export const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// ─── Magic Link OTP ──────────────────────────────────────────────────────────

/**
 * Sends a magic link OTP email via Supabase Auth.
 * The OTP code is then verified in OtpVerifyScreen.
 * Do NOT call any backend endpoint alongside this — Supabase handles delivery
 * entirely. Calling the backend as well causes a double-send race condition.
 */
export async function signInWithOtp(email: string): Promise<void> {
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(error.message);
}

/**
 * Verifies the 6-digit OTP from the email and returns the Supabase
 * session access token to exchange for a Dollop JWT on the backend.
 */
export async function verifyOtp(email: string, token: string): Promise<string> {
  const { data, error } = await supabaseClient.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error || !data.session) {
    throw new Error(error?.message ?? 'OTP verification failed');
  }
  return data.session.access_token;
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

export interface GoogleSignInResult {
  /** Supabase session access token — pass to authApi.exchangeToken() */
  supabaseToken: string;
}

/**
 * Initiates Google Sign-In using expo-auth-session + Supabase's
 * signInWithIdToken. This is the recommended Expo-compatible approach
 * that works in both Expo Go and production builds.
 *
 * Prerequisites:
 *  1. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env
 *  2. In Google Cloud Console, add your Expo redirect URI to the Web client's
 *     Authorised redirect URIs:
 *     https://auth.expo.io/@your-expo-username/dollop
 *  3. In Supabase → Auth → Providers → Google, add the same Web Client ID + Secret
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set in your .env file.');
  }

  // Generate a cryptographically random nonce to prevent replay attacks
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  // Build the Google OAuth URL via Supabase's OAuth endpoint
  const { data, error: urlError } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AuthSession.makeRedirectUri({ scheme: 'dollop', path: 'auth/callback' }),
      queryParams: { nonce: hashedNonce },
      skipBrowserRedirect: true, // We handle the browser ourselves below
    },
  });

  if (urlError || !data.url) {
    throw new Error(urlError?.message ?? 'Failed to create Google OAuth URL');
  }

  // Open the browser for the Google sign-in flow
  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    AuthSession.makeRedirectUri({ scheme: 'dollop', path: 'auth/callback' }),
  );

  if (result.type !== 'success') {
    throw new Error(result.type === 'cancel' ? 'Sign-in was cancelled' : 'Google sign-in failed');
  }

  // Parse the returned URL to extract the Supabase session
  const url = new URL(result.url);
  const accessToken = url.searchParams.get('access_token');
  const refreshToken = url.searchParams.get('refresh_token');

  if (!accessToken) {
    // Supabase may return tokens in the hash fragment instead
    const hashParams = new URLSearchParams(url.hash.replace('#', ''));
    const hashAccessToken = hashParams.get('access_token');
    if (!hashAccessToken) {
      throw new Error('No access token returned from Google sign-in');
    }
    return { supabaseToken: hashAccessToken };
  }

  return { supabaseToken: accessToken };
}