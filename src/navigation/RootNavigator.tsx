import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '@constants/index';
import type { RootStackParamList } from '@types/navigation';
import { useAuthStore } from '@store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { PlayerScreen } from '@screens/Player/PlayerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabNavigator} />
          <Stack.Screen
            name={ROUTES.PLAYER}
            component={PlayerScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }}
          />
        </>
      ) : (
        <Stack.Screen name={ROUTES.AUTH_STACK} component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
