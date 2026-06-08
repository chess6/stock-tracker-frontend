import {
  computeYoY,
  computeCAGR,
  extractPeriodSeries,
  prepareSparklineData,
  trendArrow,
} from './researchCalculations';

describe('researchCalculations', () => {
  test('computeYoY', () => {
    expect(computeYoY(110, 100)).toBeCloseTo(10);
    expect(computeYoY(100, 0)).toBeNull();
  });

  test('computeCAGR', () => {
    expect(computeCAGR(100, 121, 2)).toBeCloseTo(10);
    expect(computeCAGR(-1, 10, 2)).toBeNull();
  });

  test('extractPeriodSeries', () => {
    const periods = [{ periodEnd: '2022-12-31', value: 1 }, { periodEnd: '2023-12-31', value: 2 }];
    expect(extractPeriodSeries(periods, 'value')).toEqual([1, 2]);
  });

  test('prepareSparklineData indexes values and adds padding', () => {
    const { data, yMin, yMax, trendUp } = prepareSparklineData([200, 220, 210], 'usd');
    expect(data[0]).toBeCloseTo(100);
    expect(data[1]).toBeCloseTo(110);
    expect(data[2]).toBeCloseTo(105);
    expect(yMax - yMin).toBeGreaterThan(10);
    expect(trendUp).toBe(true);
  });

  test('prepareSparklineData uses fixed bounds for score integers', () => {
    const { yMin, yMax } = prepareSparklineData([6, 7, 8], 'integer');
    expect(yMin).toBe(0);
    expect(yMax).toBe(9);
  });

  test('trendArrow', () => {
    expect(trendArrow(3)?.symbol).toBe('▲');
    expect(trendArrow(-2)?.symbol).toBe('▼');
  });
});
