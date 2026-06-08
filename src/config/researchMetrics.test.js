import {
  buildGteDate,
  getScreenerMetricValue,
  rowTickerMinMax,
  SCREENER_METRIC_GROUPS,
} from './researchMetrics';

describe('researchMetrics screener helpers', () => {
  test('buildGteDate returns ISO date for numeric years', () => {
    const gte = buildGteDate(5);
    expect(gte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('buildGteDate empty for all years', () => {
    expect(buildGteDate('all')).toBe('');
  });
  test('getScreenerMetricValue reads nested paths', () => {
    const metric = SCREENER_METRIC_GROUPS[0].metrics.find((m) => m.id === 'pe');
    const row = { metrics: { pe: 18.5 } };
    expect(getScreenerMetricValue(row, metric)).toBe(18.5);
  });

  test('rowTickerMinMax computes across ticker columns', () => {
    const row = { t0: 10, t1: 20, t2: null };
    expect(rowTickerMinMax(row, 3)).toEqual({ min: 10, max: 20 });
  });
});
