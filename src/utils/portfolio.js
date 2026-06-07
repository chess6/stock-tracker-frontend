// Portfolio management helpers

export const PORTFOLIO_UPDATED_EVENT = 'portfolio-updated';

export function getPortfolio() {
  try {
    return JSON.parse(localStorage.getItem('portfolio')) || [];
  } catch {
    return [];
  }
}

export function notifyPortfolioUpdated() {
  window.dispatchEvent(new CustomEvent(PORTFOLIO_UPDATED_EVENT));
}

export function setPortfolioTickers(tickers) {
  const normalized = [...new Set(tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
  localStorage.setItem('portfolio', JSON.stringify(normalized));
  notifyPortfolioUpdated();
}

/** Comma-separated tickers from localStorage portfolio, or empty string. */
export function getPortfolioTickersCsv() {
  const tickers = getPortfolio()
    .map((t) => String(t).trim().toUpperCase())
    .filter(Boolean);
  return tickers.join(',');
}

export function isInPortfolio(ticker) {
  const portfolio = getPortfolio();
  const symbol = String(ticker).trim().toUpperCase();
  return portfolio.includes(symbol);
}

/** Adds ticker to portfolio and returns a toast payload `{ type, message }`. */
export function addToPortfolioWithNotification(ticker) {
  const symbol = String(ticker).trim().toUpperCase();
  const portfolio = getPortfolio();
  if (portfolio.includes(symbol)) {
    return { type: 'info', message: `${symbol} is already in your portfolio.` };
  }
  setPortfolioTickers([...portfolio, symbol]);
  return { type: 'success', message: `${symbol} added to portfolio.` };
}
