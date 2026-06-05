import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ROUTES } from '@constants/index';

export type AuthStackParamList = {
  [ROUTES.LOGIN]: undefined;
  // sentAt: unix timestamp (ms) when OTP was sent — used to compute resend cooldown
  [ROUTES.OTP_VERIFY]: { email: string; sentAt: number };
  [ROUTES.PRIVACY_POLICY]: undefined;
  [ROUTES.TERMS_CONDITIONS]: undefined;
};

export type MainTabParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.SEARCH]: undefined;
  [ROUTES.LIBRARY]: undefined;
  [ROUTES.PROFILE]: undefined;
  [ROUTES.SETTINGS]: undefined;
};

export type RootStackParamList = {
  [ROUTES.AUTH_STACK]: undefined;
  [ROUTES.MAIN_TABS]: undefined;
  [ROUTES.PLAYER]: undefined;
  [ROUTES.SETTINGS]: undefined;
  [ROUTES.PRIVACY_POLICY]: undefined;
  [ROUTES.TERMS_CONDITIONS]: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, typeof ROUTES.LOGIN>;
export type OtpVerifyScreenProps = NativeStackScreenProps<AuthStackParamList, typeof ROUTES.OTP_VERIFY>;
export type HomeScreenProps = BottomTabScreenProps<MainTabParamList, typeof ROUTES.HOME>;
export type SearchScreenProps = BottomTabScreenProps<MainTabParamList, typeof ROUTES.SEARCH>;
export type LibraryScreenProps = BottomTabScreenProps<MainTabParamList, typeof ROUTES.LIBRARY>;
export type ProfileScreenProps = BottomTabScreenProps<MainTabParamList, typeof ROUTES.PROFILE>;
export type PlayerScreenProps = NativeStackScreenProps<RootStackParamList, typeof ROUTES.PLAYER>;
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, typeof ROUTES.SETTINGS>;
export type PrivacyPolicyScreenProps = NativeStackScreenProps<RootStackParamList, typeof ROUTES.PRIVACY_POLICY>;
export type TermsConditionsScreenProps = NativeStackScreenProps<RootStackParamList, typeof ROUTES.TERMS_CONDITIONS>;
