import {
  formatCompositeScore,
  formatFactorPercentile,
  rankResultsByTicker,
  sortFactorsByContribution,
} from './compositeRank';

describe('compositeRank utils', () => {
  it('sorts factors by contribution descending', () => {
    const sorted = sortFactorsByContribution([
      { key: 'a', contribution: 0.1 },
      { key: 'b', contribution: 0.3 },
      { key: 'c', contribution: 0.2 },
    ]);
    expect(sorted.map((item) => item.key)).toEqual(['b', 'c', 'a']);
  });

  it('formats composite score and percentile', () => {
    expect(formatCompositeScore(0.7123)).toBe('0.712');
    expect(formatFactorPercentile(0.62)).toBe('P62');
    expect(formatCompositeScore(null)).toBe('—');
  });

  it('indexes rank results by ticker', () => {
    const map = rankResultsByTicker([
      { ticker: 'AAPL', compositeScore: 0.8 },
      { ticker: 'MSFT', compositeScore: 0.7 },
    ]);
    expect(map.AAPL.compositeScore).toBe(0.8);
    expect(map.MSFT.compositeScore).toBe(0.7);
  });
});
