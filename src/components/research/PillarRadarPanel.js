import { useMemo } from 'react';
import {
  PILLAR_ORDER,
  PILLAR_TIER_COLORS,
  formatPillarScore,
  pillarLabel,
} from '../../config/pillarPresets';

function polarPoint(index, total, radius, cx, cy) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function PillarRadarChart({ pillars }) {
  const ordered = useMemo(() => {
    const byKey = Object.fromEntries((pillars || []).map((p) => [p.pillar, p]));
    return PILLAR_ORDER.map((key) => byKey[key]).filter(Boolean);
  }, [pillars]);

  if (!ordered.length) {
    return <div className="research-chart-empty">No pillar scores available.</div>;
  }

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 72;
  const labelR = 88;
  const rings = [0.25, 0.5, 0.75, 1.0];

  const points = ordered.map((pillar, idx) => {
    const score = pillar.score != null ? Number(pillar.score) : 0;
    const r = maxR * Math.max(0, Math.min(1, score));
    return polarPoint(idx, ordered.length, r, cx, cy);
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      className="pillar-radar-chart"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Eight-pillar opportunity profile"
    >
      {rings.map((ring) => (
        <circle
          key={ring}
          cx={cx}
          cy={cy}
          r={maxR * ring}
          className="pillar-radar-ring"
        />
      ))}
      {ordered.map((_, idx) => {
        const outer = polarPoint(idx, ordered.length, maxR, cx, cy);
        return (
          <line
            key={`spoke-${PILLAR_ORDER[idx]}`}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            className="pillar-radar-spoke"
          />
        );
      })}
      <polygon points={polygon} className="pillar-radar-fill" />
      {ordered.map((pillar, idx) => {
        const labelPt = polarPoint(idx, ordered.length, labelR, cx, cy);
        const short = pillarLabel(pillar.pillar).split(' ')[0];
        return (
          <text
            key={pillar.pillar}
            x={labelPt.x}
            y={labelPt.y}
            className="pillar-radar-label"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {short}
          </text>
        );
      })}
    </svg>
  );
}

function PillarTierRow({ pillar }) {
  const tier = pillar.tier || 'unknown';
  const color = PILLAR_TIER_COLORS[tier] || PILLAR_TIER_COLORS.unknown;
  return (
    <div className="pillar-tier-row">
      <span className="pillar-tier-name">{pillar.label || pillarLabel(pillar.pillar)}</span>
      <span className="pillar-tier-score st-num">{formatPillarScore(pillar.score)}</span>
      <span className="pillar-tier-badge" style={{ borderColor: color, color }}>
        {tier}
      </span>
      <span className="pillar-tier-coverage small text-muted">
        {pillar.factorsPresent}/{pillar.factorsTotal}
      </span>
    </div>
  );
}

export default function PillarRadarPanel({
  pillarData,
  loading = false,
  embedded = false,
}) {
  if (loading) {
    return <div className="research-chart-empty">Loading pillar profile…</div>;
  }

  if (!pillarData) {
    return <div className="research-chart-empty">No pillar profile available.</div>;
  }

  if (pillarData.skipped) {
    const failed = (pillarData.failedGates || []).join(', ') || 'gate failure';
    return (
      <div className="pillar-skipped-notice">
        <div className="pillar-skipped-title">Pillar dashboard skipped</div>
        <div className="small text-muted">
          Non-compensatory gate failure ({failed}). See thesis pre-mortem for disqualification evidence.
        </div>
      </div>
    );
  }

  const pillars = pillarData.pillars || [];
  const content = (
    <div className="pillar-profile-panel">
      <div className="pillar-profile-radar-col">
        <PillarRadarChart pillars={pillars} />
        <div className="small text-muted pillar-no-rollup">
          Independent dimensions — not summed into a single rating.
        </div>
      </div>
      <div className="pillar-profile-tiers-col">
        {pillars.map((pillar) => (
          <PillarTierRow key={pillar.pillar} pillar={pillar} />
        ))}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="st-panel mb-2">
      <div className="st-panel-header">Pillar Profile</div>
      <div className="st-panel-body">{content}</div>
    </div>
  );
}
