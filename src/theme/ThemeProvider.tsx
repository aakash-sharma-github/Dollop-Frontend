import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, LightTheme, type AppTheme } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, Layout, Shadow } from './spacing';

export interface Theme {
  colors: AppTheme;
  typography: typeof Typography;
  spacing: typeof Spacing;
  borderRadius: typeof BorderRadius;
  layout: typeof Layout;
  shadow: typeof Shadow;
  isDark: boolean;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? DarkTheme : LightTheme,
      typography: Typography,
      spacing: Spacing,
      borderRadius: BorderRadius,
      layout: Layout,
      shadow: Shadow,
      isDark,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
