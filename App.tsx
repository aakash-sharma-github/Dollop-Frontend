import React, { useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@theme/index';
import { RootNavigator } from '@navigation/RootNavigator';
import { useAuthStore } from '@store/authStore';
import { useThemeStore } from '@store/themeStore';
import { useLocalPlaylistStore } from '@store/localPlaylistStore';
import { setupAudioPlayer } from '@store/playerStore';
import { OfflineBanner } from '@components/common/OfflineBanner';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent(): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const hydrateAuth = useAuthStore((s) => s.hydrateFromStorage);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loadTheme = useThemeStore((s) => s.loadPreference);
  const loadLocalPlaylists = useLocalPlaylistStore((s) => s.load);

  const init = useCallback(async () => {
    try {
      // Run all init tasks in parallel — fastest possible startup
      await Promise.all([
        setupAudioPlayer(),
        loadTheme(),
        loadLocalPlaylists(),
        hydrateAuth(),  // restored from cache immediately inside this fn
      ]);
    } catch (err) {
      console.warn('[App] init error:', err);
    } finally {
      await SplashScreen.hideAsync();
    }
  }, [hydrateAuth, loadTheme, loadLocalPlaylists]);

  useEffect(() => { void init(); }, [init]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});