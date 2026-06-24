import { Link } from 'react-router-dom';
import { formatEventType, formatQueueDate } from '../../utils/researchQueueFormat';
import { formatImportancePct, importanceHeatStyle } from '../../utils/signalState';
import { tickerNewsUrl, tickerOverviewUrl } from '../../utils/tickerLinks';

export default function SignalCard({
  signal,
  onDismiss,
  onSnooze,
  onMarkRead,
  showActions = true,
}) {
  const importance = signal.researchImportance;
  const evidenceCount = (signal.evidence || []).length;

  return (
    <li className="list-group-item news-feed-item" style={importanceHeatStyle(importance)}>
      <div className="d-flex flex-wrap align-items-center gap-2 news-feed-meta">
        <Link to={tickerOverviewUrl(signal.ticker)} className="st-ticker fw-semibold">
          {signal.ticker}
        </Link>
        {importance != null && (
          <span className="st-badge st-badge-blue" title="Research importance (0–100)">
            RI {formatImportancePct(importance)}
          </span>
        )}
        <span className="st-badge st-badge-muted">{formatEventType(signal.signalType)}</span>
        <span className="text-muted">{formatQueueDate(signal.eventDate || signal.detectedAt)}</span>
        {signal.userState?.read && <span className="st-badge st-badge-muted">read</span>}
      </div>
      <p className="mb-1 small">{signal.whyItMatters}</p>
      {evidenceCount > 0 && (
        <p className="text-muted small mb-1">{evidenceCount} evidence item{evidenceCount === 1 ? '' : 's'}</p>
      )}
      <div className="d-flex flex-wrap gap-2 small align-items-center">
        <Link to={tickerOverviewUrl(signal.ticker)}>Open research</Link>
        <Link to={tickerNewsUrl(signal.ticker)}>Firehose for {signal.ticker}</Link>
        {showActions && onMarkRead && (
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => onMarkRead(signal)}>
            Mark read
          </button>
        )}
        {showActions && onSnooze && (
          <button type="button" className="btn btn-link btn-sm p-0" onClick={() => onSnooze(signal)}>
            Snooze 7d
          </button>
        )}
        {showActions && onDismiss && (
          <button type="button" className="btn btn-link btn-sm p-0 text-danger" onClick={() => onDismiss(signal)}>
            Dismiss
          </button>
        )}
      </div>
    </li>
  );
}
