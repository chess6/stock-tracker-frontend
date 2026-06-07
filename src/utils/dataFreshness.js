/** True when timestamp is missing or older than maxAgeHours. */
export function isStale(isoDate, maxAgeHours) {
  if (!isoDate) return true;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return true;
  const ageMs = Date.now() - parsed.getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000;
}

/** Summarize cache freshness from /api/admin/status. */
export function summarizeFreshness(freshness = {}) {
  const pricesStale = isStale(freshness.pricesUpdatedAt, 36);
  const feedsStale = isStale(freshness.feedsLastPolledAt, 12);
  const fundamentalsStale = isStale(freshness.fundamentalsUpdatedAt, 168);
  const insidersStale = isStale(freshness.insidersUpdatedAt, 168);
  const stale = pricesStale || feedsStale || fundamentalsStale || insidersStale;
  const reasons = [];
  if (pricesStale) reasons.push('prices');
  if (feedsStale) reasons.push('news');
  if (fundamentalsStale) reasons.push('fundamentals');
  if (insidersStale) reasons.push('insiders');
  return { stale, reasons, label: stale ? `Stale: ${reasons.join(', ')}` : null };
}

/** Human-readable cache timestamp for UI labels. */
export function formatFreshnessTimestamp(isoDate) {
  if (!isoDate) return 'not loaded';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return String(isoDate);
  return parsed.toLocaleString();
}
