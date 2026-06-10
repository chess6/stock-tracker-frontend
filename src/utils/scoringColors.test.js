import registrySnapshot from '../config/__fixtures__/metric_registry.snapshot.json';
import {
  applyRegistryRules,
  buildHistoricalStats,
  describeHeat,
  getMetricBackground,
  getScoreTier,
  METRIC_RULES,
  precomputeScreenerRowHeatStyles,
  screenerCellHeatStyle,
  tierFromRegistryThresholds,
} from './scoringColors';

describe('scoringColors', () => {
  beforeEach(() => {
    applyRegistryRules(registrySnapshot.metrics);
  });

  test('registry rules include thresholds from backend snapshot', () => {
    expect(METRIC_RULES.pe.dangerThreshold).toBe(40);
    expect(METRIC_RULES.pe.excellentThreshold).toBe(8);
    expect(METRIC_RULES.pe.higherIsBetter).toBe(false);
    expect(METRIC_RULES.grossMargin.excellentThreshold).toBe(0.5);
    expect(METRIC_RULES.piotroskiF.scoreType).toBe('piotroski');
  });

  test('tierFromRegistryThresholds uses registry pe bands', () => {
    expect(tierFromRegistryThresholds(6, METRIC_RULES.pe)).toBe(5);
    expect(tierFromRegistryThresholds(45, METRIC_RULES.pe)).toBe(0);
    expect(tierFromRegistryThresholds(55, METRIC_RULES.pe)).toBe(0);
  });

  test('negative profitability forces distress tier', () => {
    expect(getScoreTier(-0.05, 'grossMargin', { mode: 'deep_value', format: 'percent' })).toBe(0);
  });

  test('deep_value pe tiers from registry', () => {
    expect(getScoreTier(6, 'pe', { mode: 'deep_value' })).toBe(5);
    expect(getScoreTier(45, 'pe', { mode: 'deep_value' })).toBe(0);
    expect(getScoreTier(55, 'pe', { mode: 'deep_value' })).toBe(0);
  });

  test('piotroski elite at 8+', () => {
    expect(getScoreTier(8, 'piotroskiF', { mode: 'deep_value' })).toBe(5);
    expect(getScoreTier(2, 'piotroskiF', { mode: 'deep_value' })).toBe(0);
  });

  test('beneish negative values use score tier not distress guard', () => {
    expect(getScoreTier(-2.29, 'beneishM', { mode: 'deep_value' })).toBe(4);
    expect(getScoreTier(-2.75, 'beneishM', { mode: 'deep_value' })).toBe(4);
    expect(getScoreTier(-1.5, 'beneishM', { mode: 'deep_value' })).toBe(0);
  });

  test('beneish historical mode still uses score tiers', () => {
    const historical = buildHistoricalStats([-2.75, -2.64, -2.29, -2.07]);
    expect(getScoreTier(-2.29, 'beneishM', { mode: 'historical', historical })).toBe(4);
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

  test('sector mode uses sector breakpoints', () => {
    const sector = buildHistoricalStats([0.1, 0.2, 0.3, 0.4, 0.5]);
    const tier = getScoreTier(0.5, 'grossMargin', {
      mode: 'sector',
      format: 'percent',
      sector,
    });
    expect(tier).toBe(5);
  });

  test('screenerCellHeatStyle returns background for sector mode', () => {
    const sector = buildHistoricalStats([0.2, 0.3, 0.4, 0.5, 0.6]);
    const style = screenerCellHeatStyle('grossMargin', 0.55, {
      mode: 'sector',
      format: 'percent',
      sectorBreakpoints: sector,
    });
    expect(style.backgroundColor).toBeTruthy();
  });

  test('cashToDebt uses registry thresholds not hard-coded bands', () => {
    expect(METRIC_RULES.cashToDebt.excellentThreshold).toBe(1.5);
    expect(getScoreTier(1.6, 'cashToDebt', { mode: 'deep_value' })).toBe(5);
    expect(getScoreTier(0.1, 'cashToDebt', { mode: 'deep_value' })).toBe(0);
  });

  test('precomputeScreenerRowHeatStyles fills per-ticker styles', () => {
    const row = {
      metricKey: 'grossMargin',
      format: 'percent',
      t0: 0.45,
      t1: 0.32,
      _historicalStats: buildHistoricalStats([0.45, 0.32]),
    };
    const styles = precomputeScreenerRowHeatStyles(
      row,
      ['AAPL', 'MSFT'],
      { AAPL: { sector: 'Technology' }, MSFT: { sector: 'Technology' } },
      null,
      'deep_value',
    );
    expect(styles.t0?.backgroundColor).toBeTruthy();
    expect(styles.t1?.backgroundColor).toBeTruthy();
    expect(styles.t0Title).toBeTruthy();
  });
});
