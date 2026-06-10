import {
  buildPortfolioPercentileRanks,
  buildRowsByTicker,
  formatCompareSnapshotValue,
} from './portfolioCompare';

describe('portfolioCompare', () => {
  const universe = [
    { ticker: 'AAPL', pe: 10, bp: 3 },
    { ticker: 'MSFT', pe: 20, bp: 1 },
    { ticker: 'JPM', pe: 15, bp: 2 },
  ];

  it('formats snapshot values', () => {
    expect(formatCompareSnapshotValue(null, 'decimal')).toBe('—');
    expect(formatCompareSnapshotValue(0.12, 'percentFraction')).toContain('%');
  });

  it('builds ticker row map', () => {
    expect(buildRowsByTicker(universe)).toEqual({
      AAPL: universe[0],
      MSFT: universe[1],
      JPM: universe[2],
    });
  });

  it('computes percentile ranks within universe', () => {
    const ranks = buildPortfolioPercentileRanks(universe, ['pe', 'bp'], ['AAPL', 'MSFT']);
    expect(ranks.AAPL.pe).toBe(0);
    expect(ranks.MSFT.pe).toBe(100);
    expect(ranks.AAPL.bp).toBe(100);
    expect(ranks.MSFT.bp).toBe(0);
  });
});
