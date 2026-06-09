import {
  buildHistoricalStats,
  describeHeat,
  getMetricBackground,
  getScoreTier,
  METRIC_RULES,
} from './scoringColors';

describe('scoringColors', () => {
  test('negative profitability forces distress tier', () => {
    expect(getScoreTier(-0.05, 'grossMargin', { mode: 'deep_value', format: 'percent' })).toBe(0);
  });

  test('deep_value pe tiers cheap as elite', () => {
    expect(getScoreTier(6, 'pe', { mode: 'deep_value' })).toBe(5);
    expect(getScoreTier(45, 'pe', { mode: 'deep_value' })).toBe(1);
    expect(getScoreTier(55, 'pe', { mode: 'deep_value' })).toBe(0);
  });

  test('piotroski elite at 8+', () => {
    expect(getScoreTier(8, 'piotroskiF', { mode: 'deep_value' })).toBe(5);
    expect(getScoreTier(2, 'piotroskiF', { mode: 'deep_value' })).toBe(0);
  });

  test('historical mode uses row percentiles', () => {
    const historical = buildHistoricalStats([0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(getScoreTier(0.5, 'grossMargin', {
      mode: 'historical',
      format: 'percent',
      historical,
    })).toBe(5);
    expect(getScoreTier(0.1, 'grossMargin', {
      mode: 'historical',
      format: 'percent',
      historical,
    })).toBeLessThanOrEqual(1);
  });

  test('getMetricBackground returns heat style object', () => {
    const style = getMetricBackground('grossMargin', 0.35, { mode: 'deep_value', format: 'percent' });
    expect(style.backgroundColor).toContain('var(--st-heat');
  });

  test('share dilution buyback colors strong', () => {
    expect(getScoreTier(-0.1, 'shareDilutionRate', { mode: 'deep_value', format: 'percent' })).toBeGreaterThanOrEqual(3);
  });

  test('describeHeat includes mode and tier', () => {
    const text = describeHeat('altmanZ', 3.5, { mode: 'deep_value' });
    expect(text).toContain('deep value');
    expect(text).toContain('tier');
  });

  test('METRIC_RULES covers research ratio keys', () => {
    expect(METRIC_RULES.grossMargin.category).toBe('profitability');
    expect(METRIC_RULES.pe.higherIsBetter).toBe(false);
  });
});
