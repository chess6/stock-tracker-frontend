import { getMetricFormulaBreakdown, formatMetricFormulaBreakdown } from './metricFormulaBreakdown';

describe('metricFormulaBreakdown', () => {
  const tickerData = {
    fundamentals: {
      revenue: 439_400_000_000,
      gp: 392_400_000_000,
      netinc: 97_000_000_000,
      equity: 62_000_000_000,
      debt: 110_000_000_000,
      eps: 6.42,
    },
    price: { latest: 185.5 },
  };

  test('formats gross margin as compact fraction with spaced suffix', () => {
    const breakdown = getMetricFormulaBreakdown('grossMargin', tickerData, 0.8927);
    expect(breakdown).toEqual({
      numerator: '$392 B',
      denominator: '$439 B',
      result: '89.27%',
    });
    expect(formatMetricFormulaBreakdown('grossMargin', tickerData, 0.8927))
      .toBe('$392 B ÷ $439 B = 89.27%');
  });

  test('formats net margin from net income and revenue', () => {
    const line = formatMetricFormulaBreakdown('netMargin', tickerData, 0.22);
    expect(line).toBe('$97.0 B ÷ $439 B = 22.00%');
  });

  test('formats P/E from price and EPS', () => {
    const line = formatMetricFormulaBreakdown('pe', tickerData, 28.89);
    expect(line).toBe('$185.50 ÷ 6.42 = 28.89');
  });

  test('formats D/E from debt and equity', () => {
    const line = formatMetricFormulaBreakdown('de', tickerData, 1.77);
    expect(line).toBe('$110 B ÷ $62.0 B = 1.77');
  });

  test('derives gross profit from revenue minus cost of revenue', () => {
    const line = formatMetricFormulaBreakdown('grossMargin', {
      fundamentals: { revenue: 100, cor: 20 },
    }, 0.8);
    expect(line).toBe('$80.00 ÷ $100.00 = 80.00%');
  });

  test('returns null when operands are missing', () => {
    expect(formatMetricFormulaBreakdown('grossMargin', { fundamentals: { revenue: 100 } }, 0.5)).toBeNull();
    expect(formatMetricFormulaBreakdown('piotroskiF', tickerData, 8)).toBeNull();
  });
});
