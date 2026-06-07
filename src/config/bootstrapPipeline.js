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
    description: 'Fetch Form 4 insider transactions for selected tickers.',
    defaultEnabled: true,
    requiresTickers: true,
    wave: 1,
  },
  {
    id: 'dedup_articles',
    label: 'Dedup Articles',
    shortLabel: 'Dedup',
    description: 'Normalize dates, fuzzy dedupe titles, and enrich sentiment. Run after feed ingest.',
    defaultEnabled: false,
    requiresTickers: false,
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
