export function annualPeriods(periods = []) {
  return [...periods]
    .filter((period) => {
      const dim = (period.dimension || '').toUpperCase();
      return dim === 'ARY' || dim === 'MRY';
    })
    .sort((a, b) => (a.periodEnd || '').localeCompare(b.periodEnd || ''));
}

export function debtValue(fundamentals = {}) {
  if (fundamentals.debt != null) return fundamentals.debt;
  const current = fundamentals.debtcurrent || 0;
  const longTerm = fundamentals.debtlt || 0;
  if (fundamentals.debtcurrent != null || fundamentals.debtlt != null) {
    return current + longTerm;
  }
  return null;
}

/** Latest capital structure snapshot for header strips and panels. */
export function getCapitalStructureSnapshot(periods = []) {
  const annual = annualPeriods(periods);
  const latest = annual[annual.length - 1];
  if (!latest) return null;

  const fundamentals = latest.fundamentals || {};
  const metrics = latest.metrics || {};
  const latestDebt = debtValue(fundamentals);
  const latestEquity = fundamentals.equity;
  const latestCash = fundamentals.cashneq;
  const latestAssets = fundamentals.assets;
  const leverage = latestAssets && fundamentals.liabilities != null
    ? fundamentals.liabilities / latestAssets
    : null;
  const cashToDebt = latestDebt && latestCash != null && latestDebt !== 0
    ? latestCash / latestDebt
    : null;

  return {
    annual,
    latest,
    latestDebt,
    latestEquity,
    latestCash,
    cashToDebt,
    de: metrics.de,
    currentRatio: metrics.currentRatio,
    leverage,
  };
}
