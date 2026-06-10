import {
  addTagToTicker,
  ALL_TAGS_FILTER,
  filterRowsByTag,
  getActiveTagFilter,
  getAllUniqueTags,
  getCompanyTagsMap,
  getTagsForTicker,
  hydrateCompanyTagsFromApi,
  removeTagFromTicker,
  resetCompanyTagsForTests,
  setActiveTagFilter,
} from './companyTags';

describe('companyTags', () => {
  beforeEach(() => {
    resetCompanyTagsForTests();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tickerTags: {} }),
    });
  });

  it('adds and reads tags per ticker with dedupe and normalization', () => {
    addTagToTicker('aapl', '  Deep Value  ');
    addTagToTicker('AAPL', 'deep value');
    addTagToTicker('MSFT', 'Tech');

    expect(getTagsForTicker('AAPL')).toEqual(['Deep Value']);
    expect(getCompanyTagsMap()).toEqual({
      AAPL: ['Deep Value'],
      MSFT: ['Tech'],
    });
    expect(getAllUniqueTags()).toEqual(['Deep Value', 'Tech']);
  });

  it('removes a tag from a ticker', () => {
    addTagToTicker('AAPL', 'Watchlist');
    addTagToTicker('AAPL', 'Core');
    removeTagFromTicker('AAPL', 'watchlist');

    expect(getTagsForTicker('AAPL')).toEqual(['Core']);
    removeTagFromTicker('AAPL', 'Core');
    expect(getTagsForTicker('AAPL')).toEqual([]);
  });

  it('filters rows by active tag', () => {
    addTagToTicker('AAPL', 'Value');
    addTagToTicker('MSFT', 'Growth');
    const rows = [
      { ticker: 'AAPL', price: 1 },
      { ticker: 'MSFT', price: 2 },
      { ticker: 'JPM', price: 3 },
    ];

    expect(filterRowsByTag(rows, ALL_TAGS_FILTER)).toHaveLength(3);
    expect(filterRowsByTag(rows, 'Value').map((row) => row.ticker)).toEqual(['AAPL']);
    expect(filterRowsByTag(rows, 'Growth').map((row) => row.ticker)).toEqual(['MSFT']);
    expect(filterRowsByTag(rows, 'Missing')).toEqual([]);
  });

  it('hydrates tags from API into localStorage', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tickerTags: { AAPL: ['Synced'] } }),
    });

    const map = await hydrateCompanyTagsFromApi();
    expect(map).toEqual({ AAPL: ['Synced'] });
    expect(getCompanyTagsMap()).toEqual({ AAPL: ['Synced'] });
  });

  it('persists tag filter in localStorage and drops stale filters', () => {
    addTagToTicker('AAPL', 'Core');
    setActiveTagFilter('Core');
    expect(getActiveTagFilter()).toBe('Core');

    removeTagFromTicker('AAPL', 'Core');
    expect(getActiveTagFilter()).toBe(ALL_TAGS_FILTER);
  });
});
