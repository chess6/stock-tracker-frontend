import { formatDecimal } from '../../utils/formatters';
import {
  altmanZHeatStyle,
  beneishHeatStyle,
  piotroskiHeatStyle,
  survivabilityHeatStyle,
} from '../../utils/scoringColors';

const PIOTROSKI_LABELS = {
  roa: 'Positive ROA',
  cfo: 'Positive operating cash flow',
  delta_roa: 'ROA improving YoY',
  accruals: 'CFO exceeds net income',
  delta_leverage: 'Leverage decreasing',
  delta_liquidity: 'Liquidity improving',
  no_dilution: 'No share dilution',
  delta_gross_margin: 'Gross margin improving',
  delta_asset_turnover: 'Asset turnover improving',
};

const ALTMAN_LABELS = {
  wc_ta: 'Working capital / assets',
  re_ta: 'Retained earnings / assets',
  ebit_ta: 'EBIT / assets',
  mve_tl: 'Market cap / liabilities',
  sales_ta: 'Revenue / assets',
};

function altmanZone(z) {
  if (z == null) return null;
  if (z > 2.99) return { label: 'Safe', className: 'research-text-positive' };
  if (z >= 1.81) return { label: 'Grey', className: 'research-text-amber' };
  return { label: 'Distress', className: 'research-text-negative' };
}

function ComponentRow({ label, value, pass }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="st-num research-score-table-num">{value ?? '-'}</td>
      <td className="research-score-table-pass">{pass == null ? '-' : (pass ? '✓' : '✗')}</td>
    </tr>
  );
}

export default function ScoringPanel({ scoreHistory, embedded = false }) {
  const latest = scoreHistory?.[0];
  if (!latest) {
    return (
      <div className={embedded ? 'research-chart-empty' : 'st-panel mb-2'}>
        {!embedded && <div className="st-panel-header">Score Breakdown</div>}
        <div className={embedded ? '' : 'st-panel-body research-chart-empty'}>
          No score history available.
        </div>
      </div>
    );
  }

  const piotroski = latest.piotroskiComponents || {};
  const altman = latest.altmanComponents || {};
  const zone = altmanZone(latest.altmanZ);
  const beneishFlag = latest.beneishM != null && latest.beneishM > -1.78;

  const content = (
    <div className="research-scoring-grid">
      <div className="research-score-card">
        <div className="research-score-card-header">
          <span className="research-text-amber">Piotroski F</span>
          <span className="research-score-card-value st-num rounded px-1" style={piotroskiHeatStyle(latest.piotroskiF)}>
            {latest.piotroskiF ?? '-'}
          </span>
        </div>
        <table className="research-score-table mb-0 w-full">
          <tbody>
            {Object.entries(PIOTROSKI_LABELS).map(([key, label]) => (
              <ComponentRow
                key={key}
                label={label}
                value={piotroski[key] != null ? piotroski[key] : '-'}
                pass={piotroski[key] === 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="research-score-card">
        <div className="research-score-card-header">
          <span className="research-text-amber">Altman Z</span>
          <span className="research-score-card-value st-num rounded px-1" style={altmanZHeatStyle(latest.altmanZ)}>
            {latest.altmanZ != null ? formatDecimal(latest.altmanZ, 2) : '-'}
          </span>
        </div>
        {zone && (
          <div className={`research-score-zone ${zone.className}`}>Zone: {zone.label}</div>
        )}
        <table className="research-score-table mb-0 w-full">
          <tbody>
            {Object.entries(ALTMAN_LABELS).map(([key, label]) => (
              <ComponentRow
                key={key}
                label={label}
                value={altman[key] != null ? formatDecimal(altman[key], 3) : '-'}
                pass={null}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="research-score-card">
        <div className="research-score-card-header">
          <span className="research-text-amber">Beneish M</span>
          <span className="research-score-card-value st-num rounded px-1" style={beneishHeatStyle(latest.beneishM)}>
            {latest.beneishM != null ? formatDecimal(latest.beneishM, 2) : '-'}
          </span>
        </div>
        <div className="research-score-note">
          {latest.beneishM == null ? (
            <span className="research-text-muted">Insufficient data for Beneish model.</span>
          ) : beneishFlag ? (
            <span className="research-text-negative">M &gt; -1.78 — potential earnings manipulation flag</span>
          ) : (
            <span className="research-text-positive">M ≤ -1.78 — no manipulation flag</span>
          )}
        </div>
        <div className="research-score-card-header research-score-card-header-spaced">
          <span className="research-text-amber">Survivability</span>
          <span className="research-score-card-value st-num rounded px-1" style={survivabilityHeatStyle(latest.survivability)}>
            {latest.survivability != null ? Math.round(latest.survivability) : '-'}
          </span>
        </div>
        {latest.survivability != null && (
          <div className="research-text-muted research-score-footnote">
            Composite liquidity, leverage, FCF, and distress proximity score (0–100).
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="research-scoring-panel p-2">
        {content}
        {latest.periodEnd && (
          <div className="research-text-muted research-score-footnote">
            Period ending {(latest.periodEnd || '').slice(0, 10)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="st-panel mb-2 research-scoring-panel">
      <div className="st-panel-header">Score Breakdown</div>
      <div className="st-panel-body">
        {content}
        {latest.periodEnd && (
          <div className="research-text-muted research-score-footnote">
            Period ending {(latest.periodEnd || '').slice(0, 10)}
          </div>
        )}
      </div>
    </div>
  );
}
