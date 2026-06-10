import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { SP500_COUNT } from '../config/sp500Tickers';
import {
  chunkTickers,
  fetchSp500Tickers,
  queueSp500InsiderRefresh,
  staticSp500Meta,
} from './adminSp500';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('adminSp500', () => {
  test('staticSp500Meta exposes bundled count', () => {
    expect(staticSp500Meta().count).toBe(SP500_COUNT);
  });

  test('chunkTickers splits list', () => {
    expect(chunkTickers(['A', 'B', 'C'], 2)).toEqual([['A', 'B'], ['C']]);
  });

  test('fetchSp500Tickers falls back to bundled list on API failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('network'));
    const tickers = await fetchSp500Tickers();
    expect(tickers.length).toBe(SP500_COUNT);
    expect(tickers).toContain('AAPL');
  });

  test('queueSp500InsiderRefresh falls back to enqueue-job when universe route is missing', async () => {
    axios.post.mockImplementation((url) => {
      if (url.includes('enqueue-universe-insiders')) {
        const error = new Error('not found');
        error.response = { status: 404 };
        return Promise.reject(error);
      }
      if (url === API_ENDPOINTS.ADMIN_ENQUEUE_JOB) {
        return Promise.resolve({ data: { jobId: 99 } });
      }
      return Promise.reject(new Error(`unexpected url ${url}`));
    });
    axios.get.mockRejectedValueOnce(new Error('network'));

    const response = await queueSp500InsiderRefresh();
    expect(response.data.universe).toBe('sp500');
    expect(response.data.totalTickers).toBe(SP500_COUNT);
    expect(response.data.chunks).toBeGreaterThan(5);
    expect(response.data.fallback).toBe('enqueue-job');
    expect(axios.post).toHaveBeenCalledWith(
      API_ENDPOINTS.ADMIN_ENQUEUE_JOB,
      expect.objectContaining({ job_type: 'refresh_insiders' }),
    );
  });
});
