/** Max age (hours) before admin status timestamps are treated as stale. */
export const FRESHNESS_THRESHOLDS = {
  companiesUpdatedAt: 168,
  fundamentalsUpdatedAt: 168,
  companyScoresUpdatedAt: 168,
  feedsLastPolledAt: 12,
  pricesUpdatedAt: 36,
  insidersUpdatedAt: 168,
  insiderClustersUpdatedAt: 168,
  latestArticleFetchedAt: 12,
};

/** True when timestamp is missing or older than maxAgeHours. */
export function isStale(isoDate, maxAgeHours) {
  if (!isoDate) return true;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return true;
  const ageMs = Date.now() - parsed.getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000;
}

/** Summarize cache freshness from /api/admin/status. */
export function summarizeFreshness(freshness = {}, coverage = {}) {
  const pricesStale = isStale(freshness.pricesUpdatedAt, FRESHNESS_THRESHOLDS.pricesUpdatedAt);
  const feedsStale = isStale(freshness.feedsLastPolledAt, FRESHNESS_THRESHOLDS.feedsLastPolledAt);
  const fundamentalsStale = isStale(freshness.fundamentalsUpdatedAt, FRESHNESS_THRESHOLDS.fundamentalsUpdatedAt);
  const insidersStale = isStale(freshness.insidersUpdatedAt, FRESHNESS_THRESHOLDS.insidersUpdatedAt);
  const scoresStale = isStale(freshness.companyScoresUpdatedAt, FRESHNESS_THRESHOLDS.companyScoresUpdatedAt);
  const stale = pricesStale || feedsStale || fundamentalsStale || insidersStale || scoresStale;
  const reasons = [];
  if (pricesStale) reasons.push('prices');
  if (feedsStale) reasons.push('news');
  if (fundamentalsStale) reasons.push('fundamentals');
  if (insidersStale) reasons.push('insiders');
  if (scoresStale) reasons.push('scores');
  const metadataGap = Number(coverage.companiesMissingMetadata || 0) > 0;
  if (metadataGap) reasons.push(`${coverage.companiesMissingMetadata} missing sector/industry`);
  return {
    stale: stale || metadataGap,
    reasons,
    label: (stale || metadataGap) ? `Stale: ${reasons.join(', ')}` : null,
  };
}

/** Human-readable cache timestamp for UI labels. */
export function formatFreshnessTimestamp(isoDate) {
  if (!isoDate) return 'not loaded';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return String(isoDate);
  return parsed.toLocaleString();
}
