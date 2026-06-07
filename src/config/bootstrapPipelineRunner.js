import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { buildExecutionWaves } from './bootstrapPipeline';

async function runStep(step, tickersCsv) {
  const tickersParam = encodeURIComponent(tickersCsv);
  switch (step.id) {
    case 'sync_companies':
      return axios.post(API_ENDPOINTS.ADMIN_SYNC_COMPANIES);
    case 'fundamentals':
      return axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_FUNDAMENTALS}?tickers=${tickersParam}`);
    case 'ingest_feeds':
      return axios.post(API_ENDPOINTS.ADMIN_INGEST_DEFAULT_FEEDS);
    case 'prices':
      return axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_PRICES}?tickers=${tickersParam}`);
    case 'insiders':
      return axios.post(`${API_ENDPOINTS.ADMIN_REFRESH_INSIDERS}?tickers=${tickersParam}`);
    case 'dedup_articles':
      return axios.post(API_ENDPOINTS.ADMIN_DEDUP_ARTICLES);
    default:
      throw new Error(`Unknown pipeline step: ${step.id}`);
  }
}

/**
 * Run selected bootstrap steps in wave order; parallelize steps within each wave.
 */
export async function runBootstrapPipeline({ selectedStepIds, tickersCsv, onStepStatus }) {
  const waves = buildExecutionWaves(selectedStepIds);
  const stepResults = {};
  let failedCount = 0;

  const setStatus = (stepId, status) => {
    onStepStatus?.(stepId, status);
  };

  for (const wave of waves) {
    const runnable = wave.filter((step) => {
      if (step.requiresTickers && !tickersCsv.trim()) {
        stepResults[step.id] = { status: 'skipped', error: 'No tickers provided' };
        setStatus(step.id, 'skipped');
        return false;
      }
      return true;
    });

    runnable.forEach((step) => setStatus(step.id, 'running'));

    const outcomes = await Promise.allSettled(
      runnable.map(async (step) => {
        try {
          const response = await runStep(step, tickersCsv);
          return { step, response };
        } catch (error) {
          const message = error?.response?.data?.error || error?.message || 'Request failed';
          throw new Error(message);
        }
      }),
    );

    for (let index = 0; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];
      const step = runnable[index];
      if (outcome.status === 'fulfilled') {
        stepResults[step.id] = { status: 'success', data: outcome.value.response.data };
        setStatus(step.id, 'success');
      } else {
        failedCount += 1;
        const error = outcome.reason?.message || 'Failed';
        stepResults[step.id] = { status: 'error', error };
        setStatus(step.id, 'error');
      }
    }
  }

  return { stepResults, failedCount };
}
