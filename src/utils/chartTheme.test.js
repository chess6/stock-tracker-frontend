import { apexBaseOptions, isDarkTheme, mergeApexOptions } from './chartTheme';

describe('chartTheme', () => {
  const originalTheme = document.documentElement.getAttribute('data-bs-theme');

  afterEach(() => {
    if (originalTheme) {
      document.documentElement.setAttribute('data-bs-theme', originalTheme);
    } else {
      document.documentElement.removeAttribute('data-bs-theme');
    }
  });

  test('isDarkTheme reflects document attribute', () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    expect(isDarkTheme()).toBe(true);
    document.documentElement.setAttribute('data-bs-theme', 'light');
    expect(isDarkTheme()).toBe(false);
  });

  test('apexBaseOptions uses dark foreground colors in dark mode', () => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    const opts = apexBaseOptions();
    expect(opts.theme.mode).toBe('dark');
    expect(opts.chart.foreColor).toBe('#dee2e6');
    expect(opts.dataLabels.style.colors).toEqual(['#f8f9fa']);
  });

  test('mergeApexOptions preserves page-specific chart config', () => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    const merged = mergeApexOptions({ title: { text: 'Test Chart' } });
    expect(merged.title.text).toBe('Test Chart');
    expect(merged.theme.mode).toBe('light');
  });
});
