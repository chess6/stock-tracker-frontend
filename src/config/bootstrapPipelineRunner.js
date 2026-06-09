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
  macro: API_ENDPOINTS.ADMIN_REFRESH_MACRO,
  dedup_articles: API_ENDPOINTS.ADMIN_DEDUP_ARTICLES,
  market_reactions: API_ENDPOINTS.ADMIN_BACKFILL_MARKET_REACTIONS,
};

export function formatStepError(error) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.error) return String(data.error);
  if (data?.message) return String(data.message);
  const status = error?.response?.status;
  if (status) {
    const base = error?.message || 'Request failed';
    return `HTTP ${status}: ${base}`;
  }
  return error?.message || 'Request failed';
}

function parseTickersCsv(tickersCsv) {
  return [...new Set(
    String(tickersCsv || '')
      .split(/[,\s]+/)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean),
  )];
}

async function runMarketReactionsStep(endpoint, tickersCsv, mode) {
  const tickers = parseTickersCsv(tickersCsv);
  if (!tickers.length) {
    throw new Error('No tickers to backfill — enter symbols in the tickers field');
  }

  const querySuffix = buildStepRequestUrl('market_reactions', { tickersCsv, mode }) || '';
  const queryParams = querySuffix.startsWith('?') ? querySuffix.slice(1) : querySuffix;

  const outcomes = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const url = queryParams
        ? `${endpoint}?ticker=${encodeURIComponent(ticker)}&${queryParams}`
        : `${endpoint}?ticker=${encodeURIComponent(ticker)}`;
      const response = await axios.post(url);
      return { ticker, ...response.data };
    }),
  );

  const successes = [];
  const failures = [];
  outcomes.forEach((outcome, index) => {
    const ticker = tickers[index];
    if (outcome.status === 'fulfilled') {
      successes.push(outcome.value);
      return;
    }
    failures.push(`${ticker}: ${formatStepError(outcome.reason)}`);
  });

  const data = { tickers: successes, failures };
  if (failures.length === tickers.length) {
    throw new Error(failures.join('; '));
  }
  if (failures.length > 0) {
    return { data, error: failures.join('; ') };
  }
  return { data };
}

async function runStep(step, tickersCsv, mode) {
  const endpoint = STEP_ENDPOINTS[step.id];
  if (!endpoint) {
    throw new Error(`Unknown pipeline step: ${step.id}`);
  }
  if (step.id === 'market_reactions') {
    return runMarketReactionsStep(endpoint, tickersCsv, mode);
  }
  const querySuffix = buildStepRequestUrl(step.id, { tickersCsv, mode }) || '';
  const response = await axios.post(`${endpoint}${querySuffix}`);
  return { data: response.data };
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
      if (step.requiresTickers && !parseTickersCsv(tickersCsv).length) {
        stepResults[step.id] = {
          status: 'skipped',
          error: 'No tickers provided — enter symbols in the tickers field',
        };
        setStatus(step.id, 'skipped');
        return false;
      }
      return true;
    });

    runnable.forEach((step) => setStatus(step.id, 'running'));

    const outcomes = await Promise.allSettled(
      runnable.map(async (step) => {
        try {
          const result = await runStep(step, tickersCsv, mode);
          return { step, result };
        } catch (error) {
          const message = error?.response ? formatStepError(error) : (error?.message || 'Request failed');
          throw new Error(message);
        }
      }),
    );

    for (let index = 0; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];
      const step = runnable[index];
      if (outcome.status === 'fulfilled') {
        const { result } = outcome.value;
        if (result.error) {
          failedCount += 1;
          stepResults[step.id] = { status: 'error', error: result.error, data: result.data };
          setStatus(step.id, 'error');
        } else {
          stepResults[step.id] = { status: 'success', data: result.data };
          setStatus(step.id, 'success');
        }
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

export function formatPipelineStepResult(stepId, result) {
  if (!result) return '';
  const { status, data } = result;

  if (stepId === 'market_reactions' && data?.tickers) {
    const lines = data.tickers.map((row) => {
      const count = row.articlesUpdated ?? 0;
      return `${row.ticker}: ${count} article${count === 1 ? '' : 's'} updated`;
    });
    if (data.failures?.length) {
      lines.push(`Failures: ${data.failures.join('; ')}`);
    }
    return lines.join(' · ');
  }
  if (status === 'skipped') {
    return '';
  }
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.articlesUpdated === 'number') {
      return `${data.articlesUpdated} articles updated`;
    }
  }
  return '';
}
