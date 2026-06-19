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
  estimateIngestFeedsDuration,
  estimatePipelineDuration,
  formatSecondsRange,
  modeSummary,
  stepDescriptionForMode,
} from './bootstrapPipelineModes';
import { defaultSelectedStepIds } from './bootstrapPipeline';

describe('bootstrapPipelineModes', () => {
  test('fast limits use bounded ingest and price history', () => {
    expect(FAST_LIMITS.ingest_feeds.extractArticles).toBe(false);
    expect(FAST_LIMITS.ingest_feeds.maxArticlesPerFeed).toBe(10);
    expect(FAST_LIMITS.prices.days).toBe(90);
    expect(FAST_LIMITS.insiders.maxFilingsPerCompany).toBe(10);
  });

  test('full limits default to RSS summaries with longer history', () => {
    expect(FULL_LIMITS.ingest_feeds.extractArticles).toBe(false);
    expect(FULL_LIMITS.ingest_feeds.maxArticlesPerFeed).toBe(30);
    expect(FULL_LIMITS.prices.days).toBe(400);
    expect(FULL_LIMITS.insiders.maxFilingsPerCompany).toBe(40);
  });

  test('summary ingest estimate matches fast observed range', () => {
    const estimate = estimateIngestFeedsDuration(FULL_LIMITS);
    expect(estimate).toEqual({ min: 90, max: 150 });
  });

  test('html ingest estimate scales with 30-article cap', () => {
    const estimate = estimateFullIngestFeedsDuration();
    expect(estimate.min).toBe(DEFAULT_FEED_COUNT * 20);
    expect(estimate.max).toBe(DEFAULT_FEED_COUNT * 26);
    expect(estimate.max).toBeLessThan(45 * 60);
    expect(estimate.max).toBeLessThan(90 * 60);
  });

  test('buildStepRequestUrl encodes fast ingest params', () => {
    const suffix = buildStepRequestUrl('ingest_feeds', { tickersCsv: '', mode: PIPELINE_MODES.FAST });
    expect(suffix).toContain('extractArticles=false');
    expect(suffix).toContain('maxArticlesPerFeed=10');
    expect(suffix).toContain('forceRefresh=false');
  });

  test('buildStepRequestUrl encodes full price and insider params', () => {
    const ingest = buildStepRequestUrl('ingest_feeds', { tickersCsv: '', mode: PIPELINE_MODES.FULL });
    expect(ingest).toContain('extractArticles=false');
    expect(ingest).toContain('maxArticlesPerFeed=30');

    const ingestHtml = buildStepRequestUrl('ingest_feeds', {
      tickersCsv: '',
      mode: PIPELINE_MODES.FULL,
      extractArticles: true,
    });
    expect(ingestHtml).toContain('extractArticles=true');
    expect(ingestHtml).toContain('maxArticlesPerFeed=30');

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
    expect(fullIngest.maxSeconds).toBe(150);
    expect(fullIngest.maxSeconds).toBeLessThan(90 * 60);

    const fullHtml = estimatePipelineDuration(
      defaultSelectedStepIds(),
      PIPELINE_MODES.FULL,
      tickers,
      { extractArticles: true },
    );
    const fullHtmlIngest = fullHtml.steps.find((step) => step.stepId === 'ingest_feeds');
    expect(fullHtmlIngest.maxSeconds).toBe(estimateFullIngestFeedsDuration().max);
    expect(fullHtml.maxSeconds).toBeGreaterThan(full.maxSeconds);
  });

  test('confirmation message reflects extraction toggle', () => {
    const summaryMessage = buildFullRunConfirmationMessage(['ingest_feeds', 'prices'], 'AAPL');
    expect(summaryMessage).toContain('RSS summaries only');
    expect(summaryMessage).not.toContain('HTML extraction');

    const htmlMessage = buildFullRunConfirmationMessage(
      ['ingest_feeds', 'prices'],
      'AAPL',
      { extractArticles: true },
    );
    expect(htmlMessage).toContain('full article HTML extraction');
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
    expect(modeSummary(PIPELINE_MODES.FULL)).toContain('RSS summaries only');
    expect(modeSummary(PIPELINE_MODES.FULL)).toContain('30 articles/feed');
    expect(modeSummary(PIPELINE_MODES.FULL, { extractArticles: true })).toContain('HTML article extraction');
  });

  test('stepDescriptionForMode reflects extraction toggle on ingest', () => {
    expect(stepDescriptionForMode('ingest_feeds', PIPELINE_MODES.FULL)).toContain('summaries only');
    expect(stepDescriptionForMode('ingest_feeds', PIPELINE_MODES.FULL, { extractArticles: true }))
      .toContain('full HTML extraction');
  });

  test('stepDescriptionForMode omits duplicate text for sync_companies', () => {
    expect(stepDescriptionForMode('sync_companies', PIPELINE_MODES.FAST)).toBe('');
  });
});
