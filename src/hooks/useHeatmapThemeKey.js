import { useTheme } from '../context/ThemeContext';

/**
 * useMemo dependency for row/cell heat styles — recomputes when light/dark toggles.
 */
export function useHeatmapThemeKey() {
  const { theme } = useTheme();
  return theme;
}
