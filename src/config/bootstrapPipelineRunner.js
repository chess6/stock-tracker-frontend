import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { buildExecutionWaves } from './bootstrapPipeline';
import { PIPELINE_MODES, buildStepRequestUrl } from './bootstrapPipelineModes';

const STEP_ENDPOINTS = {
  sync_companies: API_ENDPOINTS.ADMIN_SYNC_COMPANIES,
  fundamentals: API_ENDPOINTS.ADMIN_REFRESH_FUNDAMENTALS,
  ingest_feeds: API_ENDPOINTS.ADMIN_INGEST_DEFAULT_FEEDS,
  prices: API_ENDPOINTS.ADMIN_REFRESH_PRICES,
  insiders: API_ENDPOINTS.ADMIN_REFRESH_INSIDERS,
  dedup_articles: API_ENDPOINTS.ADMIN_DEDUP_ARTICLES,
};

async function runStep(step, tickersCsv, mode) {
  const endpoint = STEP_ENDPOINTS[step.id];
  if (!endpoint) {
    throw new Error(`Unknown pipeline step: ${step.id}`);
  }
  const querySuffix = buildStepRequestUrl(step.id, { tickersCsv, mode }) || '';
  return axios.post(`${endpoint}${querySuffix}`);
}

/**
 * Run selected bootstrap steps in wave order; parallelize steps within each wave.
 */
export async function runBootstrapPipeline({
  selectedStepIds,
  tickersCsv,
  onStepStatus,
  mode = PIPELINE_MODES.FAST,
}) {
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
          const response = await runStep(step, tickersCsv, mode);
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
