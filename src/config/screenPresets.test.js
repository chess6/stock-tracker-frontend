import {
  DEFAULT_SCREEN_PRESET_ID,
  SCREEN_PRESETS,
  formatScreenFilter,
  getScreenPreset,
} from './screenPresets';

describe('screenPresets', () => {
  it('exposes ten built-in presets', () => {
    expect(SCREEN_PRESETS).toHaveLength(10);
    expect(getScreenPreset(DEFAULT_SCREEN_PRESET_ID).id).toBe('deep_value');
  });

  it('formats filter specs for display', () => {
    expect(formatScreenFilter({ metric: 'pb', op: 'lt', value: 0.7 })).toBe('pb < 0.7');
    expect(formatScreenFilter({ metric: 'buy6m', op: 'gte', value: 500000 })).toBe('buy6m ≥ 500000');
  });

  it('each preset has universe, filters, and sort', () => {
    SCREEN_PRESETS.forEach((preset) => {
      expect(preset.spec.universe).toBeTruthy();
      expect(preset.spec.filters.length).toBeGreaterThan(0);
      expect(preset.spec.sort?.metric).toBeTruthy();
    });
  });
});
