export const APP_NAME = 'Dollop';

export const ROUTES = {
  AUTH_STACK: 'AuthStack',
  LOGIN: 'Login',
  OTP_VERIFY: 'OtpVerify',
  MAIN_TABS: 'MainTabs',
  HOME: 'Home',
  SEARCH: 'Search',
  LIBRARY: 'Library',
  PROFILE: 'Profile',
  PLAYER: 'Player',
} as const;

export const QUERY_KEYS = {
  USER_PROFILE: 'userProfile',
  RECENTLY_PLAYED: 'recentlyPlayed',
  RECOMMENDATIONS: 'recommendations',
  PLAYLISTS: 'playlists',
  PLAYLIST_DETAIL: 'playlistDetail',
  SEARCH: 'search',
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'dollop_access_token',
  REFRESH_TOKEN: 'dollop_refresh_token',
} as const;

export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Unable to connect. Check your internet connection.',
  AUTH_FAILED: 'Authentication failed. Please sign in again.',
  INVALID_OTP: 'The code you entered is invalid or has expired.',
  EMAIL_REQUIRED: 'Please enter your email address.',
  EMAIL_INVALID: 'Please enter a valid email address.',
} as const;
