import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES } from '@constants/index';
import type { AuthStackParamList } from '@types/navigation';
import { LoginScreen } from '@screens/Auth/LoginScreen';
import { OtpVerifyScreen } from '@screens/Auth/OtpVerifyScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.OTP_VERIFY} component={OtpVerifyScreen} />
    </Stack.Navigator>
  );
}
