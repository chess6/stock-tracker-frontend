import { BOOTSTRAP_STEPS, buildExecutionWaves } from './bootstrapPipeline';

export const PIPELINE_MODES = {
  FAST: 'fast',
  FULL: 'full',
};

/** Default feed count — keep in sync with backend DEFAULT_FEEDS length. */
export const DEFAULT_FEED_COUNT = 49;
export const DEFAULT_ACTIVE_FEED_COUNT = 44;

/** Keep in sync with bootstrapPipelineRunner TICKER_CHUNK_SIZE. */
export const TICKER_CHUNK_SIZE = 40;

/**
 * Duration calibration — fast mode, S&P 500 (503 tickers) full bootstrap, 2026-06-09.
 * Wall clock ~25 min; per-step totals: sync 0.3s, fundamentals 296s, ingest 115s,
 * prices 163s, insiders 896s, macro 7s, dedup 43s, market reactions 3s (sparse links).
 */
const FAST_CHUNK_SECONDS = {
  fundamentals: { min: 15, max: 27 },
  prices: { min: 10, max: 16 },
  insiders: { min: 50, max: 75 },
};

const FULL_CHUNK_SECONDS = {
  fundamentals: { min: 25, max: 45 },
  prices: { min: 18, max: 30 },
  insiders: { min: 180, max: 300 },
};

export const FAST_LIMITS = {
  ingest_feeds: {
    extractArticles: false,
    maxArticlesPerFeed: 10,
    forceRefresh: false,
    feedTimeoutSeconds: 180,
  },
  prices: { days: 90 },
  insiders: { maxFilingsPerCompany: 10 },
  dedup_articles: { enrichLimit: 200 },
  market_reactions: { limit: 200 },
};

export const FULL_LIMITS = {
  ingest_feeds: {
    extractArticles: false,
    maxArticlesPerFeed: 30,
    forceRefresh: true,
    feedTimeoutSeconds: 600,
  },
  prices: { days: 400 },
  insiders: { maxFilingsPerCompany: 40 },
  dedup_articles: { enrichLimit: 5000 },
  market_reactions: { limit: 500 },
};

function normalizePipelineOptions(mode, options = {}) {
  if (mode !== PIPELINE_MODES.FULL) {
    return { extractArticles: false };
  }
  return { extractArticles: Boolean(options.extractArticles) };
}

export function limitsForMode(mode, options = {}) {
  const ingestOptions = normalizePipelineOptions(mode, options);
  if (mode === PIPELINE_MODES.FULL) {
    return {
      ...FULL_LIMITS,
      ingest_feeds: {
        ...FULL_LIMITS.ingest_feeds,
        extractArticles: ingestOptions.extractArticles,
      },
    };
  }
  return FAST_LIMITS;
}

