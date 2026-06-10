import {
  buildVisibleColumnsForPreset,
  DEFAULT_PORTFOLIO_PRESET_ID,
  getActivePortfolioPresetId,
  getPortfolioPresetById,
  resetPortfolioPresetStorageForTests,
  setActivePortfolioPresetId,
} from '../config/portfolioPresets';

describe('portfolioPresets', () => {
  beforeEach(() => {
    resetPortfolioPresetStorageForTests();
  });

  it('returns known presets with sort + columns', () => {
    const preset = getPortfolioPresetById('deep_value');
    expect(preset.label).toBe('Deep Value');
    expect(preset.visibleColumns).toEqual(
      expect.arrayContaining(['pe', 'bp', 'ep', 'sfcfp', 'de']),
    );
    expect(preset.defaultSort).toEqual({ id: 'bp', desc: true });
  });

  it('buildVisibleColumnsForPreset keeps select + ticker and filters unknown ids', () => {
    const preset = getPortfolioPresetById('distressed');
    const cols = buildVisibleColumnsForPreset(preset, [
      'select',
      'ticker',
      'de',
      'currentRatio',
      'unknown',
    ]);
    expect(cols).toEqual(['select', 'ticker', 'de', 'currentRatio']);
  });

  it('persists active preset id in localStorage', () => {
    expect(getActivePortfolioPresetId()).toBe(DEFAULT_PORTFOLIO_PRESET_ID);
    setActivePortfolioPresetId('insider_activity');
    expect(getActivePortfolioPresetId()).toBe('insider_activity');
  });

  it('falls back to default for unknown stored preset id', () => {
    localStorage.setItem(
      'portfolio-research-presets',
      JSON.stringify({ activePresetId: 'missing-preset' }),
    );
    expect(getActivePortfolioPresetId()).toBe(DEFAULT_PORTFOLIO_PRESET_ID);
  });
});
