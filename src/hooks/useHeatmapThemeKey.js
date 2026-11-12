import { useThemeName } from '../context/ThemeContext';

/**
 * useMemo dependency for row/cell heat styles — recomputes when light/dark toggles.
 */
export function useHeatmapThemeKey() {
  // Only the theme name is needed, so components using heat styles also render
  // outside ThemeProvider (isolated tests, embeds).
  return useThemeName();
}
