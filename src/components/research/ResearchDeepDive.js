import { Link } from 'react-router-dom';
import MetricSparkline from './MetricSparkline';
import ScoringPanel from './ScoringPanel';
import InsiderPanel from './InsiderPanel';
import FinancialGrid from './FinancialGrid';
import MarginTrendChart from './MarginTrendChart';
import CapitalStructurePanel from './CapitalStructurePanel';
import NarrativePanel from './NarrativePanel';
import { RESEARCH_METRIC_GROUPS } from '../../config/researchMetrics';
import { formatCompactUsd } from '../../utils/formatters';

export default function ResearchDeepDive({
  activeTicker,
  detailData,
  narrativeData,
  narrativeLoading,
  loading,
  scoreBadges,
  isInPortfolio,
  onAddToPortfolio,
  detailGridRows,
  detailColumns,
  expandedGroups,
  onToggleGroup,
  detailPeriods,
  compareLink,
}) {
  const priceSparkline = (detailData?.price?.history || []).map((point) => point.close);

  return (
    <div className="research-deep-dive">
      {detailData?.company && (
        <div className="card shadow-sm research-deep-dive-header">
          <div className="card-body py-1 px-2">
            <div className="research-deep-dive-top">
              <div className="research-deep-dive-meta">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <h1 className="h5 mb-0">{activeTicker}</h1>
                  <span className="text-muted">{detailData.company.name}</span>
                  <span className="text-muted">
                    {[detailData.company.sector, detailData.company.industry].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {scoreBadges && (
                  <div className="research-score-badges mt-1">
                    {scoreBadges.map(([label, value]) => (
                      <span key={label} className="research-score-badge">{label}: {value}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="research-deep-dive-actions">
                <button
                  type="button"
                  className={`btn btn-sm ${isInPortfolio ? 'btn-outline-secondary' : 'btn-success'}`}
                  onClick={onAddToPortfolio}
                >
                  {isInPortfolio ? 'In Portfolio' : 'Add'}
                </button>
                <Link to={compareLink || `/research?tickers=${activeTicker}`} className="btn btn-sm btn-outline-primary">
                  Compare
                </Link>
              </div>
              {detailData.price?.latest != null && (
                <div className="d-flex align-items-center gap-2 research-header-price-block">
                  <MetricSparkline
                    series={priceSparkline}
                    format="usd"
                    height={22}
                    width={72}
                  />
                  <div className="fw-semibold research-header-price">
                    {formatCompactUsd(detailData.price.latest)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detailData?.scoreHistory?.length > 0 && (
        <details className="research-collapse-panel">
          <summary>Score Breakdown</summary>
          <ScoringPanel scoreHistory={detailData.scoreHistory} />
        </details>
      )}

      <div className="row g-1 research-deep-dive-charts">
        <div className="col-xl-4 col-chart">
          <div className="card shadow-sm h-100">
            <div className="card-header">Margin Trends</div>
            <div className="card-body p-1 research-chart-panel">
              <MarginTrendChart periods={detailPeriods} compact />
            </div>
          </div>
        </div>
        <div className="col-xl-4 col-chart">
          <div className="card shadow-sm h-100">
            <div className="card-header">Capital Structure</div>
            <div className="card-body p-1 research-chart-panel">
              <CapitalStructurePanel periods={detailPeriods} compact />
            </div>
          </div>
        </div>
        <div className="col-xl-4 col-chart">
          <div className="card shadow-sm h-100">
            <div className="card-header">Narrative Correlation</div>
            <div className="card-body p-1 research-chart-panel">
              <NarrativePanel
                narrativeData={narrativeData}
                loading={narrativeLoading}
                compact
                chartsOnly
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header">Narrative Events</div>
        <div className="card-body p-1">
          <NarrativePanel
            narrativeData={narrativeData}
            loading={narrativeLoading}
            compact
            tablesOnly
          />
        </div>
      </div>

      <details className="research-collapse-panel" open>
        <summary>Insider Activity</summary>
        {detailData && (
          <InsiderPanel mode="deep-dive" insiderAnalysis={detailData.insiderAnalysis} />
        )}
      </details>

      <div className="card shadow-sm research-deep-dive-card">
        <div className="card-header d-flex flex-wrap gap-1 align-items-center">
          <span>Historical Financials</span>
          <div className="ms-auto d-flex flex-wrap gap-1">
            {RESEARCH_METRIC_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`btn btn-sm ${expandedGroups.has(group.id) ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => onToggleGroup(group.id)}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body p-0">
          {loading && !detailGridRows.length ? (
            <div className="p-1 small">Loading…</div>
          ) : detailGridRows.length ? (
            <FinancialGrid
              data={detailGridRows}
              columns={detailColumns}
              stickyColumnIds={['metric']}
              getRowId={(row) => row.id}
              compact
              maxHeight="calc(100vh - 148px)"
            />
          ) : (
            <div className="p-1 small">No financial history available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
