import { useColorScheme } from 'react-native';
import { Palettes, ColorScheme, Palette } from '@/constants/theme';
import { useSettingsStore } from '@/stores/settingsStore';

/** Thème effectif : préférence utilisateur, sinon réglage système. */
export function useAppTheme(): { scheme: ColorScheme; colors: Palette; isDark: boolean } {
  const system = useColorScheme();
  const mode = useSettingsStore((s) => s.themeMode);
  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return { scheme, colors: Palettes[scheme], isDark: scheme === 'dark' };
}
