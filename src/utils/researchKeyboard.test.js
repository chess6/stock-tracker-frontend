import {
  clampTickerIndex,
  cycleCompareIndex,
  hasOpenResearchDetails,
  resolveResearchKeyAction,
  shouldIgnoreResearchKey,
} from './researchKeyboard';

describe('researchKeyboard', () => {
  it('ignores keys when typing in inputs including Escape', () => {
    const input = document.createElement('input');
    expect(shouldIgnoreResearchKey({ target: input })).toBe(true);
    expect(shouldIgnoreResearchKey({ key: 'Escape', target: input })).toBe(true);
  });

  it('navigates tickers with j/k and opens on Enter', () => {
    const left = resolveResearchKeyAction(
      { key: 'j', target: document.body },
      { tickers: ['AAPL', 'MSFT'], selectedIndex: 1 },
    );
    expect(left).toEqual({ type: 'select_index', nextIndex: 0 });

    const right = resolveResearchKeyAction(
      { key: 'k', target: document.body },
      { tickers: ['AAPL', 'MSFT'], selectedIndex: 0 },
    );
    expect(right).toEqual({ type: 'select_index', nextIndex: 1 });

    const enter = resolveResearchKeyAction(
      { key: 'Enter', target: document.body },
      { tickers: ['AAPL', 'MSFT'], selectedIndex: 1 },
    );
    expect(enter).toEqual({ type: 'open_ticker', ticker: 'MSFT' });
  });

  it('handles deep-dive escape and compare cycling', () => {
    const esc = resolveResearchKeyAction(
      { key: 'Escape', target: document.body },
      { isDeepDive: true },
    );
    expect(esc).toEqual({ type: 'escape' });

    const details = document.createElement('details');
    details.className = 'st-details';
    details.setAttribute('open', '');
    document.body.appendChild(details);
    expect(hasOpenResearchDetails()).toBe(true);
    const close = resolveResearchKeyAction(
      { key: 'Escape', target: document.body },
      { isDeepDive: true },
    );
    expect(close).toEqual({ type: 'close_details' });
    document.body.removeChild(details);

    expect(cycleCompareIndex(0, 1, 3)).toBe(1);
    expect(cycleCompareIndex(2, 1, 3)).toBe(0);
    expect(clampTickerIndex(9, 3)).toBe(2);
  });
});
