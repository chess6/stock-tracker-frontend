import { addToPortfolioWithNotification, getPortfolio, setPortfolioTickers } from './portfolio';

describe('portfolio helpers', () => {
  beforeEach(() => {
    localStorage.clear();
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
