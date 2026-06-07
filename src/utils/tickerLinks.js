export function secEdgarUrl(ticker) {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(ticker)}&type=&dateb=&owner=include&count=40`;
}

export function whaleWisdomUrl(ticker) {
  return `https://whalewisdom.com/stock/${encodeURIComponent(ticker)}`;
}

export function seekingAlphaUrl(ticker) {
  return `https://seekingalpha.com/symbol/${encodeURIComponent(ticker)}`;
}

export function tickerNewsUrl(ticker) {
  return `/news?tickers=${encodeURIComponent(ticker)}`;
}

export function tickerFinancialsUrl(ticker) {
  return `/${encodeURIComponent(ticker)}/financials`;
}

export function stockChartsUrl(ticker) {
  return `https://stockcharts.com/h-sc/ui?s=${encodeURIComponent(ticker)}`;
}

export function openInsiderUrl(ticker, days = 180) {
  return `http://openinsider.com/screener?s=${encodeURIComponent(ticker)}&fd=${days}&sortcol=0&cnt=100&page=1`;
}

export function yahooProfileUrl(ticker) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/profile`;
}
