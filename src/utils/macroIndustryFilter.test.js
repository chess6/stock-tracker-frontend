import {
  filterPortfolioByMacroIndustries,
  groupPortfolioRowsBySector,
  portfolioRowMatchesMacroIndustry,
} from './macroIndustryFilter';

describe('macroIndustryFilter', () => {
  const rows = [
    { ticker: 'AAPL', sector: 'Technology & Services' },
    { ticker: 'JPM', sector: 'Financials' },
    { ticker: 'XOM', sector: 'Energy' },
    { ticker: 'AMZN', sector: 'Consumer Discretionary' },
  ];

  it('matches coarse SIC sectors for macro industry ids', () => {
    expect(portfolioRowMatchesMacroIndustry(rows[0], 'xlk')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[1], 'xlf')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[2], 'xle')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[3], 'xly')).toBe(true);
    expect(portfolioRowMatchesMacroIndustry(rows[0], 'xlf')).toBe(false);
  });

  it('filters portfolio rows by multiple selected industries', () => {
    const selected = new Set(['xlk', 'xlf']);
    const filtered = filterPortfolioByMacroIndustries(rows, selected);
    expect(filtered.map((row) => row.ticker)).toEqual(['AAPL', 'JPM']);
  });

  it('groups filtered rows by sector', () => {
    const grouped = groupPortfolioRowsBySector(rows);
    expect(grouped.map((group) => group.sector)).toEqual([
      'Consumer Discretionary',
      'Energy',
      'Financials',
      'Technology & Services',
    ]);
    expect(grouped[2].rows.map((row) => row.ticker)).toEqual(['JPM']);
  });
});
