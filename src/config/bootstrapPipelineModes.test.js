import {
  DEFAULT_FEED_COUNT,
  FAST_LIMITS,
  FULL_LIMITS,
  PIPELINE_MODES,
  TICKER_CHUNK_SIZE,
  buildFullRunConfirmationMessage,
  buildStepRequestUrl,
  chunkCountForTickers,
  estimateFullIngestFeedsDuration,
  estimatePipelineDuration,
  formatSecondsRange,
  modeSummary,
  stepDescriptionForMode,
} from './bootstrapPipelineModes';
import { defaultSelectedStepIds } from './bootstrapPipeline';

describe('bootstrapPipelineModes', () => {
  test('fast limits use bounded ingest and price history', () => {
    expect(FAST_LIMITS.ingest_feeds.extractArticles).toBe(false);
    expect(FAST_LIMITS.ingest_feeds.maxArticlesPerFeed).toBe(25);
    expect(FAST_LIMITS.prices.days).toBe(90);
    expect(FAST_LIMITS.insiders.maxFilingsPerCompany).toBe(10);
  });

  test('full limits enable extraction and longer history', () => {
    expect(FULL_LIMITS.ingest_feeds.extractArticles).toBe(true);
    expect(FULL_LIMITS.ingest_feeds.maxArticlesPerFeed).toBe(100);
    expect(FULL_LIMITS.prices.days).toBe(400);
    expect(FULL_LIMITS.insiders.maxFilingsPerCompany).toBe(40);
  });

  test('full ingest estimate scales with 100-article cap', () => {
    const estimate = estimateFullIngestFeedsDuration();
    expect(estimate.min).toBe(DEFAULT_FEED_COUNT * 20);
    expect(estimate.max).toBe(DEFAULT_FEED_COUNT * 50);
    expect(estimate.max).toBeLessThan(45 * 60);
    expect(estimate.max).toBeLessThan(90 * 60);
  });

  test('buildStepRequestUrl encodes fast ingest params', () => {
    const suffix = buildStepRequestUrl('ingest_feeds', { tickersCsv: '', mode: PIPELINE_MODES.FAST });
    expect(suffix).toContain('extractArticles=false');
    expect(suffix).toContain('maxArticlesPerFeed=25');
    expect(suffix).toContain('forceRefresh=false');
  });

  test('buildStepRequestUrl encodes full price and insider params', () => {
    const ingest = buildStepRequestUrl('ingest_feeds', { tickersCsv: '', mode: PIPELINE_MODES.FULL });
    expect(ingest).toContain('extractArticles=true');
    expect(ingest).toContain('maxArticlesPerFeed=100');

    const prices = buildStepRequestUrl('prices', { tickersCsv: 'AAPL,MSFT', mode: PIPELINE_MODES.FULL });
    expect(prices).toContain('tickers=AAPL%2CMSFT');
    expect(prices).toContain('days=400');

    const insiders = buildStepRequestUrl('insiders', { tickersCsv: 'AAPL', mode: PIPELINE_MODES.FULL });
    expect(insiders).toContain('maxFilingsPerCompany=40');
  });

  test('macro has no query string and market reactions encodes limit', () => {
    expect(buildStepRequestUrl('macro', { tickersCsv: '', mode: PIPELINE_MODES.FAST })).toBeNull();
    const reactions = buildStepRequestUrl('market_reactions', { tickersCsv: 'AAPL', mode: PIPELINE_MODES.FAST });
    expect(reactions).toContain('limit=200');
  });

  test('chunkCountForTickers matches runner chunk size', () => {
    expect(TICKER_CHUNK_SIZE).toBe(40);
    expect(chunkCountForTickers(503)).toBe(13);
    expect(chunkCountForTickers(40)).toBe(1);
    expect(chunkCountForTickers(41)).toBe(2);
  });

  test('fast sp500 estimates reflect observed ~25 min bootstrap run', () => {
    const tickers = Array.from({ length: 503 }, (_, index) => `T${index}`).join(',');
    const estimate = estimatePipelineDuration(defaultSelectedStepIds(), PIPELINE_MODES.FAST, tickers);

    expect(estimate.minSeconds).toBeGreaterThanOrEqual(18 * 60);
    expect(estimate.minSeconds).toBeLessThanOrEqual(22 * 60);
    expect(estimate.maxSeconds).toBeGreaterThanOrEqual(28 * 60);
    expect(estimate.maxSeconds).toBeLessThanOrEqual(40 * 60);

    const insiders = estimate.steps.find((step) => step.stepId === 'insiders');
    expect(insiders.minSeconds).toBe(13 * 50);
    expect(insiders.maxSeconds).toBe(13 * 75);

    const fundamentals = estimate.steps.find((step) => step.stepId === 'fundamentals');
    expect(fundamentals.minSeconds).toBe(13 * 15);
    expect(fundamentals.maxSeconds).toBe(13 * 27);
  });

  test('full run estimate exceeds fast run for default selection', () => {
    const tickers = 'AAPL,MSFT,NVDA';
    const fast = estimatePipelineDuration(defaultSelectedStepIds(), PIPELINE_MODES.FAST, tickers);
    const full = estimatePipelineDuration(defaultSelectedStepIds(), PIPELINE_MODES.FULL, tickers);
    expect(full.maxSeconds).toBeGreaterThan(fast.maxSeconds);
    expect(full.steps.some((step) => step.stepId === 'ingest_feeds')).toBe(true);
    const fullIngest = full.steps.find((step) => step.stepId === 'ingest_feeds');
    expect(fullIngest.maxSeconds).toBe(estimateFullIngestFeedsDuration().max);
    expect(fullIngest.maxSeconds).toBeLessThan(90 * 60);
  });

  test('confirmation message includes total estimate and step breakdown', () => {
    const message = buildFullRunConfirmationMessage(['ingest_feeds', 'prices'], 'AAPL');
    expect(message).toContain('estimated total time');
    expect(message).toContain('Ingest RSS Feeds');
    expect(message).toContain('Refresh Prices');
    expect(message).toContain('Feed ingest alone is estimated at');
    expect(message).not.toContain('well over an hour');
    expect(message).toContain('Continue?');
  });

  test('formatSecondsRange handles sub-minute and hour ranges', () => {
    expect(formatSecondsRange(30, 45)).toMatch(/sec/);
    expect(formatSecondsRange(120, 300)).toMatch(/min/);
    expect(formatSecondsRange(3600, 7200)).toMatch(/hr/);
  });

  test('modeSummary describes fast and full defaults', () => {
    expect(modeSummary(PIPELINE_MODES.FAST)).toContain('Fast run');
    expect(modeSummary(PIPELINE_MODES.FULL)).toContain('Full run');
    expect(modeSummary(PIPELINE_MODES.FULL)).toContain('100 articles/feed');
  });

  test('stepDescriptionForMode omits duplicate text for sync_companies', () => {
    expect(stepDescriptionForMode('sync_companies', PIPELINE_MODES.FAST)).toBe('');
  });
});
