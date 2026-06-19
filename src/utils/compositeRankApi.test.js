import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { fetchCompositeRank } from './compositeRankApi';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('compositeRankApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchCompositeRank uses GET when no weight overrides', async () => {
    axios.get.mockResolvedValueOnce({ data: { meta: { composite: 'deep_value' }, results: [] } });

    const payload = await fetchCompositeRank({
      composite: 'deep_value',
      tickers: ['AAPL'],
      limit: 5,
    });

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.get.mock.calls[0][0]).toContain(API_ENDPOINTS.RESEARCH_RANK);
    expect(axios.get.mock.calls[0][0]).toContain('tickers=AAPL');
    expect(payload.meta.composite).toBe('deep_value');
  });

  it('fetchCompositeRank uses POST with weight_overrides when provided', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        meta: {
          composite: 'deep_value',
          weightOverrides: { survivability: 0.6, fcf_quality: 0.4 },
        },
        results: [{ ticker: 'AAPL', factors: [{ key: 'survivability', weight: 0.6 }] }],
      },
    });

    const overrides = { survivability: 0.8, fcf_quality: 0.2 };
    const payload = await fetchCompositeRank({
      composite: 'deep_value',
      tickers: ['AAPL'],
      limit: 5,
      weightOverrides: overrides,
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(API_ENDPOINTS.RESEARCH_RANK, {
      composite: 'deep_value',
      tickers: ['AAPL'],
      universe: 'sp500',
      limit: 5,
      weight_overrides: overrides,
    });
    expect(payload.meta.weightOverrides).toBeDefined();
  });
});
