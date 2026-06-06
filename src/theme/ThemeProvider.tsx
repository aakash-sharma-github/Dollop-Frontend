import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, LightTheme, type AppTheme } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, Layout, Shadow } from './spacing';
import { useThemeStore, type ThemePreference } from '@store/themeStore';

export interface Theme {
  colors: AppTheme;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  layout: typeof Layout;
  shadow: typeof Shadow;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const systemScheme = useColorScheme();
  const { preference, isLoaded, loadPreference, setPreference } = useThemeStore();

  // Load persisted preference once on mount
  useEffect(() => {
    void loadPreference();
  }, [loadPreference]);

  const isDark = useMemo(() => {
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return systemScheme === 'dark';
  }, [preference, systemScheme]);

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? DarkTheme : LightTheme,
      typography: Typography,
      spacing: Spacing,
      borderRadius: BorderRadius,
      layout: Layout,
      shadow: Shadow,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference, setPreference],
  );

  // Don't render children until preference is loaded from storage
  // to avoid a flash of wrong theme on startup
  if (!isLoaded) return <></>;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}