export function secEdgarUrl(ticker) {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(ticker)}&type=&dateb=&owner=include&count=40`;
}

/** External institutional holdings screener (third-party site). */
export function instHoldingsUrl(ticker) {
  return `https://whalewisdom.com/stock/${encodeURIComponent(ticker)}`;
}

/** External equity analysis site (third-party). */
export function analysisUrl(ticker) {
  return `https://seekingalpha.com/symbol/${encodeURIComponent(ticker)}`;
}

export function tickerNewsUrl(ticker) {
  return `/firehose?tickers=${encodeURIComponent(ticker)}`;
}

export function tickerOverviewUrl(ticker) {
  return `/overview/${encodeURIComponent(ticker)}`;
}

export function tickerFindersUrl(ticker) {
  return `/finders/${encodeURIComponent(ticker)}`;
}

export function tickerFinancialsUrl(ticker, search = '') {
  const base = `/financials/${encodeURIComponent(ticker)}`;
  return search ? `${base}?${search}` : base;
}

/** Default in-app destination when clicking a ticker symbol. */
export function tickerDefaultUrl(ticker) {
  return tickerFinancialsUrl(ticker);
}

/** External charting site (third-party). */
export function extChartUrl(ticker) {
  return `https://stockcharts.com/h-sc/ui?s=${encodeURIComponent(ticker)}`;
}

/** External insider transaction screener (third-party). */
export function insiderScreenerUrl(ticker, days = 180) {
  return `http://openinsider.com/screener?s=${encodeURIComponent(ticker)}&fd=${days}&sortcol=0&cnt=100&page=1`;
}

export function yahooProfileUrl(ticker) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/profile`;
}
