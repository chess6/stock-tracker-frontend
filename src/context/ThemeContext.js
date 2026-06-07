import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import API_ENDPOINTS from '../apiConfig';
import { loadUserPreferences } from '../utils/portfolio';

export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
}

export function getStoredTheme() {
  return THEMES.DARK;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(THEMES.DARK);

  useEffect(() => {
    let cancelled = false;
    loadUserPreferences().then((prefs) => {
      if (cancelled) return;
      if (prefs?.theme === THEMES.LIGHT || prefs?.theme === THEMES.DARK) {
        setThemeState(prefs.theme);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next) => {
    const resolved = next === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
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
