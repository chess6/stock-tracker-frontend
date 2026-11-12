import {
  addToPortfolioWithNotification,
  getPortfolio,
  loadUserPreferences,
  PORTFOLIO_SAVE_FAILED_EVENT,
  resetPortfolioStateForTests,
  setPortfolioTickers,
} from './portfolio';

describe('portfolio helpers', () => {
  beforeEach(() => {
    resetPortfolioStateForTests();
    localStorage.clear();
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

  it('adds ticker and returns success toast payload', async () => {
    await loadUserPreferences();
    const result = addToPortfolioWithNotification('aapl');
    expect(result).toEqual({ type: 'success', message: 'AAPL added to portfolio.' });
    expect(getPortfolio()).toEqual(['AAPL']);
  });

  it('returns info toast when ticker already exists', async () => {
    await loadUserPreferences();
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

  it('falls back to empty portfolio when preferences API fails, keeping legacy data', async () => {
    localStorage.setItem('portfolio', JSON.stringify(['GME']));
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));

    const prefs = await loadUserPreferences();

    expect(prefs).toEqual({ theme: 'dark', portfolio: [] });
    expect(getPortfolio()).toEqual([]);
    // Not deleted: it has not been migrated to the server yet.
    expect(localStorage.getItem('portfolio')).toBe(JSON.stringify(['GME']));
  });

  it('does not overwrite the server portfolio after a failed load', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 503 }));
    await loadUserPreferences();

    const result = addToPortfolioWithNotification('AAPL');

    expect(result.type).toBe('warning');
    expect(getPortfolio()).toEqual([]);
    expect(global.fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  });

  it('retries loading after a failure instead of caching it', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 503 }));
    await loadUserPreferences();
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ theme: 'dark', portfolio: ['NVDA'] }),
    }));

    await loadUserPreferences();

    expect(getPortfolio()).toEqual(['NVDA']);
  });

  it('migrates a legacy browser portfolio when the server one is empty', async () => {
    localStorage.setItem('portfolio', JSON.stringify(['gme', 'AMC']));

    const prefs = await loadUserPreferences();

    const put = global.fetch.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(JSON.parse(put[1].body)).toEqual({ portfolio: ['GME', 'AMC'] });
    expect(prefs.portfolio).toEqual(['GME', 'AMC']);
    expect(getPortfolio()).toEqual(['GME', 'AMC']);
    expect(localStorage.getItem('portfolio')).toBeNull();
  });

  it('rolls back and reports when a save is rejected', async () => {
    await loadUserPreferences();
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401 }));
    const failures = [];
    const listener = (event) => failures.push(event.detail.message);
    window.addEventListener(PORTFOLIO_SAVE_FAILED_EVENT, listener);

    addToPortfolioWithNotification('TSLA');
    expect(getPortfolio()).toEqual(['TSLA']);
    await new Promise((resolve) => { setTimeout(resolve, 0); });

    window.removeEventListener(PORTFOLIO_SAVE_FAILED_EVENT, listener);
    expect(getPortfolio()).toEqual([]);
    expect(failures).toEqual(['Sign in to change your portfolio.']);
  });
});
