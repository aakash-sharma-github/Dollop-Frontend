import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ROUTES } from '@constants/index';
import type { MainTabParamList } from '@types/navigation';
import { useTheme } from '@theme/index';
import { Layout } from '@theme/spacing';
import { HomeScreen } from '@screens/Home/HomeScreen';
import { SearchScreen } from '@screens/Search/SearchScreen';
import { LibraryScreen } from '@screens/Library/LibraryScreen';
import { ProfileScreen } from '@screens/Profile/ProfileScreen';
import { MiniPlayer } from '@components/player/MiniPlayer';
import { TabBarIcon } from '@components/navigation/TabBarIcon';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator(): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: Layout.tabBarHeight,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.4, marginTop: 2 },
        }}
      >
        <Tab.Screen
          name={ROUTES.HOME}
          component={HomeScreen}
          options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, focused }) => <TabBarIcon name="home" color={color} focused={focused} /> }}
        />
        <Tab.Screen
          name={ROUTES.SEARCH}
          component={SearchScreen}
          options={{ tabBarLabel: 'Search', tabBarIcon: ({ color, focused }) => <TabBarIcon name="search" color={color} focused={focused} /> }}
        />
        <Tab.Screen
          name={ROUTES.LIBRARY}
          component={LibraryScreen}
          options={{ tabBarLabel: 'Library', tabBarIcon: ({ color, focused }) => <TabBarIcon name="library" color={color} focused={focused} /> }}
        />
        <Tab.Screen
          name={ROUTES.PROFILE}
          component={ProfileScreen}
          options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, focused }) => <TabBarIcon name="profile" color={color} focused={focused} /> }}
        />
      </Tab.Navigator>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
