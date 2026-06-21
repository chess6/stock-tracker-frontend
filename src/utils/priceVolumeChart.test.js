import {
  PRICE_CHART_RANGES,
  EXTENDED_HISTORY_RANGES,
  normalizePriceHistory,
  mergePriceHistories,
  filterPriceHistoryByRange,
  computeRangePerformance,
  isLimitedHistory,
  buildInsiderBuyAnnotations,
  buildPeriodEndAnnotations,
  tightPriceBounds,
  tightVolumeBounds,
  marketHistoryChartHeight,
} from './priceVolumeChart';

describe('priceVolumeChart utils', () => {
  const sampleHistory = [
    { date: '2024-01-02', close: 100, volume: 1000 },
    { date: '2024-06-02', close: 110, volume: 1200 },
    { date: '2025-01-02', close: 120, volume: 1500 },
    { date: '2025-06-02', close: 130, volume: 1800 },
  ];

  it('exports expected range presets', () => {
    expect(PRICE_CHART_RANGES).toEqual(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'MAX']);
    expect(EXTENDED_HISTORY_RANGES.has('3Y')).toBe(true);
  });

  it('merges and dedupes price history by date', () => {
    const merged = mergePriceHistories(
      [{ date: '2024-01-02', close: 100 }],
      [{ date: '2024-01-02', close: 101 }, { date: '2024-02-02', close: 105 }],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].close).toBe(101);
  });

  it('computes range performance from first and last close', () => {
    const perf = computeRangePerformance(sampleHistory);
    expect(perf.startClose).toBe(100);
    expect(perf.endClose).toBe(130);
    expect(perf.absReturn).toBe(30);
    expect(perf.pctReturn).toBeCloseTo(30, 5);
  });

  it('filters MAX to full ordered history', () => {
    const filtered = filterPriceHistoryByRange(sampleHistory, 'MAX');
    expect(filtered).toHaveLength(4);
  });

  it('builds insider buy annotations for buy codes only', () => {
    const markers = buildInsiderBuyAnnotations([
      { transactionDate: '2024-06-02', transactionCode: 'P' },
      { transactionDate: '2024-06-02', transactionCode: 'S' },
      { transactionDate: '2025-01-02', isBuy: true },
    ], '2024-01-02', '2025-06-02');
    expect(markers).toHaveLength(2);
    expect(markers[0].label.text).toBe('Buy');
  });

  it('builds period-end annotations from periodEnd', () => {
    const markers = buildPeriodEndAnnotations([
      { periodEnd: '2024-03-31' },
      { periodEnd: '2024-06-30' },
    ], '2024-01-02', '2025-06-02');
    expect(markers).toHaveLength(2);
    expect(markers[0].label.text).toBe('FY/Q');
  });

  it('flags limited history when coverage is short', () => {
    expect(isLimitedHistory(sampleHistory, '5Y', new Date('2025-06-02'))).toBe(true);
    expect(isLimitedHistory(sampleHistory, 'MAX', new Date('2025-06-02'))).toBe(false);
  });

  it('normalizes unsorted rows', () => {
    const ordered = normalizePriceHistory([
      { date: '2025-01-02', close: 2 },
      { date: '2024-01-02', close: 1 },
    ]);
    expect(ordered.map((row) => row.date)).toEqual(['2024-01-02', '2025-01-02']);
  });

  it('tightens price axis to the visible range', () => {
    const bounds = tightPriceBounds(sampleHistory);
    expect(bounds.min).toBeLessThan(100);
    expect(bounds.max).toBeGreaterThan(130);
    expect(bounds.max - bounds.min).toBeLessThan(50);
  });

  it('scales chart height from container width', () => {
    const priceOnly = marketHistoryChartHeight(900, { showVolume: false, pointCount: 120 });
    const withVolume = marketHistoryChartHeight(900, { showVolume: true, pointCount: 120 });
    expect(priceOnly).toBeGreaterThan(withVolume);
    expect(priceOnly).toBeGreaterThanOrEqual(220);
  });

  it('builds explicit volume axis bounds from zero', () => {
    const bounds = tightVolumeBounds([
      { y: 10_000_000 },
      { y: 85_962_200 },
    ]);
    expect(bounds.min).toBe(0);
    expect(bounds.max).toBeGreaterThan(85_962_200);
  });
});
