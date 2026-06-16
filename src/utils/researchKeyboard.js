export function shouldIgnoreResearchKey(event) {
  const target = event.target;
  if (!target || typeof target !== 'object') return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (typeof target.closest === 'function' && target.closest('.st-navbar')) return true;
  return false;
}

export function isResearchRoute(pathname, routePrefix = '/research') {
  if (!pathname || !routePrefix) return false;
  return pathname === routePrefix || pathname.startsWith(`${routePrefix}/`);
}

export function hasOpenResearchDetails() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('details.st-details[open]'));
}

export function clampTickerIndex(index, length) {
  if (!length) return 0;
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
}

export function cycleCompareIndex(currentIndex, direction, length) {
  if (length < 2) return currentIndex;
  const delta = direction < 0 ? -1 : 1;
  return (currentIndex + delta + length) % length;
}

export function resolveResearchKeyAction(event, {
  tickers = [],
  selectedIndex = 0,
  isDeepDive = false,
  compareTickers = [],
  compareFocusIndex = 0,
} = {}) {
  if (shouldIgnoreResearchKey(event)) return null;
  const key = event.key;
  const lower = key.length === 1 ? key.toLowerCase() : key;

  if (isDeepDive) {
    if (key === 'Escape') {
      if (hasOpenResearchDetails()) return { type: 'close_details' };
      return { type: 'escape' };
    }
    if (compareTickers.length >= 2 && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      return {
        type: 'cycle_compare',
        nextIndex: cycleCompareIndex(
          compareFocusIndex,
          key === 'ArrowLeft' ? -1 : 1,
          compareTickers.length,
        ),
      };
    }
    return null;
  }

  if (!tickers.length) return null;

  if (lower === 'j') {
    return { type: 'select_index', nextIndex: clampTickerIndex(selectedIndex - 1, tickers.length) };
  }
  if (lower === 'k') {
    return { type: 'select_index', nextIndex: clampTickerIndex(selectedIndex + 1, tickers.length) };
  }
  if (key === 'Enter') {
    const ticker = tickers[clampTickerIndex(selectedIndex, tickers.length)];
    return ticker ? { type: 'open_ticker', ticker } : null;
  }
  if (lower === 'p') {
    const ticker = tickers[clampTickerIndex(selectedIndex, tickers.length)];
    return ticker ? { type: 'toggle_pin', ticker } : null;
  }
  if (lower === 'c') {
    const ticker = tickers[clampTickerIndex(selectedIndex, tickers.length)];
    return ticker ? { type: 'toggle_compare', ticker } : null;
  }
  if (compareTickers.length >= 2 && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    return {
      type: 'cycle_compare',
      nextIndex: cycleCompareIndex(
        compareFocusIndex,
        key === 'ArrowLeft' ? -1 : 1,
        compareTickers.length,
      ),
    };
  }
  return null;
}
