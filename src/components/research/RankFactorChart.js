import { useMemo } from 'react';
import {
  factorLabel,
  getCompositeFactorDefs,
  getCompositePreset,
} from '../../config/compositePresets';
import { formatCompositeScore } from '../../utils/compositeRank';
import { signedHeatBackground, signedHeatStyle } from '../../utils/heatMap';
import { useHeatmapThemeKey } from '../../hooks/useHeatmapThemeKey';

function percentileHeatValue(normalized) {
  if (normalized == null || Number.isNaN(Number(normalized))) return null;
  return (Number(normalized) - 0.5) * 2;
}

function formatContribution(contribution) {
  if (contribution == null || Number.isNaN(Number(contribution))) return '—';
  return Number(contribution).toFixed(2);
}

function formatWeight(weight) {
  if (weight == null || Number.isNaN(Number(weight))) return '—';
  return `${Math.round(Number(weight) * 100)}%`;
}

function formatPercentile(normalized) {
  if (normalized == null || Number.isNaN(Number(normalized))) return null;
  return `${Math.round(Number(normalized) * 100)}%`;
}

function FactorRow({ factor }) {
  const available = factor.normalized != null && !Number.isNaN(Number(factor.normalized));
  const heatValue = percentileHeatValue(factor.normalized);
  const widthPct = available ? Math.max(4, Math.round(Number(factor.normalized) * 100)) : 0;
  const percentileLabel = formatPercentile(factor.normalized);
  const heatStyle = available ? signedHeatStyle(heatValue, 1) : {};
  const barFillStyle = available
    ? { width: `${widthPct}%`, backgroundColor: signedHeatBackground(heatValue, 1) }
    : { width: '0%' };

  return (
    <div className="rank-factor-row composite-factor-row">
      <div className="rank-factor-meta composite-factor-meta">
        <span className="composite-factor-label">{factorLabel(factor.key)}</span>
        <span className="composite-factor-stats st-num">
          {available ? (
            <>
              <span style={heatStyle}>{percentileLabel}</span>
              {' · '}
              contrib {formatContribution(factor.contribution)}
              {' · '}
              weight {formatWeight(factor.weight)}
            </>
          ) : (
            <span className="rank-factor-unavailable">data unavailable</span>
          )}
        </span>
      </div>
      <div className="composite-factor-bar-track" aria-hidden="true">
        {available ? (
          <div className="rank-factor-bar-fill composite-factor-bar-fill" style={barFillStyle} />
        ) : (
          <div className="rank-factor-bar-missing" />
        )}
      </div>
    </div>
  );
}

function mergeFactorsWithPreset(rankRow, compositeId) {
  const presetFactors = getCompositeFactorDefs(compositeId);
  const byKey = {};
  (rankRow?.factors || []).forEach((factor) => {
    if (factor?.key) byKey[factor.key] = factor;
  });

  return presetFactors.map((presetFactor) => {
    const scored = byKey[presetFactor.key];
    if (!scored) {
      return {
        key: presetFactor.key,
        weight: presetFactor.weight,
        normalized: null,
        contribution: null,
      };
    }
    return {
      key: presetFactor.key,
      weight: scored.weight ?? presetFactor.weight,
      normalized: scored.normalized,
      contribution: scored.contribution,
    };
  });
}

export default function RankFactorChart({
  rankRow,
  compositeId = 'deep_value',
  loading = false,
  embedded = false,
}) {
  useHeatmapThemeKey();
  const preset = useMemo(() => getCompositePreset(compositeId), [compositeId]);
  const factors = useMemo(
    () => mergeFactorsWithPreset(rankRow, compositeId),
    [rankRow, compositeId],
  );

  if (loading) {
    return <div className="research-chart-empty">Loading rank breakdown…</div>;
  }

  if (!rankRow) {
    return <div className="research-chart-empty">No composite rank available for this ticker.</div>;
  }

  const content = (
    <div className="rank-factor-chart composite-factor-panel">
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
          <FactorRow key={factor.key} factor={factor} />
        ))}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="st-panel mb-2">
      <div className="st-panel-header">Rank Factor Breakdown</div>
      <div className="st-panel-body">{content}</div>
    </div>
  );
}
