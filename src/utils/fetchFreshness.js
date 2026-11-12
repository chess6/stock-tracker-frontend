import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

/**
 * Data timestamps for "data as of" badges. Uses the public /api/status/freshness and
 * falls back to the admin status route on older backends (admin is localhost-only, so
 * visitors of a deployed app would otherwise always get an error).
 * Resolves to { freshness, coverage }.
 */
export async function fetchFreshness() {
  try {
    const res = await axios.get(API_ENDPOINTS.STATUS_FRESHNESS);
    return { freshness: res.data?.freshness || {}, coverage: res.data?.coverage || {} };
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
  }
  const res = await axios.get(API_ENDPOINTS.ADMIN_STATUS);
  return { freshness: res.data?.freshness || {}, coverage: res.data?.coverage || {} };
}
