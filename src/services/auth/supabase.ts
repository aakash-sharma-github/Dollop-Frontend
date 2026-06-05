import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
const GOOGLE_WEB_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set.');
}

export const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export async function signInWithOtp(email: string): Promise<void> {
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('too many') || error.status === 429) {
      throw new Error('Too many code requests. Please wait a few minutes before trying again.');
    }
    throw new Error(error.message);
  }
}

export async function verifyOtp(email: string, token: string): Promise<string> {
  const { data, error } = await supabaseClient.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.session) throw new Error(error?.message ?? 'OTP verification failed');
  return data.session.access_token;
}

export interface GoogleSignInResult {
  supabaseToken: string;
}

function extractTokenFromCallbackUrl(callbackUrl: string): string {
  let url: URL;
  try {
    url = new URL(callbackUrl);
  } catch {
    throw new Error('Invalid callback URL returned from Google sign-in');
  }

  // Supabase returns tokens in the HASH FRAGMENT (#access_token=...) by default.
  // Reading url.searchParams here is always null — that was the root cause of
  // the "network request failed" error (empty token sent to exchangeToken).
  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const token = hashParams.get('access_token');
    if (token) return token;
    const errorDesc = hashParams.get('error_description');
    if (errorDesc) throw new Error(errorDesc);
  }

  // Fallback for PKCE flow
  const queryToken = url.searchParams.get('access_token');
  if (queryToken) return queryToken;

  throw new Error('No access token in OAuth callback. Check your Supabase redirect URI configuration.');
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set in your .env file.');
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'dollop', path: 'auth/callback' });

  const { data, error: urlError } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUri, skipBrowserRedirect: true },
  });

  if (urlError || !data.url) throw new Error(urlError?.message ?? 'Failed to build Google OAuth URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type === 'cancel') throw new Error('Sign-in was cancelled');
  if (result.type !== 'success') throw new Error('Google sign-in failed. Please try again.');

  return { supabaseToken: extractTokenFromCallbackUrl(result.url) };
}