import { normalizeColorMode, researchPrefsFromUserData } from './researchPrefs';

describe('researchPrefs', () => {
  test('normalizeColorMode accepts valid modes', () => {
    expect(normalizeColorMode('historical')).toBe('historical');
    expect(normalizeColorMode('sector')).toBe('sector');
    expect(normalizeColorMode('bogus')).toBe('deep_value');
  });

  test('researchPrefsFromUserData maps API fields', () => {
    expect(researchPrefsFromUserData({
      researchColorMode: 'sector',
      researchHeatLegend: false,
    })).toEqual({
      colorMode: 'sector',
      showHeatLegend: false,
    });
    expect(researchPrefsFromUserData({})).toEqual({
      colorMode: 'deep_value',
      showHeatLegend: true,
    });
  });
});
