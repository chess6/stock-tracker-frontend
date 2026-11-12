import { apexBaseOptions, mergeApexOptions } from './chartTheme';
import { applyTheme, getCurrentTheme, isDarkTheme } from './themeState';

describe('chartTheme', () => {
  // Theme lives in themeState (applyTheme also sets data-bs-theme on <html>).
  const originalTheme = getCurrentTheme();

  afterEach(() => {
    applyTheme(originalTheme);
  });

  test('isDarkTheme reflects the applied theme', () => {
    applyTheme('dark');
    expect(isDarkTheme()).toBe(true);
    applyTheme('light');
    expect(isDarkTheme()).toBe(false);
  });

  test('apexBaseOptions uses dark foreground colors in dark mode', () => {
    applyTheme('dark');
    const opts = apexBaseOptions();
    expect(opts.theme.mode).toBe('dark');
    expect(opts.chart.foreColor).toBe('#dee2e6');
    expect(opts.dataLabels.style.colors).toEqual(['#f8f9fa']);
  });

  test('mergeApexOptions preserves page-specific chart config', () => {
    applyTheme('light');
    const merged = mergeApexOptions({ title: { text: 'Test Chart' } });
    expect(merged.title.text).toBe('Test Chart');
    expect(merged.theme.mode).toBe('light');
  });
});
