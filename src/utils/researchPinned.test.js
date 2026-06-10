import {
  MAX_PINNED_TICKERS,
  hydratePinnedTickersFromApi,
  isPinnedTicker,
  persistPinnedTickersToApi,
  pinTicker,
  togglePinnedTicker,
  unpinTicker,
} from './researchPinned';

describe('researchPinned', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('pins and unpins tickers', () => {
    let pinned = pinTicker('aapl');
    expect(pinned).toEqual(['AAPL']);
    expect(isPinnedTicker('AAPL', pinned)).toBe(true);
    pinned = unpinTicker('AAPL', pinned);
    expect(pinned).toEqual([]);
  });

  it('dedupes and caps pinned tickers', () => {
    let pinned = [];
    for (let i = 0; i < MAX_PINNED_TICKERS + 3; i += 1) {
      pinned = pinTicker(`T${i}`, pinned);
    }
    expect(pinned).toHaveLength(MAX_PINNED_TICKERS);
    expect(pinned[0]).toBe(`T${MAX_PINNED_TICKERS + 2}`);
  });

  it('toggles pin state', () => {
    let pinned = togglePinnedTicker('msft');
    expect(pinned).toEqual(['MSFT']);
    pinned = togglePinnedTicker('msft', pinned);
    expect(pinned).toEqual([]);
  });

  it('persists pins to preferences API', async () => {
    const fetchMock = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }));
    global.fetch = fetchMock;
    persistPinnedTickersToApi(['AAPL', 'MSFT']);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/preferences',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ researchPinnedTickers: ['AAPL', 'MSFT'] }),
      }),
    );
  });

  it('hydrates pins from preferences API', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: async () => ({ researchPinnedTickers: ['JPM', 'MCD'] }),
    }));
    const tickers = await hydratePinnedTickersFromApi();
    expect(tickers).toEqual(['JPM', 'MCD']);
    expect(JSON.parse(localStorage.getItem('research-pinned-tickers'))).toEqual(['JPM', 'MCD']);
  });
});
