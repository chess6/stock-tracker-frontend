// Portfolio management helpers

export function getPortfolio() {
  return JSON.parse(localStorage.getItem('portfolio')) || [];
}

export function isInPortfolio(ticker) {
  const portfolio = getPortfolio();
  return portfolio.includes(ticker);
}

// Adds ticker to portfolio and returns notification object
export function addToPortfolioWithNotification(ticker) {
  const portfolio = getPortfolio();
  if (!portfolio.includes(ticker)) {
    localStorage.setItem('portfolio', JSON.stringify([...portfolio, ticker]));
    return { type: 'success', message: `${ticker} added to portfolio.` };
  }
  return null;

}
