import {
  addToPortfolioWithNotification,
  getPortfolio,
  loadUserPreferences,
  resetPortfolioStateForTests,
  setPortfolioTickers,
} from './portfolio';

describe('portfolio helpers', () => {
  beforeEach(() => {
    resetPortfolioStateForTests();
    global.fetch = jest.fn((url, options = {}) => {
      const body = options.body ? JSON.parse(options.body) : {};
      if (options.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            theme: body.theme || 'dark',
            portfolio: body.portfolio || [],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ theme: 'dark', portfolio: [] }),
      });
    });
  });

  it('adds ticker and returns success toast payload', () => {
    const result = addToPortfolioWithNotification('aapl');
    expect(result).toEqual({ type: 'success', message: 'AAPL added to portfolio.' });
    expect(getPortfolio()).toEqual(['AAPL']);
  });

  it('returns info toast when ticker already exists', () => {
    setPortfolioTickers(['MSFT']);
    const result = addToPortfolioWithNotification('MSFT');
    expect(result).toEqual({ type: 'info', message: 'MSFT is already in your portfolio.' });
    expect(getPortfolio()).toEqual(['MSFT']);
  });

  it('loads portfolio from /api/preferences and ignores localStorage', async () => {
    localStorage.setItem('portfolio', JSON.stringify(['GME']));
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        theme: 'dark',
        portfolio: ['AAPL', 'MSFT'],
      }),
    }));

    const prefs = await loadUserPreferences();

    expect(prefs.portfolio).toEqual(['AAPL', 'MSFT']);
    expect(getPortfolio()).toEqual(['AAPL', 'MSFT']);
    expect(localStorage.getItem('portfolio')).toBeNull();
  });

  it('falls back to empty portfolio when preferences API fails', async () => {
    localStorage.setItem('portfolio', JSON.stringify(['GME']));
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));

    const prefs = await loadUserPreferences();

    expect(prefs).toEqual({ theme: 'dark', portfolio: [] });
    expect(getPortfolio()).toEqual([]);
    expect(localStorage.getItem('portfolio')).toBeNull();
  });
});
