import { useEffect, useState } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '../../apiConfig';
import { COMPOSITE_PRESETS } from '../../config/compositePresets';
import { formatPercent } from '../../utils/formatters';

function formatReturn(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return formatPercent(Number(value) * 100, 1);
}

export default function RankValidationPanel({ compositeId = 'deep_value' }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(API_ENDPOINTS.RESEARCH_RANK_VALIDATION, {
          params: { composite: compositeId },
        });
        if (!cancelled) setPayload(res.data || null);
      } catch (err) {
        if (!cancelled) {
          const message = err?.response?.data?.error || 'Rank validation unavailable.';
          setError(message);
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [compositeId]);

  const preset = COMPOSITE_PRESETS.find((item) => item.id === compositeId);
  const horizons = payload?.horizons || {};

  return (
    <div className="st-panel mb-3">
      <div className="st-panel-header">Rank Validation — {preset?.label || compositeId}</div>
      <div className="st-panel-body">
        <p className="small text-muted mb-2">
          Forward return spread between top and bottom ranked quintiles from historical snapshots.
        </p>
        {loading && (
          <div className="small text-muted d-flex align-items-center gap-2">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            Loading validation…
          </div>
        )}
        {error && <div className="small text-warning">{error}</div>}
        {!loading && !error && payload && (
          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0">
              <thead>
                <tr>
                  <th>Horizon</th>
                  <th className="text-end">Snapshots</th>
                  <th className="text-end">Top avg</th>
                  <th className="text-end">Bottom avg</th>
                  <th className="text-end">Spread</th>
                  <th className="text-end">+% spreads</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(horizons).map(([horizon, stats]) => (
                  <tr key={horizon}>
                    <td>{horizon}d</td>
                    <td className="text-end">{stats.snapshotsEvaluated ?? 0}</td>
                    <td className="text-end">{formatReturn(stats.topQuartileAvgReturn)}</td>
                    <td className="text-end">{formatReturn(stats.bottomQuartileAvgReturn)}</td>
                    <td className={`text-end ${stats.spread > 0 ? 'text-success' : stats.spread < 0 ? 'text-danger' : ''}`}>
                      {formatReturn(stats.spread)}
                    </td>
                    <td className="text-end">
                      {stats.positiveSpreadPct != null ? `${stats.positiveSpreadPct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