function buildQuery(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function countTickers(tickersCsv) {
  if (!tickersCsv?.trim()) return 0;
  return tickersCsv.split(',').map((item) => item.trim()).filter(Boolean).length;
}

export function chunkCountForTickers(tickerCount) {
  const count = Math.max(tickerCount, 1);
  return Math.ceil(count / TICKER_CHUNK_SIZE);
}

function chunkedStepEstimate(stepId, mode, tickerCount) {
  const chunks = chunkCountForTickers(tickerCount);
  const rates = mode === PIPELINE_MODES.FULL ? FULL_CHUNK_SECONDS : FAST_CHUNK_SECONDS;
  const { min, max } = rates[stepId];
  return { min: chunks * min, max: chunks * max };
}

/**
 * Ingest duration: RSS summaries use parallel feed prefetch (~90–150s observed).
 * HTML extraction scales with per-feed article cap (was 45–90 min when uncapped).
 */
export function estimateIngestFeedsDuration(
  limits,
  feedCount = DEFAULT_FEED_COUNT,
) {
  const { extractArticles, maxArticlesPerFeed, feedTimeoutSeconds } = limits.ingest_feeds;
  if (!extractArticles) {
    return { min: 90, max: 150 };
  }
  const secPerFeedMin = 20;
  const secPerFeedMax = Math.min(
    feedTimeoutSeconds,
    15 + Math.round(maxArticlesPerFeed * 0.35),
  );
  return {
    min: feedCount * secPerFeedMin,
    max: feedCount * secPerFeedMax,
  };
}

/** HTML-extraction ingest estimate (full slow run with extractArticles enabled). */
export function estimateFullIngestFeedsDuration(
  limits = FULL_LIMITS,
  feedCount = DEFAULT_FEED_COUNT,
) {
  return estimateIngestFeedsDuration(
    {
      ...limits,
      ingest_feeds: { ...limits.ingest_feeds, extractArticles: true },
    },
    feedCount,
  );
}

function stepEstimate(stepId, mode, tickerCount, options = {}) {
  const tickerTotal = Math.max(tickerCount, 1);
  if (stepId === 'fundamentals' || stepId === 'prices' || stepId === 'insiders') {
    return chunkedStepEstimate(stepId, mode, tickerCount);
  }

  if (mode === PIPELINE_MODES.FULL) {
    const limits = limitsForMode(mode, options);
    switch (stepId) {
      case 'sync_companies':
        return { min: 1, max: 10 };
      case 'ingest_feeds':
        return estimateIngestFeedsDuration(limits);
      case 'dedup_articles':
        return { min: 120, max: 600 };
      case 'macro':
        return { min: 10, max: 30 };
      case 'market_reactions':
        return { min: Math.max(5, tickerTotal * 0.01), max: tickerTotal * 1.5 };
      default:
        return { min: 0, max: 0 };
    }
  }

  switch (stepId) {
    case 'sync_companies':
      return { min: 1, max: 5 };
    case 'ingest_feeds':
      return { min: 90, max: 150 };
    case 'dedup_articles':
      return { min: 30, max: 60 };
    case 'macro':
      return { min: 5, max: 15 };
    case 'market_reactions':
      return { min: Math.max(3, tickerTotal * 0.005), max: tickerTotal * 0.5 };
    default:
      return { min: 0, max: 0 };
  }
}

export function formatSecondsRange(minSeconds, maxSeconds) {
  const formatOne = (seconds) => {
    if (seconds < 90) return `${Math.round(seconds)} sec`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 90) return `${minutes} min`;
    const hours = seconds / 3600;
    return hours >= 2 ? `${Math.round(hours)} hr` : `${hours.toFixed(1)} hr`;
  };
  if (minSeconds === maxSeconds) return formatOne(minSeconds);
  return `${formatOne(minSeconds)}–${formatOne(maxSeconds)}`;
}

export function estimatePipelineDuration(selectedStepIds, mode, tickersCsv = '', options = {}) {
  const tickerCount = countTickers(tickersCsv);
  const waves = buildExecutionWaves(selectedStepIds);
  const steps = [];
  let totalMin = 0;
  let totalMax = 0;

  for (const wave of waves) {
    let waveMin = 0;
    let waveMax = 0;
    for (const step of wave) {
      const { min, max } = stepEstimate(step.id, mode, tickerCount, options);
      const stepMin = min;
      const stepMax = max;
      steps.push({
        stepId: step.id,
        label: step.label,
        minSeconds: stepMin,
        maxSeconds: stepMax,
      });
      waveMin += stepMin;
      waveMax += stepMax;
    }
    totalMin += waveMin;
    totalMax += waveMax;
  }

  return {
    minSeconds: totalMin,
    maxSeconds: totalMax,
    steps,
    tickerCount,
  };
}

export function buildFullRunConfirmationContent(selectedStepIds, tickersCsv, options = {}) {
  const pipelineOptions = normalizePipelineOptions(PIPELINE_MODES.FULL, options);
  const limits = limitsForMode(PIPELINE_MODES.FULL, pipelineOptions);
  const { minSeconds, maxSeconds, steps } = estimatePipelineDuration(
    selectedStepIds,
    PIPELINE_MODES.FULL,
    tickersCsv,
    pipelineOptions,
  );
  const ingestEstimate = estimateIngestFeedsDuration(limits);
  const extractionLabel = pipelineOptions.extractArticles
    ? 'full article HTML extraction'
    : 'RSS summaries only';
  return {
    totalRange: formatSecondsRange(minSeconds, maxSeconds),
    extractArticles: pipelineOptions.extractArticles,
    extractionLabel,
    maxArticlesPerFeed: limits.ingest_feeds.maxArticlesPerFeed,
    ingestRange: selectedStepIds.includes('ingest_feeds')
      ? formatSecondsRange(ingestEstimate.min, ingestEstimate.max)
      : null,
    steps: steps.map((step) => ({
      label: step.label,
      range: formatSecondsRange(step.minSeconds, step.maxSeconds),
    })),
  };
}

