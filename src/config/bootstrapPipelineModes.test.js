import {
  FAST_LIMITS,
  FULL_LIMITS,
  PIPELINE_MODES,
  buildFullRunConfirmationMessage,
  buildStepRequestUrl,
  estimatePipelineDuration,
  formatSecondsRange,
  modeSummary,
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
    expect(FULL_LIMITS.ingest_feeds.maxArticlesPerFeed).toBe(0);
    expect(FULL_LIMITS.prices.days).toBe(400);
    expect(FULL_LIMITS.insiders.maxFilingsPerCompany).toBe(40);
  });

  test('buildStepRequestUrl encodes fast ingest params', () => {
    const suffix = buildStepRequestUrl('ingest_feeds', { tickersCsv: '', mode: PIPELINE_MODES.FAST });
    expect(suffix).toContain('extractArticles=false');
    expect(suffix).toContain('maxArticlesPerFeed=25');
    expect(suffix).toContain('forceRefresh=false');
  });

  test('buildStepRequestUrl encodes full price and insider params', () => {
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

  test('full run estimate exceeds fast run for default selection', () => {
    const tickers = 'AAPL,MSFT,NVDA';
    const fast = estimatePipelineDuration(defaultSelectedStepIds(), PIPELINE_MODES.FAST, tickers);
    const full = estimatePipelineDuration(defaultSelectedStepIds(), PIPELINE_MODES.FULL, tickers);
    expect(full.maxSeconds).toBeGreaterThan(fast.maxSeconds);
    expect(full.steps.some((step) => step.stepId === 'ingest_feeds')).toBe(true);
  });

  test('confirmation message includes total estimate and step breakdown', () => {
    const message = buildFullRunConfirmationMessage(['ingest_feeds', 'prices'], 'AAPL');
    expect(message).toContain('estimated total time');
    expect(message).toContain('Ingest RSS Feeds');
    expect(message).toContain('Refresh Prices');
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
  });
});
