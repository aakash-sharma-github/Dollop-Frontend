import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '@constants/index';
import type { RootStackParamList } from '@app-types/navigation';
import { useAuthStore } from '@store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { PlayerScreen } from '@screens/Player/PlayerScreen';
import { SettingsScreen } from '@screens/Settings/SettingsScreen';
import { SpotifyImportScreen } from '@screens/SpotifyImport/SpotifyImportScreen';
import { PrivacyPolicyScreen } from '@screens/Legal/PrivacyPolicyScreen';
import { TermsConditionsScreen } from '@screens/Legal/TermsConditionsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabNavigator} />
          <Stack.Screen name={ROUTES.PLAYER} component={PlayerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }} />
          <Stack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name={ROUTES.SPOTIFY_IMPORT} component={SpotifyImportScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name={ROUTES.PRIVACY_POLICY} component={PrivacyPolicyScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name={ROUTES.TERMS_CONDITIONS} component={TermsConditionsScreen} options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        <>
          <Stack.Screen name={ROUTES.AUTH_STACK} component={AuthNavigator} />
          <Stack.Screen name={ROUTES.PRIVACY_POLICY} component={PrivacyPolicyScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name={ROUTES.TERMS_CONDITIONS} component={TermsConditionsScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </>
      )}
    </Stack.Navigator>
  );
}