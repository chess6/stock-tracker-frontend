import {
  buildGroupedDisplayRows,
  DEFAULT_PORTFOLIO_GROUP_BY,
  getActivePortfolioGroupBy,
  getCollapsedPortfolioGroups,
  insiderActivityBucket,
  marketCapBucket,
  resetPortfolioGroupStorageForTests,
  setActivePortfolioGroupBy,
  setCollapsedPortfolioGroups,
  sortPortfolioRows,
} from './portfolioRowGroups';

const sampleRows = [
  { id: 'AAPL', ticker: 'AAPL', sector: 'Technology', industry: 'Hardware', marketCap: 250_000_000_000, insiderBuy6m: 2_000_000 },
  { id: 'MSFT', ticker: 'MSFT', sector: 'Technology', industry: 'Software', marketCap: 180_000_000_000, insiderBuy6m: 0 },
  { id: 'JPM', ticker: 'JPM', sector: 'Financials', industry: 'Banks', marketCap: 15_000_000_000, insiderBuy6m: 500 },
];

describe('portfolioRowGroups', () => {
  beforeEach(() => {
    resetPortfolioGroupStorageForTests();
  });

  it('maps market cap and insider activity buckets', () => {
    expect(marketCapBucket(250_000_000_000).id).toBe('mega');
    expect(marketCapBucket(null).label).toBe('Unknown market cap');
    expect(insiderActivityBucket(2_000_000).id).toBe('heavy');
    expect(insiderActivityBucket(0).id).toBe('none');
  });

  it('sorts rows within a group using active sort state', () => {
    const sorted = sortPortfolioRows(sampleRows, [{ id: 'ticker', desc: true }]);
    expect(sorted.map((row) => row.ticker)).toEqual(['MSFT', 'JPM', 'AAPL']);
  });

  it('builds sector groups with headers and child rows', () => {
    const grouped = buildGroupedDisplayRows(sampleRows, 'sector', new Set());
    expect(grouped.filter((row) => row._isGroupHeader).map((row) => row._groupLabel)).toEqual([
      'Financials',
      'Technology',
    ]);
    expect(grouped.filter((row) => !row._isGroupHeader).map((row) => row.ticker)).toEqual([
      'JPM',
      'AAPL',
      'MSFT',
    ]);
  });

  it('omits child rows for collapsed groups', () => {
    const grouped = buildGroupedDisplayRows(sampleRows, 'sector', new Set(['Technology']));
    expect(grouped.some((row) => row.ticker === 'AAPL')).toBe(false);
    expect(grouped.some((row) => row.ticker === 'JPM')).toBe(true);
    expect(grouped.find((row) => row._groupKey === 'Technology')?._collapsed).toBe(true);
  });

  it('persists group-by and collapsed keys in localStorage', () => {
    expect(getActivePortfolioGroupBy()).toBe(DEFAULT_PORTFOLIO_GROUP_BY);
    setActivePortfolioGroupBy('industry');
    expect(getActivePortfolioGroupBy()).toBe('industry');
    setCollapsedPortfolioGroups(new Set(['Banks']));
    expect(getCollapsedPortfolioGroups()).toEqual(new Set(['Banks']));
  });
});
