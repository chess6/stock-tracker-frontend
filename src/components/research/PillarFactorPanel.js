import { useMemo, useState } from 'react';
import { factorLabel } from '../../config/compositePresets';
import { pillarLabel } from '../../config/pillarPresets';
import { formatFactorPercentile, sortFactorsByContribution } from '../../utils/compositeRank';

function FactorBar({ factor }) {
  const widthPct = Math.max(4, Math.round((factor.normalized || 0) * 100));
  return (
    <div className="composite-factor-row">
      <div className="composite-factor-meta">
        <span className="composite-factor-label">{factorLabel(factor.key)}</span>
        <span className="composite-factor-stats st-num">
          {formatFactorPercentile(factor.normalized)}
          {' · '}
          w{(factor.weight * 100).toFixed(0)}%
        </span>
      </div>
      <div className="composite-factor-bar-track" aria-hidden="true">
        <div className="composite-factor-bar-fill" style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}

export default function PillarFactorPanel({ pillars = [], loading = false }) {
  const [activePillar, setActivePillar] = useState(pillars[0]?.pillar || 'valuation');

  const active = useMemo(
    () => pillars.find((item) => item.pillar === activePillar) || pillars[0],
    [pillars, activePillar],
  );

  const factors = useMemo(
    () => sortFactorsByContribution(active?.factors || []),
    [active?.factors],
  );

  if (loading) {
    return <div className="research-chart-empty">Loading pillar factors…</div>;
  }

  if (!pillars.length) {
    return null;
  }

  return (
    <div className="pillar-factor-panel">
      <div className="pillar-factor-tabs">
        {pillars.map((pillar) => (
          <button
            key={pillar.pillar}
            type="button"
            className={activePillar === pillar.pillar ? 'st-btn-active' : 'st-btn-muted'}
            onClick={() => setActivePillar(pillar.pillar)}
          >
            {pillarLabel(pillar.pillar)}
          </button>
        ))}
      </div>
      {active && (
        <div className="pillar-factor-body">
          <div className="small text-muted mb-1">
            {active.tier} · coverage {Math.round((active.evidenceCoverage || 0) * 100)}%
            {' · '}
            {(active.dataClasses || []).join(', ')}
          </div>
          <div className="composite-factor-bars">
            {factors.map((factor) => (
              <FactorBar key={factor.key} factor={factor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
