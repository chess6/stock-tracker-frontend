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

const TICKER_CHUNK_STEPS = new Set(['fundamentals', 'prices', 'insiders']);
const TICKER_CHUNK_SIZE = 40;

export function formatStepError(error) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    const trimmed = data.trim();
    if (/<!doctype html>/i.test(trimmed)) {
      const status = error?.response?.status;
      return status
        ? `HTTP ${status}: server error — check backend logs and retry`
        : 'Server error — check backend logs and retry';
    }
    return trimmed;
  }
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

function chunkTickers(tickers, chunkSize = TICKER_CHUNK_SIZE) {
  const chunks = [];
  for (let index = 0; index < tickers.length; index += chunkSize) {
    chunks.push(tickers.slice(index, index + chunkSize));
  }
  return chunks;
}

function stripTickersFromQuery(querySuffix) {
  if (!querySuffix) return '';
  const raw = querySuffix.startsWith('?') ? querySuffix.slice(1) : querySuffix;
  const params = new URLSearchParams(raw);
  params.delete('tickers');
  const next = params.toString();
  return next ? `?${next}` : '';
}

function buildStepPostConfig(step, tickers, mode, extractArticles = false) {
  const endpoint = STEP_ENDPOINTS[step.id];
  if (step.id === 'ingest_feeds') {
    const querySuffix = buildStepRequestUrl(step.id, {
      tickersCsv: tickers.join(','),
      mode,
      extractArticles,
    }) || '';
    return { url: `${endpoint}${querySuffix}`, body: undefined };
  }
  const querySuffix = stripTickersFromQuery(
    buildStepRequestUrl(step.id, { tickersCsv: '', mode, extractArticles }) || '',
  );
  const url = `${endpoint}${querySuffix}`;
  const body = tickers.length ? { tickers } : undefined;
  return { url, body };
}

function mergeTickerStepResults(stepId, chunks) {
  if (stepId === 'fundamentals') {
    return {
      tickers: chunks.flatMap((chunk) => chunk.tickers || []),
      recordsWritten: chunks.reduce((sum, chunk) => sum + (chunk.recordsWritten || 0), 0),
      skipped: chunks.flatMap((chunk) => chunk.skipped || []),
      errors: chunks.flatMap((chunk) => chunk.errors || []),
    };
  }
  if (stepId === 'prices') {
    return {
      tickers: chunks.flatMap((chunk) => chunk.tickers || chunk.refreshed || []),
      rowsWritten: chunks.reduce((sum, chunk) => sum + (chunk.rowsWritten || chunk.recordsWritten || 0), 0),
      errors: chunks.flatMap((chunk) => chunk.errors || []),
    };
  }
  if (stepId === 'insiders') {
    return {
      tickers: chunks.flatMap((chunk) => chunk.refreshed || chunk.tickers || []),
      recordsWritten: chunks.reduce((sum, chunk) => sum + (chunk.recordsWritten || 0), 0),
      skipped: chunks.flatMap((chunk) => chunk.skipped || []),
      errors: chunks.flatMap((chunk) => chunk.errors || []),
    };
  }
  return chunks[chunks.length - 1] || {};
}

async function postStepRequest(step, tickers, mode, extractArticles = false) {
  const { url, body } = buildStepPostConfig(step, tickers, mode, extractArticles);
  const response = await axios.post(url, body);
  return response.data;
}

async function runTickerChunkedStep(step, tickers, mode, extractArticles = false) {
  const chunks = chunkTickers(tickers);
  const results = [];
  const chunkErrors = [];

  for (const chunk of chunks) {
    try {
      results.push(await postStepRequest(step, chunk, mode, extractArticles));
    } catch (error) {
      chunkErrors.push(formatStepError(error));
    }
  }

  const data = mergeTickerStepResults(step.id, results);
  if (!results.length && chunkErrors.length) {
    throw new Error(chunkErrors.join('; '));
  }
  if (chunkErrors.length) {
    return { data, error: chunkErrors.join('; ') };
  }
  return { data };
}

async function runMarketReactionsStep(endpoint, tickersCsv, mode, extractArticles = false) {
  const tickers = parseTickersCsv(tickersCsv);
  if (!tickers.length) {
    throw new Error('No tickers to backfill — enter symbols in the tickers field');
  }

  const querySuffix = buildStepRequestUrl('market_reactions', {
    tickersCsv,
    mode,
    extractArticles,
  }) || '';
  const queryParams = querySuffix.startsWith('?') ? querySuffix.slice(1) : querySuffix;

  const successes = [];
  const failures = [];
  for (const ticker of tickers) {
    try {
      const url = queryParams
        ? `${endpoint}?ticker=${encodeURIComponent(ticker)}&${queryParams}`
        : `${endpoint}?ticker=${encodeURIComponent(ticker)}`;
      const response = await axios.post(url);
      successes.push({ ticker, ...response.data });
    } catch (error) {
      failures.push(`${ticker}: ${formatStepError(error)}`);
    }
  }

  const data = { tickers: successes, failures };
  if (failures.length === tickers.length) {
    throw new Error(failures.join('; '));
  }
  if (failures.length > 0) {
    return { data, error: failures.join('; ') };
  }
  return { data };
}

async function runStep(step, tickersCsv, mode, extractArticles = false) {
  const endpoint = STEP_ENDPOINTS[step.id];
  if (!endpoint) {
    throw new Error(`Unknown pipeline step: ${step.id}`);
  }
  if (step.id === 'market_reactions') {
    return runMarketReactionsStep(endpoint, tickersCsv, mode, extractArticles);
  }

  const tickers = parseTickersCsv(tickersCsv);
  if (TICKER_CHUNK_STEPS.has(step.id) && tickers.length > TICKER_CHUNK_SIZE) {
    return runTickerChunkedStep(step, tickers, mode, extractArticles);
  }

  const data = await postStepRequest(step, tickers, mode, extractArticles);
  return { data };
}

/**
 * Run selected bootstrap steps in wave order.
 * Steps run sequentially to avoid SQLite write lock contention.
 */
export async function runBootstrapPipeline({
  selectedStepIds,
  tickersCsv,
  onStepStatus,
  mode = PIPELINE_MODES.FAST,
  extractArticles = false,
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

    for (const step of runnable) {
      setStatus(step.id, 'running');
      try {
        const result = await runStep(step, tickersCsv, mode, extractArticles);
        if (result.error) {
          failedCount += 1;
          stepResults[step.id] = { status: 'error', error: result.error, data: result.data };
          setStatus(step.id, 'error');
        } else {
          stepResults[step.id] = { status: 'success', data: result.data };
          setStatus(step.id, 'success');
        }
      } catch (error) {
        failedCount += 1;
        const message = error?.response ? formatStepError(error) : (error?.message || 'Request failed');
        stepResults[step.id] = { status: 'error', error: message };
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
