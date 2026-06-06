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
  SETTINGS: 'Settings',
  PRIVACY_POLICY: 'PrivacyPolicy',
  TERMS_CONDITIONS: 'TermsConditions',
} as const;

export const QUERY_KEYS = {
  USER_PROFILE: 'userProfile',
  RECENTLY_PLAYED: 'recentlyPlayed',
  RECOMMENDATIONS: 'recommendations',
  PLAYLISTS: 'playlists',
  PLAYLIST_DETAIL: 'playlistDetail',
  SEARCH: 'search',
  LOCAL_TRACKS: 'localTracks',
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'dollop_access_token',
  REFRESH_TOKEN: 'dollop_refresh_token',
  LOCAL_MUSIC_ENABLED: 'dollop_local_music_enabled',
  THEME_PREFERENCE: 'dollop_theme_preference',
} as const;

export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: "Network request failed. If you're on a physical device, set EXPO_PUBLIC_API_BASE_URL to your machine's LAN IP (e.g. http://192.168.x.x:4000/api/v1) — not localhost.",
  AUTH_FAILED: 'Authentication failed. Please sign in again.',
  INVALID_OTP: 'The code you entered is invalid or has expired.',
  EMAIL_REQUIRED: 'Please enter your email address.',
  EMAIL_INVALID: 'Please enter a valid email address.',
  OTP_RATE_LIMIT: 'Too many code requests. Please wait a few minutes before trying again.',
} as const;

export const OTP_COOLDOWN_SECONDS = 60;