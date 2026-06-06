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
