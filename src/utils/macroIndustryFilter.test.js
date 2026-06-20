import {
  filterPortfolioByMacroIndustries,
  filterPortfolioByMacroTiles,
  groupPortfolioRowsBySector,
  portfolioRowMatchesMacroIndustry,
  portfolioRowMatchesMacroTile,
} from './macroIndustryFilter';

describe('macroIndustryFilter', () => {
  const rows = [
    { ticker: 'AAPL', sector: 'Technology & Services' },
    { ticker: 'JPM', sector: 'Financials' },
    { ticker: 'XOM', sector: 'Energy' },
    { ticker: 'AMZN', sector: 'Consumer Discretionary' },
    { ticker: 'QQQ', sector: null },
  ];

  it('matches coarse SIC sectors for macro industry ids', () => {
    expect(portfolioRowMatchesMacroIndustry(rows[0], 'xlk')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[1], 'xlf')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[2], 'xle')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[3], 'xly')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[0], 'xlf')).toBe(false);
  });

  it('matches index and commodity tiles', () => {
    expect(portfolioRowMatchesMacroTile(rows[0], 'spy')).toBe(true);
    expect(portfolioRowMatchesMacroTile(rows[4], 'qqq')).toBe(true);
    expect(portfolioRowMatchesMacroTile(rows[2], 'uso')).toBe(true);
    expect(portfolioRowMatchesMacroTile(rows[0], 'gld')).toBe(false);
  });

  it('filters portfolio rows by multiple selected tiles', () => {
    const selected = new Set(['xlk', 'xlf']);
    const filtered = filterPortfolioByMacroIndustries(rows, selected);
    expect(filtered.map((row) => row.ticker)).toEqual(['AAPL', 'JPM']);
  });

  it('filters by broad index tiles', () => {
    const filtered = filterPortfolioByMacroTiles(rows, new Set(['spy']));
    expect(filtered).toHaveLength(rows.length);
  });

  it('groups filtered rows by sector', () => {
    const grouped = groupPortfolioRowsBySector(rows);
    expect(grouped.map((group) => group.sector)).toEqual([
      'Consumer Discretionary',
      'Energy',
      'Financials',
      'Technology & Services',
      'Unknown sector',
    ]);
    expect(grouped[2].rows.map((row) => row.ticker)).toEqual(['JPM']);
  });
});
