export const Spacing = {
  px: 1, 0.5: 2, 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 3.5: 14,
  4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 9: 36, 10: 40, 12: 48,
  14: 56, 16: 64, 20: 80, 24: 96,
} as const;

export const BorderRadius = {
  none: 0, sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20, '3xl': 28, full: 9999,
} as const;

export const Layout = {
  tabBarHeight: 64,
  miniPlayerHeight: 72,
  headerHeight: 56,
  screenPaddingH: 20,
  screenPaddingV: 16,
  sectionSpacing: 32,
  iconSm: 16, iconMd: 20, iconLg: 24, iconXl: 32,
  artworkSm: 48, artworkMd: 64, artworkLg: 120, artworkXl: 240,
  touchTarget: 44,
} as const;

export const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.30, shadowRadius: 16, elevation: 8 },
} as const;
