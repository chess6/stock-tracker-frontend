/** Experimental feature flags — keys must match backend FLAG_DEFAULTS. */

export const FEATURE_FLAG_META = [
  {
    key: 'experimental_research_composite_rank',
    label: 'Research composite ranking',
    description: 'Enables GET /api/research/rank (deep_value, turnaround) with per-factor breakdowns.',
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
    description: 'Use heavier embedding models for article retagging and enrichment workers.',
  },
];
