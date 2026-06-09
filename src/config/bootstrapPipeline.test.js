import {
  BOOTSTRAP_STEPS,
  buildExecutionWaves,
  buildPipelineStages,
  defaultSelectedStepIds,
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
});
