import { useMemo } from 'react';
import { factorLabel, getCompositePreset } from '../../config/compositePresets';
import {
  formatCompositeScore,
  formatFactorPercentile,
  sortFactorsByContribution,
} from '../../utils/compositeRank';

function FactorBar({ factor }) {
  const widthPct = Math.max(4, Math.round((factor.normalized || 0) * 100));
  const contributionPct = Math.round((factor.contribution || 0) * 100);
  return (
    <div className="composite-factor-row">
      <div className="composite-factor-meta">
        <span className="composite-factor-label">{factorLabel(factor.key)}</span>
        <span className="composite-factor-stats st-num">
          {formatFactorPercentile(factor.normalized)}
          {' · '}
          w{(factor.weight * 100).toFixed(0)}%
          {' · '}
          +{contributionPct}%
        </span>
      </div>
      <div className="composite-factor-bar-track" aria-hidden="true">
        <div
          className="composite-factor-bar-fill"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export default function CompositeFactorPanel({
  rankRow,
  compositeId = 'deep_value',
  loading = false,
  embedded = false,
}) {
  const preset = useMemo(() => getCompositePreset(compositeId), [compositeId]);
  const factors = useMemo(
    () => sortFactorsByContribution(rankRow?.factors || []),
    [rankRow?.factors],
  );

  if (loading) {
    return <div className="research-chart-empty">Loading composite rank…</div>;
  }

  if (!rankRow) {
    return <div className="research-chart-empty">No composite rank available for this ticker.</div>;
  }

  const content = (
    <div className="composite-factor-panel">
      <div className="composite-factor-header">
        <div>
          <div className="composite-factor-title">{preset.label}</div>
          <div className="small text-muted">
            Rank #{rankRow.rank ?? '—'}
            {rankRow.factorsPresent != null && rankRow.factorsTotal != null
              ? ` · ${rankRow.factorsPresent}/${rankRow.factorsTotal} factors`
              : ''}
          </div>
        </div>
        <div className="composite-factor-score st-num">
          {formatCompositeScore(rankRow.compositeScore)}
        </div>
      </div>
      <div className="composite-factor-bars">
        {factors.map((factor) => (
          <FactorBar key={factor.key} factor={factor} />
        ))}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="st-panel mb-2">
      <div className="st-panel-header">Composite Opportunity</div>
      <div className="st-panel-body">{content}</div>
    </div>
  );
}
