import { FRESHNESS_THRESHOLDS, isStale } from '../utils/dataFreshness';

/**
 * Bootstrap steps grouped by execution wave.
 * Wave 0 runs alone (company index). Wave 1 steps run in parallel. Wave 2 is post-process.
 */
export const BOOTSTRAP_STEPS = [
  {
    id: 'sync_companies',
    label: 'Sync Companies',
    shortLabel: 'Companies',
    description: 'Download SEC ticker → CIK mapping. Needed for fundamentals and insiders on a fresh database.',
    defaultEnabled: true,
    requiresTickers: false,
    wave: 0,
  },
  {
    id: 'fundamentals',
    label: 'Refresh Fundamentals',
    shortLabel: 'Fundamentals',
    description: 'Pull latest SEC EDGAR fundamentals for selected tickers.',
    defaultEnabled: true,
    requiresTickers: true,
    wave: 1,
  },
  {
    id: 'ingest_feeds',
    label: 'Ingest RSS Feeds',
    shortLabel: 'Feeds',
    description: 'Poll default RSS sources. Fast mode uses summaries only; full run extracts article HTML.',
    defaultEnabled: true,
    requiresTickers: false,
    wave: 1,
  },
  {
    id: 'prices',
    label: 'Refresh Prices',
    shortLabel: 'Prices',
    description: 'Update daily price history for selected tickers.',
    defaultEnabled: true,
    requiresTickers: true,
    wave: 1,
  },
  {
    id: 'insiders',
    label: 'Refresh Insiders',
    shortLabel: 'Insiders',
    description: 'Fetch Form 4 insider transactions and cluster analysis for selected tickers.',
    defaultEnabled: true,
    requiresTickers: true,
    wave: 1,
  },
  {
    id: 'macro',
    label: 'Refresh Macro',
    shortLabel: 'Macro',
    description: 'Update benchmark ETF prices (SPY, QQQ, …) for narrative abnormal returns.',
    defaultEnabled: true,
    requiresTickers: false,
    wave: 1,
  },
  {
    id: 'dedup_articles',
    label: 'Dedup Articles',
    shortLabel: 'Dedup',
    description: 'Normalize dates, fuzzy dedupe titles, and enrich sentiment. Run after feed ingest.',
    defaultEnabled: true,
    requiresTickers: false,
    wave: 2,
  },
  {
    id: 'market_reactions',
    label: 'Market Reactions',
    shortLabel: 'Reactions',
    description: 'Backfill article price reactions for selected tickers (Research narrative / topEvents).',
    defaultEnabled: true,
    requiresTickers: true,
    wave: 2,
  },
];

export const WAVE_LABELS = {
  0: 'Prerequisites',
  1: 'Parallel refresh',
  2: 'Post-process',
};

export function defaultSelectedStepIds() {
  return BOOTSTRAP_STEPS.filter((step) => step.defaultEnabled).map((step) => step.id);
}

/**
 * Select only pipeline steps that need to run given current cache freshness.
 * Uses the same thresholds as the admin freshness panel and navbar stale badge.
 */
export function recommendedSelectedStepIds({ freshness = {}, counts = {}, coverage = {} } = {}) {
  const selected = [];
  const T = FRESHNESS_THRESHOLDS;

  const needsCompanies = (counts.companies || 0) === 0
    || isStale(freshness.companiesUpdatedAt, T.companiesUpdatedAt);
  if (needsCompanies) selected.push('sync_companies');

  if (
    isStale(freshness.fundamentalsUpdatedAt, T.fundamentalsUpdatedAt)
    || isStale(freshness.companyScoresUpdatedAt, T.companyScoresUpdatedAt)
  ) {
    selected.push('fundamentals');
  }

  if (
    (counts.feeds || 0) === 0
    || isStale(freshness.feedsLastPolledAt, T.feedsLastPolledAt)
  ) {
    selected.push('ingest_feeds');
  }

  if (isStale(freshness.pricesUpdatedAt, T.pricesUpdatedAt)) {
    selected.push('prices');
    selected.push('macro');
  }

  if (
    isStale(freshness.insidersUpdatedAt, T.insidersUpdatedAt)
    || isStale(freshness.insiderClustersUpdatedAt, T.insiderClustersUpdatedAt)
  ) {
    selected.push('insiders');
  }

  const ingestSelected = selected.includes('ingest_feeds');
  const hasArticles = (counts.articles || 0) > 0;
  const articlesStale = isStale(freshness.latestArticleFetchedAt, T.latestArticleFetchedAt);
  if (ingestSelected || (hasArticles && articlesStale)) {
    selected.push('dedup_articles');
  }

  const reactionGap = hasArticles
    && (coverage.articlesWithMarketReactions || 0) < (coverage.linkedArticles || 0);
  if (selected.includes('dedup_articles') || reactionGap) {
    selected.push('market_reactions');
  }

  return selected;
}

/** Human-readable reason why Recommended includes or skips a step. */
export function explainStepRecommendation(stepId, context = {}) {
  const recommended = new Set(recommendedSelectedStepIds(context));
  const { counts = {}, coverage = {} } = context;

  if (!recommended.has(stepId)) {
    return { included: false, reason: 'Cache is fresh — not needed' };
  }

  switch (stepId) {
    case 'sync_companies':
      if ((counts.companies || 0) === 0) {
        return { included: true, reason: 'No companies loaded yet' };
      }
      return { included: true, reason: 'Company index older than 7 days' };
    case 'fundamentals':
      return { included: true, reason: 'Fundamentals or scores are stale' };
    case 'ingest_feeds':
      if ((counts.feeds || 0) === 0) {
        return { included: true, reason: 'No RSS feeds configured' };
      }
      return { included: true, reason: 'Feeds not polled in the last 12 hours' };
    case 'prices':
      return { included: true, reason: 'Prices older than 36 hours' };
    case 'macro':
      return { included: true, reason: 'Benchmark ETFs refresh with prices' };
    case 'insiders':
      return { included: true, reason: 'Insider data or clusters are stale' };
    case 'dedup_articles':
      if (recommended.has('ingest_feeds')) {
        return { included: true, reason: 'Runs after feed ingest' };
      }
      return { included: true, reason: 'Article cache needs dedup/enrichment' };
    case 'market_reactions':
      if ((coverage.articlesWithMarketReactions || 0) < (coverage.linkedArticles || 0)) {
        return { included: true, reason: 'Missing market reactions on linked articles' };
      }
      return { included: true, reason: 'Runs after article dedup' };
    default:
      return { included: true, reason: 'Included in recommended run' };
  }
}

export function stepDisplayIndex(stepId) {
  const index = BOOTSTRAP_STEPS.findIndex((step) => step.id === stepId);
  return index >= 0 ? index + 1 : null;
}

export function buildExecutionWaves(selectedStepIds) {
  const selected = new Set(selectedStepIds);
  const steps = BOOTSTRAP_STEPS.filter((step) => selected.has(step.id));
  const waves = [];
  for (const step of steps) {
    if (!waves[step.wave]) waves[step.wave] = [];
    waves[step.wave].push(step);
  }
  return waves.filter(Boolean);
}

/** Visual pipeline stages left-to-right (Jenkins X style). */
export function buildPipelineStages() {
  const waveNumbers = [...new Set(BOOTSTRAP_STEPS.map((step) => step.wave))].sort((a, b) => a - b);
  return waveNumbers.map((wave) => ({
    wave,
    label: WAVE_LABELS[wave] || `Phase ${wave + 1}`,
    parallel: wave === 1,
    steps: BOOTSTRAP_STEPS.filter((step) => step.wave === wave),
  }));
}
