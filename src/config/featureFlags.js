/** Experimental feature flags — keys must match backend FLAG_DEFAULTS. */

export const FEATURE_FLAG_META = [
  {
    key: 'experimental_research_composite_rank',
    label: 'Research composite ranking',
    inactive: true,
    description:
      'Retired — composite rank is always on. '
      + 'GET /api/research/rank serves deep_value, turnaround, and rerating_candidate with per-factor breakdowns.',
  },
  {
    key: 'experimental_composite_rank',
    label: 'Article composite rank',
    description: 'Computes rank_score during article enrichment (news feed ordering).',
  },
  {
    key: 'experimental_signal_ranking',
    label: 'Experimental signal ranking',
    description: 'Alternate signal-based ranking paths in the enrichment pipeline.',
  },
  {
    key: 'embedding_heavy_retag',
    label: 'Embedding-heavy retag',
    description:
      'Default ON for embedding-heavy paths: worker enrich jobs, admin retag/enrich when not overridden in the request body.',
  },
  {
    key: 'experimental_research_queue',
    label: 'Research queue',
    description:
      'Enables GET /api/research/queue, dismiss endpoint, and nightly build_research_queue worker job.',
  },
  {
    key: 'experimental_thesis_versioning',
    label: 'Thesis versioning',
    description: 'Reserved for thesis snapshot skip logic and future pipeline gating.',
  },
  {
    key: 'experimental_backtest_route',
    label: 'Backtest HTTP route',
    description: 'Reserved for a future HTTP backtest endpoint (CLI backtest available via scripts/backtest.py).',
  },
  {
    key: 'experimental_insider_alerts',
    label: 'Insider alerts API',
    description: 'Enables GET /api/research/insider-alerts for insider cluster signal alerts.',
  },
  {
    key: 'experimental_narrative_alerts',
    label: 'Narrative alerts API',
    description: 'Enables GET /api/research/narrative-alerts for narrative divergence alerts.',
  },
  {
    key: 'experimental_signals',
    label: 'Unified signals API',
    description:
      'Enables GET /api/signals — normalized research signals ranked by research_importance.',
  },
];
