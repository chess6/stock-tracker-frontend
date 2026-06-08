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
  if (z > 2.99) return { label: 'Safe', className: 'text-success' };
  if (z >= 1.81) return { label: 'Grey', className: 'text-warning' };
  return { label: 'Distress', className: 'text-danger' };
}

function ComponentRow({ label, value, pass }) {
  return (
    <tr>
      <td className="small">{label}</td>
      <td className="small text-end">{value ?? '-'}</td>
      <td className="small text-center">{pass == null ? '-' : (pass ? '✓' : '✗')}</td>
    </tr>
  );
}

export default function ScoringPanel({ scoreHistory }) {
  const latest = scoreHistory?.[0];
  if (!latest) {
    return (
      <div className="card shadow-sm mb-2">
        <div className="card-body py-2 px-2 small text-muted">No score history available.</div>
      </div>
    );
  }

  const piotroski = latest.piotroskiComponents || {};
  const altman = latest.altmanComponents || {};
  const zone = altmanZone(latest.altmanZ);
  const beneishFlag = latest.beneishM != null && latest.beneishM > -1.78;

  return (
    <div className="card shadow-sm mb-2 research-scoring-panel">
      <div className="card-header py-1 px-2 small fw-semibold">Score Breakdown</div>
      <div className="card-body p-2">
        <div className="row g-2">
          <div className="col-md-4">
            <div className="research-score-card">
              <div className="research-score-card-header">
                <span>Piotroski F</span>
                <span className="research-score-card-value" style={piotroskiHeatStyle(latest.piotroskiF)}>
                  {latest.piotroskiF ?? '-'}
                </span>
              </div>
              <table className="table table-sm table-borderless mb-0 research-score-table">
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
          </div>

          <div className="col-md-4">
            <div className="research-score-card">
              <div className="research-score-card-header">
                <span>Altman Z</span>
                <span className="research-score-card-value" style={altmanZHeatStyle(latest.altmanZ)}>
                  {latest.altmanZ != null ? formatDecimal(latest.altmanZ, 2) : '-'}
                </span>
              </div>
              {zone && (
                <div className={`small mb-1 ${zone.className}`}>Zone: {zone.label}</div>
              )}
              <table className="table table-sm table-borderless mb-0 research-score-table">
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
          </div>

          <div className="col-md-4">
            <div className="research-score-card">
              <div className="research-score-card-header">
                <span>Beneish M</span>
                <span className="research-score-card-value" style={beneishHeatStyle(latest.beneishM)}>
                  {latest.beneishM != null ? formatDecimal(latest.beneishM, 2) : '-'}
                </span>
              </div>
              <div className="small mb-2">
                {latest.beneishM == null ? (
                  <span className="text-muted">Insufficient data for Beneish model.</span>
                ) : beneishFlag ? (
                  <span className="text-danger">M &gt; -1.78 — potential earnings manipulation flag</span>
                ) : (
                  <span className="text-success">M ≤ -1.78 — no manipulation flag</span>
                )}
              </div>
              <div className="research-score-card-header mt-2">
                <span>Survivability</span>
                <span className="research-score-card-value" style={survivabilityHeatStyle(latest.survivability)}>
                  {latest.survivability != null ? Math.round(latest.survivability) : '-'}
                </span>
              </div>
              {latest.survivability != null && (
                <div className="small text-muted">
                  Composite liquidity, leverage, FCF, and distress proximity score (0–100).
                </div>
              )}
            </div>
          </div>
        </div>
        {latest.periodEnd && (
          <div className="text-muted small mt-1">
            Period ending {(latest.periodEnd || '').slice(0, 10)}
          </div>
        )}
      </div>
    </div>
  );
}
