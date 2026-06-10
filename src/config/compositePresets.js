export const COMPOSITE_PRESETS = [
  {
    id: 'deep_value',
    label: 'Deep Value Opportunity',
    description: 'Valuation dislocation, survivability, insider conviction, margins, FCF quality.',
  },
  {
    id: 'turnaround',
    label: 'Turnaround Strength',
    description: 'Margin recovery, Altman improvement, insider buying, FCF stabilization.',
  },
];

export const DEFAULT_COMPOSITE_ID = 'deep_value';

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
};

export function getCompositePreset(id) {
  return COMPOSITE_PRESETS.find((item) => item.id === id) || COMPOSITE_PRESETS[0];
}

export function factorLabel(key) {
  return FACTOR_LABELS[key] || key.replace(/_/g, ' ');
}
