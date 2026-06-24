/**
 * Canonical research_importance scoring — must stay in sync with
 * stock_tracker_backend/app/services/signal_scoring.py
 */

export const SIGNAL_TYPE_MATERIALITY = {
  going_concern_8k: 0.95,
  bankruptcy: 0.95,
  restatement: 0.88,
  auditor_change: 0.82,
  activist_13d: 0.90,
  insider_cluster_buy: 0.85,
  new_insider_cluster: 0.85,
  narrative_divergence: 0.75,
  rerating_candidate: 0.78,
  high_conviction: 0.72,
  risk_flag: 0.70,
  earnings_miss: 0.68,
  guidance_cut: 0.72,
  earnings_beat: 0.62,
  guidance_increase: 0.60,
  mergers_acquisitions: 0.75,
  regulation_legal_risk: 0.70,
  management_change: 0.65,
  restructuring: 0.68,
  thesis_catalyst: 0.65,
  new_catalyst: 0.58,
  rank_up: 0.55,
  rank_down: 0.52,
  score_improvement: 0.58,
  asset_sale: 0.55,
  stock_buyback: 0.50,
  insider_buying: 0.55,
  debt_reduction: 0.52,
  capital_raise: 0.54,
  fcf_inflection: 0.62,
  margin_recovery_burst: 0.60,
  unusual_volume: 0.68,
  earnings: 0.62,
  earnings_upcoming: 0.58,
  earnings_today: 0.78,
  short_interest_spike: 0.55,
};

export const DEFAULT_MATERIALITY = 0.45;

export const RESEARCH_IMPORTANCE_WEIGHTS = {
  materiality: 0.30,
  surprise: 0.20,
  relevance: 0.15,
  nonConsensus: 0.15,
  tractability: 0.10,
  recency: 0.10,
};

export const PORTFOLIO_RELEVANCE_BOOST = 0.25;
export const WATCHLIST_RELEVANCE_BOOST = 0.12;
export const RECENCY_HALF_LIFE_DAYS = 14.0;

function materialityForSignalType(signalType) {
  const key = (signalType || '').trim().toLowerCase();
  return SIGNAL_TYPE_MATERIALITY[key] ?? DEFAULT_MATERIALITY;
}

