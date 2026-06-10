export const NARRATIVE_STATE_LABELS = {
  bankruptcy_fear: 'Bankruptcy fear',
  liquidity_concern: 'Liquidity concern',
  turnaround_optimism: 'Turnaround optimism',
  activist_pressure: 'Activist pressure',
  cyclical_recovery: 'Cyclical recovery',
  ai_optimism: 'AI optimism',
  restructuring: 'Restructuring',
  margin_stabilization: 'Margin stabilization',
};

export const DIVERGENCE_SIGNAL_LABELS = {
  rerating_candidate: 'Rerating candidate',
  risk_flag: 'Risk flag',
  high_conviction: 'High conviction',
  aligned_positive: 'Aligned positive',
  aligned_negative: 'Aligned negative',
  neutral: 'Neutral',
};

export function narrativeStateLabel(state) {
  return NARRATIVE_STATE_LABELS[state] || state?.replace(/_/g, ' ') || '—';
}

export function divergenceSignalLabel(signal) {
  return DIVERGENCE_SIGNAL_LABELS[signal] || signal?.replace(/_/g, ' ') || '—';
}
