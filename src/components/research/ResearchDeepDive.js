import { Link } from 'react-router-dom';
import MetricSparkline from './MetricSparkline';
import ScoringPanel from './ScoringPanel';
import InsiderPanel from './InsiderPanel';
import FinancialGrid from './FinancialGrid';
import MarginTrendChart from './MarginTrendChart';
import CapitalStructurePanel from './CapitalStructurePanel';
import CapitalStructureSummary from './CapitalStructureSummary';
import NarrativePanel from './NarrativePanel';
import StIcon from '../StIcon';
import { RESEARCH_METRIC_GROUPS } from '../../config/researchMetrics';
import { FINANCIAL_GROUP_ICONS, RESEARCH_ICONS } from '../../icons/researchIcons';
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
        <div className="st-panel research-deep-dive-header">
          <div className="st-panel-body research-deep-dive-header-body">
            <div className="research-deep-dive-top">
              <div className="research-deep-dive-meta">
                <div className="research-deep-dive-title-row">
                  <h1 className="st-ticker research-deep-dive-ticker">{activeTicker}</h1>
                  <span className="research-deep-dive-company">{detailData.company.name}</span>
                  <span className="research-deep-dive-sector">
                    {[detailData.company.sector, detailData.company.industry].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {scoreBadges && (
                  <div className="research-score-badges research-deep-dive-badges">
                    {scoreBadges.map(([label, value]) => (
                      <span key={label} className="st-badge-amber">{label}: {value}</span>
                    ))}
                  </div>
                )}
              </div>
              <CapitalStructureSummary periods={detailPeriods} />
              {detailData.price?.latest != null && (
                <div className="research-header-price-block">
                  <MetricSparkline
                    series={priceSparkline}
                    format="usd"
                    height={22}
                    width={72}
                  />
                  <div className="research-header-price st-num">
                    {formatCompactUsd(detailData.price.latest)}
                  </div>
                </div>
              )}
              <div className="research-deep-dive-actions">
                <button
                  type="button"
                  className={isInPortfolio ? 'st-btn-success-outline' : 'st-btn-success'}
                  onClick={onAddToPortfolio}
                >
                  {isInPortfolio ? 'In Portfolio' : 'Add'}
                </button>
                <Link to={compareLink || `/research?tickers=${activeTicker}`} className="st-btn-ghost st-link-btn">
                  Compare
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="research-analytics-row">
        <div className="research-analytics-col research-analytics-col-primary">
          <div className="st-panel research-analytics-panel">
            <div className="st-panel-header">
              <StIcon icon={RESEARCH_ICONS.marginTrends} />
              Margin Trends
            </div>
            <div className="research-chart-panel st-panel-body research-panel-body-tight">
              <MarginTrendChart periods={detailPeriods} compact deepDive />
              <CapitalStructurePanel periods={detailPeriods} compact inline />
            </div>
          </div>
        </div>
        <div className="research-analytics-col">
          <div className="st-panel research-analytics-panel">
            <div className="st-panel-header">
              <StIcon icon={RESEARCH_ICONS.narrative} />
              Narrative
            </div>
            <div className="research-chart-panel st-panel-body research-panel-body-tight">
              <NarrativePanel
                narrativeData={narrativeData}
                loading={narrativeLoading}
                deepDive
              />
            </div>
          </div>
        </div>
      </div>

      <div className="research-secondary-row">
        {detailData?.scoreHistory?.length > 0 && (
          <details className="st-details research-secondary-col">
            <summary className="st-details-summary">
              <StIcon icon={RESEARCH_ICONS.scoreBreakdown} />
              Score Breakdown
            </summary>
            <ScoringPanel scoreHistory={detailData.scoreHistory} embedded />
          </details>
        )}
        <details className="st-details research-secondary-col">
          <summary className="st-details-summary">
            <StIcon icon={RESEARCH_ICONS.insiderActivity} />
            Insider Activity
          </summary>
          {detailData && (
            <InsiderPanel mode="deep-dive" insiderAnalysis={detailData.insiderAnalysis} embedded />
          )}
        </details>
      </div>

      <div className="st-panel research-deep-dive-card">
        <div className="st-panel-header research-panel-header-with-actions">
          <span>
            <StIcon icon={RESEARCH_ICONS.financials} />
            Historical Financials
          </span>
          <div className="research-panel-header-actions">
            {RESEARCH_METRIC_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                className={expandedGroups.has(group.id) ? 'st-btn-active' : 'st-btn-muted'}
                onClick={() => onToggleGroup(group.id)}
                title={group.label}
              >
                <StIcon icon={FINANCIAL_GROUP_ICONS[group.id]} />
                {group.label}
              </button>
            ))}
          </div>
        </div>
        <div className="st-panel-body-flush">
          {loading && !detailGridRows.length ? (
            <div className="research-chart-empty">Loading…</div>
          ) : detailGridRows.length ? (
            <FinancialGrid
              data={detailGridRows}
              columns={detailColumns}
              stickyColumnIds={['metric']}
              getRowId={(row) => row.id}
              compact
              scrollMode="page"
            />
          ) : (
            <div className="research-chart-empty">No financial history available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
