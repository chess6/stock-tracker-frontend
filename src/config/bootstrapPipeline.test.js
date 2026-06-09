import {
  BOOTSTRAP_STEPS,
  buildExecutionWaves,
  buildPipelineStages,
  defaultSelectedStepIds,
  recommendedSelectedStepIds,
  stepDisplayIndex,
  explainStepRecommendation,
} from './bootstrapPipeline';

describe('bootstrapPipeline', () => {
  test('default selection enables full daily refresh pipeline', () => {
    const defaults = defaultSelectedStepIds();
    expect(defaults).toContain('sync_companies');
    expect(defaults).toContain('fundamentals');
    expect(defaults).toContain('ingest_feeds');
    expect(defaults).toContain('prices');
    expect(defaults).toContain('insiders');
    expect(defaults).toContain('macro');
    expect(defaults).toContain('dedup_articles');
    expect(defaults).toContain('market_reactions');
  });

  test('buildExecutionWaves groups parallel steps in wave 1', () => {
    const waves = buildExecutionWaves([
      'sync_companies',
      'fundamentals',
      'ingest_feeds',
      'prices',
    ]);
    expect(waves).toHaveLength(2);
    expect(waves[0].map((s) => s.id)).toEqual(['sync_companies']);
    expect(waves[1].map((s) => s.id).sort()).toEqual(['fundamentals', 'ingest_feeds', 'prices'].sort());
  });

  test('buildExecutionWaves runs only selected steps', () => {
    const waves = buildExecutionWaves(['ingest_feeds', 'prices']);
    expect(waves).toHaveLength(1);
    expect(waves[0].map((s) => s.id).sort()).toEqual(['ingest_feeds', 'prices']);
  });

  test('post-process wave runs dedup and market reactions together', () => {
    const waves = buildExecutionWaves(['ingest_feeds', 'dedup_articles', 'market_reactions']);
    expect(waves).toHaveLength(2);
    expect(waves[0].map((s) => s.id)).toEqual(['ingest_feeds']);
    expect(waves[1].map((s) => s.id).sort()).toEqual(['dedup_articles', 'market_reactions'].sort());
  });

  test('every step has a unique id', () => {
    const ids = BOOTSTRAP_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('buildPipelineStages orders waves left to right with parallel middle', () => {
    const stages = buildPipelineStages();
    expect(stages).toHaveLength(3);
    expect(stages[0].parallel).toBe(false);
    expect(stages[1].parallel).toBe(true);
    expect(stages[1].steps).toHaveLength(5);
    expect(stages[2].steps.map((s) => s.id).sort()).toEqual(['dedup_articles', 'market_reactions'].sort());
  });

  test('recommendedSelectedStepIds skips fresh companies sync', () => {
    const recent = new Date().toISOString();
    const selected = recommendedSelectedStepIds({
      freshness: {
        companiesUpdatedAt: recent,
        fundamentalsUpdatedAt: recent,
        companyScoresUpdatedAt: recent,
        feedsLastPolledAt: recent,
        pricesUpdatedAt: recent,
        insidersUpdatedAt: recent,
        insiderClustersUpdatedAt: recent,
        latestArticleFetchedAt: recent,
      },
      counts: {
        companies: 10000,
        feeds: 18,
        articles: 50,
      },
      coverage: {
        articlesWithMarketReactions: 50,
        linkedArticles: 50,
      },
    });
    expect(selected).not.toContain('sync_companies');
    expect(selected).toHaveLength(0);
  });

  test('recommendedSelectedStepIds includes companies on empty database', () => {
    const selected = recommendedSelectedStepIds({
      freshness: {},
      counts: { companies: 0, feeds: 0, articles: 0 },
      coverage: {},
    });
    expect(selected).toContain('sync_companies');
    expect(selected).toContain('ingest_feeds');
  });

  test('recommendedSelectedStepIds selects stale prices and dependent post-process', () => {
    const recent = new Date().toISOString();
    const oldPrices = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const selected = recommendedSelectedStepIds({
      freshness: {
        companiesUpdatedAt: recent,
        fundamentalsUpdatedAt: recent,
        companyScoresUpdatedAt: recent,
        feedsLastPolledAt: recent,
        pricesUpdatedAt: oldPrices,
        insidersUpdatedAt: recent,
        insiderClustersUpdatedAt: recent,
        latestArticleFetchedAt: recent,
      },
      counts: { companies: 10000, feeds: 18, articles: 20 },
      coverage: { articlesWithMarketReactions: 20, linkedArticles: 20 },
    });
    expect(selected).not.toContain('sync_companies');
    expect(selected).toContain('prices');
    expect(selected).toContain('macro');
    expect(selected).not.toContain('fundamentals');
  });

  test('recommendedSelectedStepIds chains dedup after feed ingest', () => {
    const recent = new Date().toISOString();
    const oldFeeds = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const selected = recommendedSelectedStepIds({
      freshness: {
        companiesUpdatedAt: recent,
        fundamentalsUpdatedAt: recent,
        companyScoresUpdatedAt: recent,
        feedsLastPolledAt: oldFeeds,
        pricesUpdatedAt: recent,
        insidersUpdatedAt: recent,
        insiderClustersUpdatedAt: recent,
        latestArticleFetchedAt: recent,
      },
      counts: { companies: 10000, feeds: 18, articles: 20 },
      coverage: { articlesWithMarketReactions: 5, linkedArticles: 20 },
    });
    expect(selected).toContain('ingest_feeds');
    expect(selected).toContain('dedup_articles');
    expect(selected).toContain('market_reactions');
  });

  test('explainStepRecommendation describes fresh vs stale companies', () => {
    const recent = new Date().toISOString();
    const context = {
      freshness: { companiesUpdatedAt: recent },
      counts: { companies: 10000 },
      coverage: {},
    };
    expect(explainStepRecommendation('sync_companies', context)).toEqual({
      included: false,
      reason: 'Cache is fresh — not needed',
    });

    expect(explainStepRecommendation('sync_companies', {
      freshness: {},
      counts: { companies: 0 },
      coverage: {},
    })).toEqual({
      included: true,
      reason: 'No companies loaded yet',
    });
  });

  test('stepDisplayIndex matches step order', () => {
    expect(stepDisplayIndex('sync_companies')).toBe(1);
    expect(stepDisplayIndex('market_reactions')).toBe(8);
  });
});
