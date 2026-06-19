import {
  COMPOSITE_PRESETS,
  getCompositeFactorDefs,
  getCompositePreset,
} from './compositePresets';

describe('compositePresets', () => {
  it('each preset factor weights sum to 1.0', () => {
    COMPOSITE_PRESETS.forEach((preset) => {
      const total = preset.factors.reduce((sum, factor) => sum + factor.weight, 0);
      expect(total).toBeCloseTo(1.0, 9);
    });
  });

  it('deep_value factor keys match backend preset', () => {
    const keys = getCompositeFactorDefs('deep_value').map((factor) => factor.key);
    expect(keys).toEqual([
      'valuation_dislocation',
      'survivability',
      'insider_conviction',
      'sentiment_divergence',
      'margin_stabilization',
      'fcf_quality',
    ]);
  });

  it('getCompositePreset falls back to deep_value', () => {
    expect(getCompositePreset('unknown').id).toBe('deep_value');
  });
});
