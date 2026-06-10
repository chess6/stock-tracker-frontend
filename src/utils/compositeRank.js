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

export function rankResultsByTicker(results = []) {
  const map = {};
  results.forEach((row) => {
    if (row?.ticker) map[row.ticker] = row;
  });
  return map;
}
