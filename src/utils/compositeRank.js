export function sortFactorsByContribution(factors = []) {
  return [...factors].sort((a, b) => (b.contribution || 0) - (a.contribution || 0));
}

export function formatCompositeScore(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return Number(score).toFixed(3);
}

export function formatFactorPercentile(normalized) {
  if (normalized == null || Number.isNaN(Number(normalized))) return '—';
  return `P${Math.round(Number(normalized) * 100)}`;
}

export function formatRankDelta(delta) {
  if (delta == null || Number.isNaN(Number(delta))) return '—';
  const n = Number(delta);
  if (n === 0) return '→0';
  const arrow = n > 0 ? '↑' : '↓';
  return `${arrow}${Math.abs(n)}`;
}

export function rankDeltaClassName(delta) {
  if (delta == null || Number.isNaN(Number(delta))) return '';
  const n = Number(delta);
  if (n > 0) return 'text-success';
  if (n < 0) return 'text-danger';
  return 'text-muted';
}

export function rankResultsByTicker(results = []) {
  const map = {};
  results.forEach((row) => {
    if (row?.ticker) map[row.ticker] = row;
  });
  return map;
}
