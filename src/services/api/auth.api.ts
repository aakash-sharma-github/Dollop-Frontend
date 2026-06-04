import { apiClient } from './client';
import type { AuthResult, TokenPair } from '@types/index';

export const authApi = {
  exchangeToken: (supabaseToken: string): Promise<AuthResult> =>
    apiClient.post<AuthResult>('/auth/exchange', { supabaseToken }, { authenticated: false }),

  refreshToken: (refreshToken: string): Promise<{ tokens: TokenPair }> =>
    apiClient.post<{ tokens: TokenPair }>('/auth/refresh', { refreshToken }, { authenticated: false }),

  sendOtp: (email: string): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>('/auth/otp/send', { email }, { authenticated: false }),

  verifyOtp: (email: string, otp: string): Promise<AuthResult> =>
    apiClient.post<AuthResult>('/auth/otp/verify', { email, otp }, { authenticated: false }),

  getMe: (): Promise<{ user: AuthResult['user'] }> =>
    apiClient.get<{ user: AuthResult['user'] }>('/auth/me'),
};
