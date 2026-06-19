import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import API_ENDPOINTS from '../apiConfig';
import { loadUserPreferences } from '../utils/portfolio';
import { clearHeatmapCache } from '../utils/heatmapCache';
import { THEMES, applyTheme, getCurrentTheme } from '../utils/themeState';

export { THEMES, applyTheme };

export function getStoredTheme() {
  return getCurrentTheme();
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => applyTheme(THEMES.DARK));

  useEffect(() => {
    let cancelled = false;
    loadUserPreferences().then((prefs) => {
      if (cancelled) return;
      if (prefs?.theme === THEMES.LIGHT || prefs?.theme === THEMES.DARK) {
        applyTheme(prefs.theme);
        clearHeatmapCache();
        setThemeState(prefs.theme);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const setTheme = (next) => {
    const resolved = applyTheme(next);
    clearHeatmapCache();
    setThemeState(resolved);
    fetch(API_ENDPOINTS.PREFERENCES, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: resolved }),
    }).catch(() => {});
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      isDark: theme === THEMES.DARK,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
