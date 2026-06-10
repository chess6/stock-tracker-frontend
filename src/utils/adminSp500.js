import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { SP500_COUNT, SP500_TICKERS, SP500_UPDATED_AT } from '../config/sp500Tickers';

const CHUNK_SIZE = 75;

export function chunkTickers(tickers, chunkSize = CHUNK_SIZE) {
  const size = Math.max(Number(chunkSize) || CHUNK_SIZE, 1);
  const chunks = [];
  for (let index = 0; index < tickers.length; index += size) {
    chunks.push(tickers.slice(index, index + size));
  }
  return chunks;
}

export function staticSp500Meta() {
  return {
    id: 'sp500',
    label: 'S&P 500',
    count: SP500_COUNT,
    updatedAt: SP500_UPDATED_AT,
    tickers: SP500_TICKERS,
  };
}

/** Prefer API list; fall back to bundled constituents when backend is stale. */
export async function fetchSp500Tickers() {
  try {
    const response = await axios.get(API_ENDPOINTS.ADMIN_UNIVERSE('sp500'));
    const tickers = response.data?.tickers;
    if (Array.isArray(tickers) && tickers.length) return tickers;
  } catch {
    /* use bundled list */
  }
  return [...SP500_TICKERS];
}

/** Queue chunked insider refresh; works on new and legacy admin APIs. */
export async function queueSp500InsiderRefresh() {
  try {
    return await axios.post(`${API_ENDPOINTS.ADMIN_ENQUEUE_UNIVERSE_INSIDERS}?universe=sp500`);
  } catch (error) {
    if (error?.response?.status !== 404) throw error;
  }

  const tickers = await fetchSp500Tickers();
  const chunks = chunkTickers(tickers);
  const jobs = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const response = await axios.post(API_ENDPOINTS.ADMIN_ENQUEUE_JOB, {
      job_type: 'refresh_insiders',
      payload: { tickers: chunks[index] },
    });
    jobs.push({
      jobId: response.data?.jobId,
      chunk: index + 1,
      tickers: chunks[index].length,
    });
  }
  return {
    data: {
      universe: 'sp500',
      totalTickers: tickers.length,
      chunks: chunks.length,
      jobs,
      fallback: 'enqueue-job',
    },
  };
}
