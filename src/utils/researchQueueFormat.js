export const QUEUE_EVENT_TYPES = [
  { value: '', label: 'All event types' },
  { value: 'rank_up', label: 'Rank up' },
  { value: 'rank_down', label: 'Rank down' },
  { value: 'new_insider_cluster', label: 'Insider cluster' },
  { value: 'narrative_divergence', label: 'Narrative divergence' },
  { value: 'score_improvement', label: 'Score improvement' },
  { value: 'new_catalyst', label: 'New catalyst' },
  { value: 'thesis_catalyst', label: 'Thesis catalyst' },
];

export function formatEventType(value) {
  if (!value) return 'event';
  return String(value).replace(/_/g, ' ');
}

export function formatQueueDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 16) : date.toLocaleString();
}

export function describeQueueItem(item) {
  const eventType = item?.eventType || item?.event_type;
  const details = item?.details || {};
  switch (eventType) {
    case 'rank_up':
      return `Composite rank improved by ${details.rankDelta} (${details.priorRank} → ${details.currentRank})`;
    case 'rank_down':
      return `Composite rank fell by ${Math.abs(details.rankDelta || 0)} (${details.priorRank} → ${details.currentRank})`;
    case 'new_insider_cluster':
      return `${details.uniqueBuyers ?? '?'} insiders bought; intensity ${Number(details.intensityScore ?? 0).toFixed(2)}`;
    case 'narrative_divergence':
      return `${formatEventType(details.divergenceSignal)} (divergence ${Number(details.divergenceScore ?? 0).toFixed(2)})`;
    case 'score_improvement':
      return `Piotroski F improved ${details.priorScore} → ${details.currentScore}`;
    case 'new_catalyst':
      if (details.articleTitle) {
        return `${formatEventType(details.catalystType)}: ${details.articleTitle}`;
      }
      return `${formatEventType(details.catalystType)} detected (confidence ${Number(details.confidence ?? 0).toFixed(2)})`;
    case 'thesis_catalyst':
      return `Thesis catalyst: ${formatEventType(details.catalystType)}${details.horizon ? ` (${details.horizon})` : ''}`;
    default:
      return details.summary || formatEventType(eventType);
  }
}

export function priorityLabel(priority) {
  if (priority == null || Number.isNaN(Number(priority))) return null;
  const value = Number(priority);
  if (value <= 20) return 'top';
  if (value <= 40) return 'mid';
  return 'lower';
}

export function formatPriority(priority) {
  if (priority == null || Number.isNaN(Number(priority))) return null;
  const value = Number(priority);
  const band = priorityLabel(value);
  const bandLabel = band === 'top' ? 'top tier' : band === 'mid' ? 'mid tier' : 'lower tier';
  return { value, band, label: `P${value}`, title: `${bandLabel} (lower number = higher urgency)` };
}

function queueItemKey(item) {
  return `${item.ticker}|${item.eventType}|${item.eventDate}|${item.id ?? ''}`;
}

function catalystDetailKey(item) {
  const details = item?.details || {};
  return `${item.ticker}|${details.catalystType || item.eventType}`;
}

export function dedupeQueueItems(items) {
  const singletonTypes = new Set(['new_insider_cluster', 'narrative_divergence', 'rank_up', 'rank_down', 'score_improvement']);
  const bestByKey = new Map();

  const isBetter = (candidate, incumbent) => {
    const candidatePriority = Number(candidate.priority ?? 999);
    const incumbentPriority = Number(incumbent.priority ?? 999);
    if (candidatePriority !== incumbentPriority) {
      return candidatePriority < incumbentPriority;
    }
    const candidateDate = candidate.eventDate || candidate.createdAt || '';
    const incumbentDate = incumbent.eventDate || incumbent.createdAt || '';
    return candidateDate > incumbentDate;
  };

  items.forEach((item) => {
    let key = queueItemKey(item);
    if (singletonTypes.has(item.eventType)) {
      key = `${item.ticker}|${item.eventType}`;
    } else if (item.eventType === 'new_catalyst' || item.eventType === 'thesis_catalyst') {
      key = catalystDetailKey(item);
    }
    const existing = bestByKey.get(key);
    if (!existing || isBetter(item, existing)) {
      bestByKey.set(key, item);
    }
  });

  return Array.from(bestByKey.values());
}

export function dedupeAlertsByTicker(alerts) {
  const bestByTicker = new Map();
  alerts.forEach((alert) => {
    const ticker = String(alert.ticker || '').toUpperCase();
    if (!ticker) return;
    const existing = bestByTicker.get(ticker);
    if (!existing) {
      bestByTicker.set(ticker, alert);
      return;
    }
    const existingDate = existing.clusterDetectedAt || existing.snapshotDate || '';
    const candidateDate = alert.clusterDetectedAt || alert.snapshotDate || '';
    if (candidateDate > existingDate) {
      bestByTicker.set(ticker, alert);
    }
  });
  return Array.from(bestByTicker.values());
}

export function enrichQueueWithCatalysts(queueItems, catalystItems) {
  if (!catalystItems?.length) return queueItems;
  const catalystById = new Map(
    catalystItems.filter((item) => item.id != null).map((item) => [item.id, item]),
  );
  return queueItems.map((item) => {
    const enriched = catalystById.get(item.id);
    if (!enriched) return item;
    return {
      ...item,
      sourceWeight: enriched.sourceWeight,
      eventConfidence: enriched.eventConfidence,
      clusterSourceCount: enriched.clusterSourceCount,
      catalystType: enriched.catalystType,
      details: {
        ...(item.details || {}),
        ...(enriched.details || {}),
      },
    };
  });
}

export function sortQueueItems(items, sort) {
  const list = [...items];
  if (sort === 'eventDate') {
    list.sort((a, b) => {
      const aDate = a.eventDate || a.createdAt || '';
      const bDate = b.eventDate || b.createdAt || '';
      return bDate.localeCompare(aDate);
    });
    return list;
  }
  list.sort((a, b) => {
    const aPriority = Number(a.priority ?? 999);
    const bPriority = Number(b.priority ?? 999);
    if (aPriority !== bPriority) return aPriority - bPriority;
    const aDate = a.eventDate || a.createdAt || '';
    const bDate = b.eventDate || b.createdAt || '';
    return bDate.localeCompare(aDate);
  });
  return list;
}

export function filterQueueItems(items, { portfolioTickers = [], portfolioOnly = false, eventType = '' } = {}) {
  let filtered = items;
  if (portfolioOnly && portfolioTickers.length > 0) {
    const portfolioSet = new Set(portfolioTickers.map((t) => t.toUpperCase()));
    filtered = filtered.filter((item) => portfolioSet.has(String(item.ticker || '').toUpperCase()));
  }
  if (eventType) {
    filtered = filtered.filter((item) => item.eventType === eventType);
  }
  return filtered;
}
