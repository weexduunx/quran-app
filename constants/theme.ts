/**
 * Design system de l'application.
 *
 * Direction : « Émeraude & Sable » — un vert profond apaisant, un fond ivoire
 * qui rappelle le papier des moushafs, et un or doux réservé aux accents
 * (numéros de versets, éléments actifs). Le reste de l'interface reste sobre
 * pour laisser la place au texte sacré.
 */

import { Platform } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  elevated: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  onPrimary: string;
  gold: string;
  goldSoft: string;
  arabic: string;
  danger: string;
  overlay: string;
  // Compatibilité avec les composants du template Expo
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

export const Palettes: Record<ColorScheme, Palette> = {
  light: {
    background: '#F8F5EE',
    surface: '#FFFFFF',
    surfaceAlt: '#F1ECE0',
    elevated: '#FFFFFF',
    border: '#E6DFCF',
    text: '#17201C',
    textMuted: '#5E6863',
    textSubtle: '#8C948F',
    primary: '#12664B',
    primaryStrong: '#0B3D2E',
    primarySoft: '#E3F0EA',
    onPrimary: '#FFFFFF',
    gold: '#B08A3E',
    goldSoft: '#F4EAD3',
    arabic: '#0E2A20',
    danger: '#B3261E',
    overlay: 'rgba(11, 20, 17, 0.45)',
    tint: '#12664B',
    icon: '#5E6863',
    tabIconDefault: '#8C948F',
    tabIconSelected: '#12664B',
  },
  dark: {
    background: '#0B1311',
    surface: '#121C19',
    surfaceAlt: '#18251F',
    elevated: '#1C2A24',
    border: '#24342D',
    text: '#EBEFEA',
    textMuted: '#A3ADA7',
    textSubtle: '#76817B',
    primary: '#48B98F',
    primaryStrong: '#0E3A2C',
    primarySoft: '#16302A',
    onPrimary: '#06120E',
    gold: '#D8B766',
    goldSoft: '#2B2617',
    arabic: '#F3EEDF',
    danger: '#F2B8B5',
    overlay: 'rgba(0, 0, 0, 0.55)',
    tint: '#48B98F',
    icon: '#A3ADA7',
    tabIconDefault: '#76817B',
    tabIconSelected: '#48B98F',
  },
};

/** Alias conservé pour les anciens composants (themed-text, use-theme-color…) */
export const Colors = Palettes;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const ArabicFonts = {
  regular: 'ScheherazadeNew_400Regular',
  bold: 'ScheherazadeNew_700Bold',
  display: 'Amiri_400Regular',
} as const;

export const Type = {
  largeTitle: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.2 },
};

export const shadow = (scheme: ColorScheme, level: 1 | 2 = 1) =>
  scheme === 'dark'
    ? {}
    : {
        shadowColor: '#3A2E12',
        shadowOffset: { width: 0, height: level === 1 ? 2 : 6 },
        shadowOpacity: level === 1 ? 0.06 : 0.1,
        shadowRadius: level === 1 ? 6 : 16,
        elevation: level === 1 ? 2 : 6,
      };

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
