export const COMPOSITE_PRESETS = [
  {
    id: 'deep_value',
    label: 'Deep Value Opportunity',
    description: 'Valuation dislocation, survivability, insider conviction, margins, FCF quality.',
    factors: [
      { key: 'valuation_dislocation', weight: 0.25 },
      { key: 'survivability', weight: 0.20 },
      { key: 'insider_conviction', weight: 0.15 },
      { key: 'sentiment_divergence', weight: 0.15 },
      { key: 'margin_stabilization', weight: 0.15 },
      { key: 'fcf_quality', weight: 0.10 },
    ],
  },
  {
    id: 'turnaround',
    label: 'Turnaround Strength',
    description: 'Margin recovery, Altman improvement, insider buying, FCF stabilization.',
    factors: [
      { key: 'gross_margin_recovery', weight: 0.25 },
      { key: 'altman_improvement', weight: 0.20 },
      { key: 'insider_buying', weight: 0.20 },
      { key: 'fcf_stabilization', weight: 0.20 },
      { key: 'survivability', weight: 0.15 },
    ],
  },
  {
    id: 'rerating_candidate',
    label: 'Rerating Candidate',
    description: 'Improving fundamentals, negative sentiment divergence, insider accumulation.',
    factors: [
      { key: 'sentiment_divergence', weight: 0.30 },
      { key: 'insider_conviction', weight: 0.25 },
      { key: 'gross_margin_recovery', weight: 0.20 },
      { key: 'survivability', weight: 0.15 },
      { key: 'altman_improvement', weight: 0.10 },
    ],
  },
];

export const DEFAULT_COMPOSITE_ID = 'deep_value';

export const RANK_DELTA_LABEL = 'Rank Δ (7d)';

export const FACTOR_LABELS = {
  valuation_dislocation: 'Valuation dislocation',
  survivability: 'Survivability',
  insider_conviction: 'Insider conviction',
  margin_stabilization: 'Margin stabilization',
  fcf_quality: 'FCF quality',
  gross_margin_recovery: 'Gross margin recovery',
  altman_improvement: 'Altman improvement',
  insider_buying: 'Insider buying',
  fcf_stabilization: 'FCF stabilization',
  sentiment_divergence: 'Sentiment divergence',
};

export function getCompositePreset(id) {
  return COMPOSITE_PRESETS.find((item) => item.id === id) || COMPOSITE_PRESETS[0];
}

export function getCompositeFactorDefs(id) {
  return getCompositePreset(id).factors || [];
}

export function factorLabel(key) {
  return FACTOR_LABELS[key] || key.replace(/_/g, ' ');
}
