export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
};

let currentTheme = THEMES.DARK;

export function getCurrentTheme() {
  return currentTheme;
}

export function isDarkTheme() {
  return currentTheme === THEMES.DARK;
}

/** Apply theme to DOM and in-memory state synchronously (before React re-render). */
export function applyTheme(theme) {
  const resolved = theme === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
  currentTheme = resolved;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-bs-theme', resolved);
  }
  return resolved;
}
