import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

export async function fetchCompositeRank({
  composite = 'deep_value',
  tickers = [],
  universe = 'sp500',
  limit = 50,
  weightOverrides = null,
}) {
  if (weightOverrides && Object.keys(weightOverrides).length > 0) {
    const res = await axios.post(API_ENDPOINTS.RESEARCH_RANK, {
      composite,
      tickers,
      universe,
      limit,
      weight_overrides: weightOverrides,
    });
    return res.data;
  }

  const params = new URLSearchParams({
    composite,
    limit: String(limit),
  });
  if (tickers.length) {
    params.set('tickers', tickers.join(','));
  } else {
    params.set('universe', universe);
  }
  const url = `${API_ENDPOINTS.RESEARCH_RANK}?${params.toString()}`;
  const res = await axios.get(url);
  return res.data;
}

export async function fetchCompositeRankHistory(ticker, {
  composite = 'deep_value',
  limit = 90,
} = {}) {
  const params = new URLSearchParams({
    composite,
    limit: String(limit),
  });
  const url = `${API_ENDPOINTS.RESEARCH_RANK_HISTORY(ticker)}?${params.toString()}`;
  const res = await axios.get(url);
  return res.data;
}

export async function fetchThesisDriftHistory(ticker, {
  composite = 'deep_value',
  limit = 90,
} = {}) {
  const params = new URLSearchParams({
    composite,
    limit: String(limit),
  });
  const url = `${API_ENDPOINTS.RESEARCH_THESIS_HISTORY(ticker)}?${params.toString()}`;
  const res = await axios.get(url);
  return res.data;
}