function parseDate(value) {
  if (!value) return null;
  const parts = value.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

function calendarAgeDays(eventDate, asOf = new Date()) {
  const parsed = parseDate(eventDate);
  if (!parsed) return null;
  const end = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

export function computeRecencyFactor(eventDate, halfLifeDays = RECENCY_HALF_LIFE_DAYS, asOf = null) {
  const anchor = asOf
    ? (asOf instanceof Date ? asOf : parseDate(asOf))
    : new Date();
  const ageDays = calendarAgeDays(eventDate, anchor || new Date());
  if (ageDays == null) return 0.5;
  return Math.round(Math.exp(-ageDays / halfLifeDays) * 10000) / 10000;
}

function computeSurpriseFactor(abnormalReturn1d, magnitude, confidence) {
  const components = [];
  if (abnormalReturn1d != null) {
    components.push(Math.min(1.0, 0.4 + Math.abs(Number(abnormalReturn1d)) * 4.0));
  }
  if (magnitude != null) {
    components.push(Math.min(1.0, Math.max(0.0, Number(magnitude))));
  }
  if (confidence != null) {
    components.push(Math.min(1.0, Math.max(0.0, Number(confidence))));
  }
  if (!components.length) return 0.35;
  return Math.round((components.reduce((a, b) => a + b, 0) / components.length) * 10000) / 10000;
}

function computeRelevanceFactor({ inPortfolio, inWatchlist }) {
  let score = 0.35;
  if (inPortfolio) score += PORTFOLIO_RELEVANCE_BOOST;
  else if (inWatchlist) score += WATCHLIST_RELEVANCE_BOOST;
  return Math.round(Math.min(1.0, score) * 10000) / 10000;
}

function computeNonConsensusFactor(divergenceScore) {
  if (divergenceScore == null) return 0.35;
  return Math.round(Math.min(1.0, Math.max(0.0, Number(divergenceScore))) * 10000) / 10000;
}

function computeTractabilityFactor(hasFundamentals) {
  return hasFundamentals ? 0.75 : 0.40;
}

/**
 * @param {object} inputs
 * @returns {number} research importance score 0..1
 */
export function computeResearchImportance(inputs) {
  const materiality = materialityForSignalType(inputs.signalType || inputs.signal_type);
  const surprise = computeSurpriseFactor(
    inputs.abnormalReturn1d ?? inputs.abnormal_return_1d,
    inputs.magnitude,
    inputs.confidence,
  );
  const relevance = computeRelevanceFactor({
    inPortfolio: inputs.inPortfolio ?? inputs.in_portfolio,
    inWatchlist: inputs.inWatchlist ?? inputs.in_watchlist,
  });
  const nonConsensus = computeNonConsensusFactor(
    inputs.divergenceScore ?? inputs.divergence_score,
  );
  const tractability = computeTractabilityFactor(
    inputs.hasFundamentals ?? inputs.has_fundamentals,
  );
  const recency = computeRecencyFactor(
    inputs.eventDate ?? inputs.event_date ?? inputs.detectedAt ?? inputs.detected_at,
    RECENCY_HALF_LIFE_DAYS,
    inputs.asOf ?? inputs.as_of,
  );
  const weights = RESEARCH_IMPORTANCE_WEIGHTS;
  const total = (
    materiality * weights.materiality
    + surprise * weights.surprise
    + relevance * weights.relevance
    + nonConsensus * weights.nonConsensus
    + tractability * weights.tractability
    + recency * weights.recency
  );
  return Math.round(Math.min(1.0, Math.max(0.0, total)) * 10000) / 10000;
}

export function researchImportanceBreakdown(inputs) {
  const materiality = materialityForSignalType(inputs.signalType || inputs.signal_type);
  const surprise = computeSurpriseFactor(
    inputs.abnormalReturn1d ?? inputs.abnormal_return_1d,
    inputs.magnitude,
    inputs.confidence,
  );
  const relevance = computeRelevanceFactor({
    inPortfolio: inputs.inPortfolio ?? inputs.in_portfolio,
    inWatchlist: inputs.inWatchlist ?? inputs.in_watchlist,
  });
  const nonConsensus = computeNonConsensusFactor(
    inputs.divergenceScore ?? inputs.divergence_score,
  );
  const tractability = computeTractabilityFactor(
    inputs.hasFundamentals ?? inputs.has_fundamentals,
  );
  const recency = computeRecencyFactor(
    inputs.eventDate ?? inputs.event_date ?? inputs.detectedAt ?? inputs.detected_at,
    RECENCY_HALF_LIFE_DAYS,
    inputs.asOf ?? inputs.as_of,
  );
  const weights = RESEARCH_IMPORTANCE_WEIGHTS;
  const total = (
    materiality * weights.materiality
    + surprise * weights.surprise
    + relevance * weights.relevance
    + nonConsensus * weights.nonConsensus
    + tractability * weights.tractability
    + recency * weights.recency
  );
  return {
    materiality: Math.round(materiality * weights.materiality * 10000) / 10000,
    surprise: Math.round(surprise * weights.surprise * 10000) / 10000,
    relevance: Math.round(relevance * weights.relevance * 10000) / 10000,
    nonConsensus: Math.round(nonConsensus * weights.nonConsensus * 10000) / 10000,
    tractability: Math.round(tractability * weights.tractability * 10000) / 10000,
    recency: Math.round(recency * weights.recency * 10000) / 10000,
    total: Math.round(Math.min(1.0, Math.max(0.0, total)) * 10000) / 10000,
  };
}
