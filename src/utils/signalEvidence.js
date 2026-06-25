/** Human-readable labels for signal evidence payloads from GET /api/signals. */

function formatDateRange(start, end) {
  if (start && end) return `${start} → ${end}`;
  if (end) return `through ${end}`;
  if (start) return `from ${start}`;
  return null;
}

export function formatSignalEvidenceItem(item) {
  if (!item || typeof item !== 'object') return 'Supporting data';

  switch (item.type) {
    case 'article':
      if (item.title) return `News: ${item.title}`;
      return 'Linked news article';
    case 'insider_cluster': {
      const buyers = item.uniqueBuyers != null
        ? `${item.uniqueBuyers} insider${Number(item.uniqueBuyers) === 1 ? '' : 's'}`
        : 'Insiders';
      const window = formatDateRange(item.windowStart, item.windowEnd);
      return window ? `${buyers} bought in cluster (${window})` : `${buyers} buying cluster detected`;
    }
    case 'filing': {
      const form = item.formType || 'SEC filing';
      const itemNum = item.itemNumber ? ` · item ${item.itemNumber}` : '';
      const summary = item.summary ? ` — ${item.summary}` : '';
      return `${form}${itemNum}${summary}`;
    }
    case 'narrative_snapshot':
      return item.snapshotDate
        ? `Narrative snapshot on ${item.snapshotDate}`
        : 'Narrative divergence snapshot';
    case 'price':
      if (item.volumeRatio != null && !Number.isNaN(Number(item.volumeRatio))) {
        return `Volume ${Number(item.volumeRatio).toFixed(1)}× vs trailing average`;
      }
      return 'Unusual price or volume activity';
    case 'calendar':
      return item.source ? `Calendar event (${item.source})` : 'Upcoming calendar event';
    case 'short_interest':
      return 'Short interest spike vs recent baseline';
    default: {
      const label = String(item.type || 'evidence').replace(/_/g, ' ');
      if (item.summary) return `${label}: ${item.summary}`;
      return label;
    }
  }
}

export function formatSignalEvidenceList(evidence = []) {
  if (!Array.isArray(evidence) || evidence.length === 0) return [];
  return evidence.map((item) => formatSignalEvidenceItem(item));
}
