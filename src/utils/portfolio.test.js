import {
  addToPortfolioWithNotification,
  getPortfolio,
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
});
