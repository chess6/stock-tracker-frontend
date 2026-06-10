import {
  deletePortfolioWatchlist,
  getPortfolioWatchlists,
  getPortfolioWatchlistTickers,
  resetPortfolioWatchlistsForTests,
  savePortfolioWatchlist,
} from './portfolioWatchlists';

describe('portfolioWatchlists', () => {
  beforeEach(() => {
    resetPortfolioWatchlistsForTests();
  });

  it('saves and loads a named watchlist from localStorage', () => {
    const entry = savePortfolioWatchlist('Value basket', ['aapl', 'msft', 'aapl']);
    expect(entry.tickers).toEqual(['AAPL', 'MSFT']);
    expect(getPortfolioWatchlists()).toHaveLength(1);
    expect(getPortfolioWatchlistTickers(entry.id)).toEqual(['AAPL', 'MSFT']);
  });

  it('replaces watchlist with the same name', () => {
    savePortfolioWatchlist('Main', ['AAPL']);
    savePortfolioWatchlist('main', ['GME', 'NVDA']);
    const lists = getPortfolioWatchlists();
    expect(lists).toHaveLength(1);
    expect(lists[0].tickers).toEqual(['GME', 'NVDA']);
  });

  it('deletes a watchlist by id', () => {
    const entry = savePortfolioWatchlist('Temp', ['JPM']);
    deletePortfolioWatchlist(entry.id);
    expect(getPortfolioWatchlists()).toEqual([]);
  });

  it('rejects empty ticker lists', () => {
    expect(() => savePortfolioWatchlist('Empty', [])).toThrow(/at least one ticker/i);
  });
});
