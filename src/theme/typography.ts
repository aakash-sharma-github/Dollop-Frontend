import { Platform } from 'react-native';

const fontFamily = {
  display: Platform.select({ ios: 'Georgia', android: 'serif' }) ?? 'Georgia',
  sans: Platform.select({ ios: 'System', android: 'sans-serif' }) ?? 'System',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'Menlo',
} as const;

export const Typography = {
  displayXl: { fontFamily: fontFamily.display, fontSize: 36, lineHeight: 44, fontWeight: '700' as const, letterSpacing: -0.5 },
  displayLg: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 36, fontWeight: '600' as const, letterSpacing: -0.25 },
  h1: { fontFamily: fontFamily.sans, fontSize: 24, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.2 },
  h2: { fontFamily: fontFamily.sans, fontSize: 20, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.1 },
  h3: { fontFamily: fontFamily.sans, fontSize: 17, lineHeight: 24, fontWeight: '600' as const, letterSpacing: 0 },
  h4: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 22, fontWeight: '600' as const, letterSpacing: 0 },
  bodyLg: { fontFamily: fontFamily.sans, fontSize: 17, lineHeight: 26, fontWeight: '400' as const, letterSpacing: 0 },
  bodyMd: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 23, fontWeight: '400' as const, letterSpacing: 0 },
  bodySm: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 20, fontWeight: '400' as const, letterSpacing: 0 },
  labelLg: { fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 20, fontWeight: '500' as const, letterSpacing: 0.1 },
  labelMd: { fontFamily: fontFamily.sans, fontSize: 13, lineHeight: 18, fontWeight: '500' as const, letterSpacing: 0.2 },
  labelSm: { fontFamily: fontFamily.sans, fontSize: 11, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.4 },
  labelXs: { fontFamily: fontFamily.sans, fontSize: 10, lineHeight: 14, fontWeight: '500' as const, letterSpacing: 0.6 },
} as const;

export type TypographyKey = keyof typeof Typography;
