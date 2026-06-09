import { BOOTSTRAP_STEPS, buildExecutionWaves } from './bootstrapPipeline';

export const PIPELINE_MODES = {
  FAST: 'fast',
  FULL: 'full',
};

/** Default feed count — keep in sync with backend DEFAULT_FEEDS length. */
export const DEFAULT_FEED_COUNT = 53;

export const FAST_LIMITS = {
  ingest_feeds: {
    extractArticles: false,
    maxArticlesPerFeed: 25,
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
    extractArticles: true,
    maxArticlesPerFeed: 0,
    forceRefresh: true,
    feedTimeoutSeconds: 600,
  },
  prices: { days: 400 },
  insiders: { maxFilingsPerCompany: 40 },
  dedup_articles: { enrichLimit: 5000 },
  market_reactions: { limit: 500 },
};

function limitsForMode(mode) {
  return mode === PIPELINE_MODES.FULL ? FULL_LIMITS : FAST_LIMITS;
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

function stepEstimate(stepId, mode, tickerCount) {
  const perTicker = Math.max(tickerCount, 1);
  if (mode === PIPELINE_MODES.FULL) {
    switch (stepId) {
      case 'sync_companies':
        return { min: 30, max: 60 };
      case 'fundamentals':
        return { min: perTicker * 4, max: perTicker * 8 };
      case 'ingest_feeds':
        return { min: 45 * 60, max: 90 * 60 };
      case 'prices':
        return { min: perTicker * 2, max: perTicker * 5 };
      case 'insiders':
        return { min: perTicker * 8, max: perTicker * 20 };
      case 'dedup_articles':
        return { min: 60, max: 300 };
      case 'macro':
        return { min: 15, max: 45 };
      case 'market_reactions':
        return { min: perTicker * 2, max: perTicker * 8 };
      default:
        return { min: 0, max: 0 };
    }
  }

  switch (stepId) {
    case 'sync_companies':
      return { min: 30, max: 60 };
    case 'fundamentals':
      return { min: perTicker * 3, max: perTicker * 6 };
    case 'ingest_feeds':
      return { min: 30, max: 90 };
    case 'prices':
      return { min: perTicker * 1, max: perTicker * 3 };
    case 'insiders':
      return { min: perTicker * 3, max: perTicker * 8 };
    case 'dedup_articles':
      return { min: 10, max: 45 };
    case 'macro':
      return { min: 10, max: 30 };
    case 'market_reactions':
      return { min: perTicker * 1, max: perTicker * 4 };
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

export function estimatePipelineDuration(selectedStepIds, mode, tickersCsv = '') {
  const tickerCount = countTickers(tickersCsv);
  const waves = buildExecutionWaves(selectedStepIds);
  const steps = [];
  let totalMin = 0;
  let totalMax = 0;

  for (const wave of waves) {
    let waveMin = 0;
    let waveMax = 0;
    for (const step of wave) {
      const { min, max } = stepEstimate(step.id, mode, tickerCount);
      steps.push({
        stepId: step.id,
        label: step.label,
        minSeconds: min,
        maxSeconds: max,
      });
      waveMin = Math.max(waveMin, min);
      waveMax = Math.max(waveMax, max);
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

export function buildFullRunConfirmationMessage(selectedStepIds, tickersCsv) {
  const { minSeconds, maxSeconds, steps } = estimatePipelineDuration(
    selectedStepIds,
    PIPELINE_MODES.FULL,
    tickersCsv,
  );
  const stepLines = steps.map(
    (step) => `• ${step.label}: ${formatSecondsRange(step.minSeconds, step.maxSeconds)}`,
  );
  return [
    `Full slow pipeline — estimated total time: ${formatSecondsRange(minSeconds, maxSeconds)}.`,
    '',
    'This run uses full article HTML extraction, unlimited articles per feed,',
    'longer price history, and more insider filings. It may take well over an hour',
    'when feed ingest is included.',
    '',
    'Selected steps:',
    ...stepLines,
    '',
    'Continue?',
  ].join('\n');
}

export function buildStepRequestUrl(stepId, { tickersCsv, mode }) {
  const limits = limitsForMode(mode);
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

export function modeSummary(mode) {
  const limits = limitsForMode(mode);
  if (mode === PIPELINE_MODES.FULL) {
    return 'Full run: HTML article extraction, unlimited feed articles, 400-day prices, 40 Form 4 filings per ticker.';
  }
  return `Fast run (default): RSS summaries only, ${limits.ingest_feeds.maxArticlesPerFeed} articles/feed, ${limits.prices.days}-day prices, ${limits.insiders.maxFilingsPerCompany} Form 4 filings/ticker.`;
}

export function stepDescriptionForMode(stepId, mode) {
  const step = BOOTSTRAP_STEPS.find((item) => item.id === stepId);
  if (!step) return '';
  const limits = limitsForMode(mode);
  switch (stepId) {
    case 'ingest_feeds':
      if (mode === PIPELINE_MODES.FULL) {
        return `Poll all ${DEFAULT_FEED_COUNT} default RSS sources with full HTML extraction and no article cap (up to ${limits.ingest_feeds.feedTimeoutSeconds}s per feed).`;
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
      return step.description;
  }
}
