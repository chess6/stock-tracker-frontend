import {
  buildFormulaContextFromPeriod,
  buildFormulaContextFromPortfolioRow,
  buildFormulaContextFromScreenerRow,
  resolveFormulaMetricKey,
} from './formulaContext';

describe('formulaContext', () => {
  test('resolveFormulaMetricKey maps portfolio aliases', () => {
    expect(resolveFormulaMetricKey('tbp')).toBe('tangibleBookPerShare');
    expect(resolveFormulaMetricKey('sp')).toBe('salesPerShare');
  });

  test('buildFormulaContextFromPeriod includes fundamentals and inferred price', () => {
    const ctx = buildFormulaContextFromPeriod({
      fundamentals: { eps: 2, revenue: 100 },
      metrics: { pe: 10, grossMargin: 0.4 },
    });
    expect(ctx.fundamentals.revenue).toBe(100);
    expect(ctx.price.latest).toBe(20);
  });

  test('buildFormulaContextFromPortfolioRow attaches fundamentals blob', () => {
    const ctx = buildFormulaContextFromPortfolioRow({
      ticker: 'AAPL',
      price: 180,
      marketCap: 2e12,
      _fundamentals: { revenue: 400e9, sharesbas: 15e9 },
    });
    expect(ctx.fundamentals.revenue).toBe(400e9);
    expect(ctx.price.latest).toBe(180);
    expect(ctx.marketCap).toBe(2e12);
  });

  test('buildFormulaContextFromScreenerRow reads screener payload', () => {
    const ctx = buildFormulaContextFromScreenerRow({
      fundamentals: { gp: 50, revenue: 100 },
      metrics: { grossMargin: 0.5 },
      price: { latest: 12 },
    });
    expect(ctx.fundamentals.gp).toBe(50);
    expect(ctx.price.latest).toBe(12);
  });
});
