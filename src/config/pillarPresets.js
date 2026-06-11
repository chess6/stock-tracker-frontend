export const PILLAR_ORDER = [
  'valuation',
  'survivability',
  'business_durability',
  'capital_quality',
  'insider_conviction',
  'fundamental_trends',
  'turnaround_evidence',
  'narrative_divergence',
];

export const PILLAR_LABELS = {
  valuation: 'Valuation',
  survivability: 'Survivability',
  business_durability: 'Business Durability',
  capital_quality: 'Capital Quality',
  insider_conviction: 'Insider Conviction',
  fundamental_trends: 'Fundamental Trends',
  turnaround_evidence: 'Turnaround Evidence',
  narrative_divergence: 'Narrative Divergence',
};

export const PILLAR_TIER_COLORS = {
  strong: 'var(--st-heat-green, #2d6a4f)',
  moderate: 'var(--st-heat-amber, #b08900)',
  weak: 'var(--st-heat-red, #9b2226)',
  unknown: 'var(--st-muted, #6c757d)',
};

export function pillarLabel(key) {
  return PILLAR_LABELS[key] || key;
}

export function formatPillarScore(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return `${Math.round(Number(score) * 100)}`;
}