export function buildFullRunConfirmationMessage(selectedStepIds, tickersCsv, options = {}) {
  const content = buildFullRunConfirmationContent(selectedStepIds, tickersCsv, options);
  const ingestNote = content.ingestRange
    ? ` Feed ingest alone is estimated at ${content.ingestRange}.`
    : '';
  const stepLines = content.steps.map((step) => `• ${step.label}: ${step.range}`);
  return [
    `Full slow pipeline — estimated total time: ${content.totalRange}.`,
    '',
    `This run uses ${content.extractionLabel}, up to ${content.maxArticlesPerFeed} articles per feed,`,
    `longer price history, and more insider filings.${ingestNote}`,
    '',
    'Selected steps:',
    ...stepLines,
    '',
    'Continue?',
  ].join('\n');
}

export function buildStepRequestUrl(stepId, { tickersCsv, mode, extractArticles }) {
  const limits = limitsForMode(mode, { extractArticles });
  const tickersParam = encodeURIComponent(tickersCsv);

  switch (stepId) {
    case 'sync_companies':
      return null;
    case 'fundamentals':
      return `?tickers=${tickersParam}`;
    case 'ingest_feeds':
      return tickersCsv
        ? `?tickers=${tickersParam}&${buildQuery(limits.ingest_feeds)}`
        : `?${buildQuery(limits.ingest_feeds)}`;
    case 'prices':
      return `?tickers=${tickersParam}&${buildQuery(limits.prices)}`;
    case 'insiders':
      return `?tickers=${tickersParam}&${buildQuery(limits.insiders)}`;
    case 'dedup_articles':
      return `?${buildQuery(limits.dedup_articles)}`;
    case 'macro':
      return null;
    case 'market_reactions':
      return `?${buildQuery(limits.market_reactions)}`;
    default:
      throw new Error(`Unknown pipeline step: ${stepId}`);
  }
}

export function modeSummary(mode, options = {}) {
  const limits = limitsForMode(mode, options);
  if (mode === PIPELINE_MODES.FULL) {
    const extraction = limits.ingest_feeds.extractArticles
      ? 'HTML article extraction'
      : 'RSS summaries only';
    return `Full run: ${extraction}, ${limits.ingest_feeds.maxArticlesPerFeed} articles/feed, 400-day prices, 40 Form 4 filings per ticker.`;
  }
  return `Fast run (default): RSS summaries only, ${limits.ingest_feeds.maxArticlesPerFeed} articles/feed, ${limits.prices.days}-day prices, ${limits.insiders.maxFilingsPerCompany} Form 4 filings/ticker.`;
}

export function stepDescriptionForMode(stepId, mode, options = {}) {
  const step = BOOTSTRAP_STEPS.find((item) => item.id === stepId);
  if (!step) return '';
  const limits = limitsForMode(mode, options);
  switch (stepId) {
    case 'ingest_feeds':
      if (limits.ingest_feeds.extractArticles) {
        return `Poll all ${DEFAULT_FEED_COUNT} default RSS sources with full HTML extraction (max ${limits.ingest_feeds.maxArticlesPerFeed} articles per feed, up to ${limits.ingest_feeds.feedTimeoutSeconds}s per feed).`;
      }
      return `Poll all ${DEFAULT_FEED_COUNT} default RSS sources using summaries only (max ${limits.ingest_feeds.maxArticlesPerFeed} articles per feed).`;
    case 'prices':
      return `Update daily price history for selected tickers (${limits.prices.days} days).`;
    case 'insiders':
      return `Fetch Form 4 insider transactions for selected tickers (up to ${limits.insiders.maxFilingsPerCompany} filings per company).`;
    case 'dedup_articles':
      return `Normalize dates, fuzzy dedupe titles, and enrich sentiment (up to ${limits.dedup_articles.enrichLimit} articles).`;
    case 'macro':
      return 'Refresh SPY/QQQ/sector ETF benchmark prices for narrative abnormal returns.';
    case 'market_reactions':
      return `Recompute article price reactions per ticker (up to ${limits.market_reactions.limit} articles each).`;
    default:
      return '';
  }
}
