import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import StSpinner from '../components/StSpinner';
import TickerSubnav from '../components/TickerSubnav';
import PillarRadarPanel from '../components/research/PillarRadarPanel';
import InsiderPanel from '../components/research/InsiderPanel';
import NarrativePanel from '../components/research/NarrativePanel';
import MarginTrendChart from '../components/research/MarginTrendChart';
import RankFactorChart from '../components/research/RankFactorChart';
import CapitalStructureSummary from '../components/research/CapitalStructureSummary';
import MetricSparkline from '../components/research/MetricSparkline';
import StIcon from '../components/StIcon';
import { RESEARCH_ICONS } from '../icons/researchIcons';
import { isInPortfolio, addToPortfolioWithNotification } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { fetchPillarProfile, fetchThesis } from '../utils/researchThesisApi';
import { fetchCompositeRank } from '../utils/compositeRankApi';
import { DEFAULT_COMPOSITE_ID } from '../config/compositePresets';
import { formatCompositeScore } from '../utils/compositeRank';
import {
  formatCompactUsd,
  formatDecimal,
  formatPercent,
  formatUsd,
} from '../utils/formatters';
import { computeYoY } from '../utils/researchCalculations';
import { getMetricBackground } from '../utils/scoringColors';
import { getMetricTooltip } from '../config/tooltipRegistry';
import './research.css';

const KEY_METRICS = [
  { key: 'revenueYoY', label: 'Rev YoY', format: 'percent', heatKey: 'yoy' },
  { key: 'ebitdaEv', label: 'EBITDA/EV', format: 'decimal', heatKey: 'ebitdaEv' },
  { key: 'roe', label: 'ROE', format: 'percent', heatKey: 'roe' },
  { key: 'pb', label: 'P/B', format: 'decimal', heatKey: 'pb' },
  { key: 'de', label: 'D/E', format: 'decimal', heatKey: 'de' },
  { key: 'currentRatio', label: 'CR', format: 'decimal', heatKey: 'currentRatio' },
  { key: 'pe', label: 'P/E', format: 'decimal', heatKey: 'pe' },
  { key: 'fcfMargin', label: 'FCF Margin', format: 'percent', heatKey: 'fcfMargin' },
];

function formatMetricValue(value, format) {
  if (value == null || value === '') return '—';
  switch (format) {
    case 'percent':
      return formatPercent(typeof value === 'number' && Math.abs(value) <= 1 ? value * 100 : value, 1);
    case 'decimal':
      return formatDecimal(value, 2);
    case 'usd':
      return formatUsd(value, value >= 100 ? 0 : 2);
    default:
      return String(value);
  }
}

function PanelLoading({ label }) {
  return (
    <div className="research-chart-empty d-flex align-items-center gap-2">
      <StSpinner size="sm" />
      <span>Loading {label}…</span>
    </div>
  );
}

function ThesisBriefing({ thesisData, loading }) {
  if (loading) {
    return <PanelLoading label="investment signal" />;
  }
  if (!thesisData) {
    return <div className="research-chart-empty">No thesis available.</div>;
  }

  const sections = thesisData.sections || {};
  const preMortem = sections.preMortem || {};
  const disqualified = Boolean(thesisData.disqualified);
  const notice = thesisData.disqualificationNotice || {};
  const bullItems = (sections.bullCase || []).slice(0, 3);
  const bearItems = (sections.bearCase || []).slice(0, 3);

  return (
    <div className="research-overview-thesis-briefing">
      {disqualified && (
        <div className="thesis-disqualified-banner mb-2">
          Disqualified — gate failure.
          {(notice.failedGates || []).length > 0 && (
            <div className="small text-muted mt-1">
              Failed gates: {(notice.failedGates || []).join(', ')}
            </div>
          )}
        </div>
      )}

      {preMortem.statements?.length > 0 && (
        <div className="research-overview-thesis-block">
          <div className="research-section-label">{preMortem.headline || 'Pre-mortem'}</div>
          <ul className="thesis-statement-list mb-0">
            {preMortem.statements.slice(0, 3).map((item, idx) => (
              <li key={item.factorKey || item.source || idx}>
                {item.text || item.statement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!disqualified && (
        <>
          {bullItems.length > 0 && (
            <div className="research-overview-thesis-block">
              <div className="research-section-label research-text-positive">Bull case</div>
              <ul className="thesis-statement-list mb-0">
                {bullItems.map((item, idx) => (
                  <li key={item.factorKey || idx}>
                    {item.rebuttal || item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bearItems.length > 0 && (
            <div className="research-overview-thesis-block">
              <div className="research-section-label research-text-negative">Bear case</div>
              <ul className="thesis-statement-list mb-0">
                {bearItems.map((item, idx) => (
                  <li key={item.factorKey || idx}>{item.text}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KeyMetricsStrip({ detailData, loading }) {
  const badges = useMemo(() => {
    const periods = [...(detailData?.periods || [])].sort(
      (a, b) => (b.periodEnd || '').localeCompare(a.periodEnd || ''),
    );
    if (!periods.length) return [];

    const latest = periods[0];
    const prior = periods[1];
    const metrics = latest.metrics || {};
    const fundamentals = latest.fundamentals || {};

    const revenueYoY = prior
      ? computeYoY(fundamentals.revenue, prior.fundamentals?.revenue)
      : null;

    return KEY_METRICS.map((spec) => {
      let value = null;
      if (spec.key === 'revenueYoY') {
        value = revenueYoY;
      } else {
        value = metrics[spec.key] ?? null;
      }
      const heatStyle = value != null
        ? getMetricBackground(spec.heatKey, value, {
          mode: 'deep_value',
          format: spec.format,
        })
        : {};
      return {
        ...spec,
        value,
        heatStyle,
        formatted: formatMetricValue(value, spec.format),
      };
    }).filter((item) => item.value != null);
  }, [detailData]);

  if (loading) {
    return <PanelLoading label="key metrics" />;
  }

  if (!badges.length) {
    return <div className="small text-muted">No key metrics available.</div>;
  }

  return (
    <div className="research-overview-metrics-strip">
      {badges.map((badge) => (
        <div
          key={badge.key}
          className="research-overview-metric-badge"
          style={badge.heatStyle}
          title={getMetricTooltip(badge.heatKey)?.tooltip || badge.label}
        >
          <span className="research-overview-metric-label">{badge.label}</span>
          <span className="research-overview-metric-value st-num">{badge.formatted}</span>
        </div>
      ))}
    </div>
  );
}

function WhyThisStockMatters({ thesisData, thesisLoading, compositeRank, compositeRankLoading }) {
  const sections = thesisData?.sections || {};
  const preMortem = sections.preMortem || {};
  const headline = preMortem.headline || null;
  const topBull = (sections.bullCase || [])[0]?.rebuttal || null;
  const topBear = (sections.bearCase || [])[0]?.text || null;
  const disqualified = Boolean(thesisData?.disqualified);
  const failedGates = thesisData?.disqualificationNotice?.failedGates || [];
  const hasRank = compositeRank != null;
  const hasContent = hasRank || headline || topBull || topBear || disqualified;
  const stillLoading = (thesisLoading && !thesisData) || (compositeRankLoading && !hasRank);

  if (!hasContent && !stillLoading) {
    return null;
  }

  return (
    <div className="st-panel research-overview-why-matters">
      <div className="st-panel-header">
        <StIcon icon={RESEARCH_ICONS.scores} />
        Why This Stock Matters
      </div>
      <div className="st-panel-body research-panel-body-tight research-overview-why-matters-body">
        {stillLoading && !hasContent && (
          <PanelLoading label="summary" />
        )}
        {compositeRankLoading && !hasRank && hasContent && (
          <span className="small text-muted">Loading rank…</span>
        )}
        {hasRank && (
          <span className="research-overview-why-rank">
            Rank
            {' '}
            <strong className="st-num">#{compositeRank.rank ?? '—'}</strong>
            {' · '}
            Score
            {' '}
            <strong className="st-num">{formatCompositeScore(compositeRank.compositeScore)}</strong>
          </span>
        )}
        {disqualified && (
          <span className="research-overview-why-disqualified">
            Disqualified
            {failedGates.length > 0 && ` — ${failedGates.join(', ')}`}
          </span>
        )}
        {headline && (
          <span className="research-overview-why-headline">{headline}</span>
        )}
        {topBull && (
          <span className="research-overview-why-bull research-text-positive">
            <strong>Bull:</strong>
            {' '}
            {topBull}
          </span>
        )}
        {topBear && (
          <span className="research-overview-why-bear research-text-negative">
            <strong>Bear:</strong>
            {' '}
            {topBear}
          </span>
        )}
      </div>
    </div>
  );
}

function CatalystsRisksPanel({ thesisData, loading }) {
  if (loading) {
    return <PanelLoading label="catalysts and risks" />;
  }
  if (!thesisData) {
    return <div className="research-chart-empty">No catalyst or risk data.</div>;
  }

  const sections = thesisData.sections || {};
  const catalysts = sections.catalystWatchlist || [];
  const disconfirming = sections.disconfirmingConditions || [];
  const failedGates = thesisData.disqualificationNotice?.failedGates
    || (thesisData.gates || []).filter((g) => g.status === 'fail').map((g) => g.gate);

  return (
    <div className="research-overview-catalysts">
      {catalysts.length > 0 ? (
        <div className="research-overview-thesis-block">
          <div className="research-section-label">Catalyst watchlist</div>
          <ul className="thesis-watchlist mb-0">
            {catalysts.slice(0, 5).map((item) => (
              <li key={`${item.type}-${item.direction}-${item.horizon}`}>
                <strong>{item.type}</strong>
                {' · '}
                {item.direction}
                {' · '}
                {item.dataBasis}
                {' · '}
                {item.horizon}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="small text-muted mb-2">No catalysts observed.</div>
      )}

      {disconfirming.length > 0 ? (
        <div className="research-overview-thesis-block">
          <div className="research-section-label">Disconfirming conditions</div>
          <ul className="thesis-statement-list mb-0">
            {disconfirming.slice(0, 4).map((item, idx) => (
              <li key={item.factorKey || idx}>{item.text}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="small text-muted mb-2">No disconfirming conditions.</div>
      )}

      {failedGates?.length > 0 && (
        <div className="research-overview-thesis-block">
          <div className="research-section-label">Gate failures</div>
          <div className="small">{failedGates.join(', ')}</div>
        </div>
      )}
    </div>
  );
}

export default function ResearchOverviewPage() {
  const { ticker: routeTicker } = useParams();
  const ticker = routeTicker?.toUpperCase();
  const { showToast } = useToast();

  const [loadError, setLoadError] = useState('');
  const [metaLoading, setMetaLoading] = useState(true);
  const [changeLoading, setChangeLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [narrativeLoading, setNarrativeLoading] = useState(true);
  const [pillarLoading, setPillarLoading] = useState(true);
  const [thesisLoading, setThesisLoading] = useState(true);
  const [tickerMeta, setTickerMeta] = useState(null);
  const [latestClose, setLatestClose] = useState(null);
  const [changeInfo, setChangeInfo] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [narrativeData, setNarrativeData] = useState(null);
  const [pillarData, setPillarData] = useState(null);
  const [thesisData, setThesisData] = useState(null);
  const [compositeRank, setCompositeRank] = useState(null);
  const [compositeRankLoading, setCompositeRankLoading] = useState(false);

  useEffect(() => {
    if (!ticker) return undefined;
    let cancelled = false;
    const failures = [];

    setLoadError('');
    setMetaLoading(true);
    setChangeLoading(true);
    setDetailLoading(true);
    setNarrativeLoading(true);
    setPillarLoading(true);
    setThesisLoading(true);
    setTickerMeta(null);
    setLatestClose(null);
    setChangeInfo(null);
    setDetailData(null);
    setNarrativeData(null);
    setPillarData(null);
    setThesisData(null);
    setCompositeRank(null);

    const finish = () => {
      if (!cancelled && failures.length) {
        setLoadError(`Some data could not be loaded (${[...new Set(failures)].join(', ')}).`);
      }
    };

    axios.get(API_ENDPOINTS.INTRADAY(ticker))
      .then((res) => {
        if (!cancelled) setTickerMeta(res.data?.tickerMeta || null);
      })
      .catch(() => {
        if (!cancelled) {
          setTickerMeta(null);
          failures.push('company meta');
        }
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
        finish();
      });

    axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: ticker } })
      .then((res) => {
        if (cancelled) return;
        const changes = res.data?.changes || {};
        const info = changes[ticker] || {};
        const prev = info.prevClose;
        const today = info.todayClose;
        const prevNum = prev != null && !Number.isNaN(Number(prev)) ? Number(prev) : null;
        const todayNum = today != null && !Number.isNaN(Number(today)) ? Number(today) : null;
        setLatestClose(todayNum);
        if (todayNum != null && prevNum != null && prevNum !== 0) {
          const diff = todayNum - prevNum;
          setChangeInfo({
            diff,
            pct: (diff / prevNum) * 100,
            up: diff >= 0,
          });
        } else {
          setChangeInfo(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLatestClose(null);
          setChangeInfo(null);
          failures.push('daily change');
        }
      })
      .finally(() => {
        if (!cancelled) setChangeLoading(false);
        finish();
      });

    axios.get(API_ENDPOINTS.RESEARCH_TICKER(ticker), { params: { dimension: 'MRY' } })
      .then((res) => {
        if (!cancelled) setDetailData(res.data || null);
      })
      .catch(() => {
        if (!cancelled) {
          setDetailData(null);
          failures.push('research detail');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
        finish();
      });

    axios.get(API_ENDPOINTS.RESEARCH_NARRATIVE(ticker))
      .then((res) => {
        if (!cancelled) setNarrativeData(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setNarrativeData(null);
      })
      .finally(() => {
        if (!cancelled) setNarrativeLoading(false);
      });

    fetchPillarProfile(ticker)
      .then((data) => {
        if (!cancelled) setPillarData(data || null);
      })
      .catch(() => {
        if (!cancelled) setPillarData(null);
      })
      .finally(() => {
        if (!cancelled) setPillarLoading(false);
      });

    fetchThesis(ticker)
      .then((data) => {
        if (!cancelled) setThesisData(data || null);
      })
      .catch(() => {
        if (!cancelled) {
          setThesisData(null);
          failures.push('thesis');
        }
      })
      .finally(() => {
        if (!cancelled) setThesisLoading(false);
        finish();
      });

    return () => { cancelled = true; };
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return undefined;
    let cancelled = false;
    setCompositeRankLoading(true);
    fetchCompositeRank({ composite: DEFAULT_COMPOSITE_ID, tickers: [ticker], limit: 1 })
      .then((res) => {
        if (!cancelled) setCompositeRank(res?.results?.[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setCompositeRank(null);
      })
      .finally(() => {
        if (!cancelled) setCompositeRankLoading(false);
      });
    return () => { cancelled = true; };
  }, [ticker]);

  const detailPeriods = useMemo(() => {
    if (!detailData?.periods) return [];
    return [...detailData.periods].sort(
      (a, b) => (b.periodEnd || '').localeCompare(a.periodEnd || ''),
    );
  }, [detailData]);

  const scoreBadges = useMemo(() => {
    if (!detailData?.scoreHistory?.length) return null;
    const latest = detailData.scoreHistory[0];
    return [
      ['Piotroski', latest.piotroskiF, 'piotroskiF'],
      ['Altman Z', latest.altmanZ != null ? formatDecimal(latest.altmanZ, 2) : '—', 'altmanZ'],
      ['Beneish M', latest.beneishM != null ? formatDecimal(latest.beneishM, 2) : '—', 'beneishM'],
      ['Survivability', latest.survivability != null ? Math.round(latest.survivability) : '—', 'survivability'],
    ];
  }, [detailData]);

  const priceSparkline = (detailData?.price?.history || []).map((point) => point.close);
  const displayPrice = latestClose ?? detailData?.price?.latest ?? null;

  const company = detailData?.company || {};
  const companyName = company.name || tickerMeta?.name || ticker;
  const sectorIndustry = [company.sector || tickerMeta?.sector, company.industry || tickerMeta?.industry]
    .filter(Boolean)
    .join(' · ');

  const metaFields = [
    ['Exchange', tickerMeta?.exchange || company.exchange],
    ['Sector', company.sector || tickerMeta?.sector],
    ['Industry', company.industry || tickerMeta?.industry],
    ['Location', tickerMeta?.location],
  ].filter(([, value]) => value);

  const secUrl = tickerMeta?.sec_filings_url || tickerMeta?.secfilings || company.sec_filings_url;
  const siteUrl = tickerMeta?.company_site || tickerMeta?.companysite || company.company_site;

  const handleAddToPortfolio = () => {
    const notif = addToPortfolioWithNotification(ticker);
    showToast(notif.message, notif.type);
  };

  const headerPriceLoading = changeLoading && latestClose == null && detailData?.price?.latest == null;
  const hasHeaderPrice = displayPrice != null || priceSparkline.length > 0;

  return (
    <div className="st-page st-page--full research-page research-overview-page">
      {loadError && <div className="st-alert-warn">{loadError}</div>}
      <TickerSubnav ticker={ticker} />

      <div className="st-panel research-overview-header">
        <div className="st-panel-body research-overview-header-body">
          <div className="research-overview-header-top">
            <div className="research-overview-identity">
              <div className="research-deep-dive-title-row">
                <h1 className="st-ticker research-deep-dive-ticker">{ticker}</h1>
                {companyName !== ticker && (
                  <span className="research-deep-dive-company">{companyName}</span>
                )}
                {sectorIndustry && (
                  <span className="research-deep-dive-sector">{sectorIndustry}</span>
                )}
              </div>
              {metaFields.length > 0 && (
                <div className="summary-meta-strip research-overview-meta-strip">
                  {metaFields.map(([label, value]) => (
                    <span key={label}><strong>{label}:</strong> {value}</span>
                  ))}
                  {secUrl && (
                    <span>
                      <strong>SEC:</strong>{' '}
                      <a href={secUrl} target="_blank" rel="noopener noreferrer" className="st-link-muted">Filings</a>
                    </span>
                  )}
                  {siteUrl && (
                    <span>
                      <strong>Site:</strong>{' '}
                      <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="st-link-muted">
                        {siteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </span>
                  )}
                </div>
              )}
              {scoreBadges && (
                <div className="research-score-badges research-deep-dive-badges">
                  {scoreBadges.map(([label, value, registryKey]) => (
                    <span
                      key={label}
                      className="st-badge-amber"
                      title={getMetricTooltip(registryKey)?.tooltip || label}
                    >
                      {label}: {value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <CapitalStructureSummary periods={detailPeriods} />

            <div className="research-header-price-block">
              {headerPriceLoading && !hasHeaderPrice ? (
                <PanelLoading label="price" />
              ) : (
                <>
                  {priceSparkline.length > 0 && (
                    <MetricSparkline series={priceSparkline} format="usd" height={22} width={72} />
                  )}
                  {displayPrice != null && (
                    <div className="research-header-price st-num">
                      {formatCompactUsd(displayPrice)}
                    </div>
                  )}
                  {changeInfo && (
                    <div className={changeInfo.up ? 'st-change-up' : 'st-change-down'}>
                      {changeInfo.up ? '+' : ''}{changeInfo.diff.toFixed(2)}
                      {' '}
                      ({changeInfo.up ? '+' : ''}{changeInfo.pct.toFixed(2)}%)
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="research-deep-dive-actions">
              <button
                type="button"
                className={isInPortfolio(ticker) ? 'st-btn-success-outline' : 'st-btn-success'}
                onClick={handleAddToPortfolio}
              >
                {isInPortfolio(ticker) ? 'In Portfolio' : 'Add'}
              </button>
              <Link to={`/research/${ticker}`} className="st-btn-ghost st-link-btn">
                Full Research →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <WhyThisStockMatters
        thesisData={thesisData}
        thesisLoading={thesisLoading}
        compositeRank={compositeRank}
        compositeRankLoading={compositeRankLoading}
      />

      {(compositeRank || compositeRankLoading) && (
        <div className="st-panel research-overview-rank-panel">
          <div className="st-panel-header">
            <StIcon icon={RESEARCH_ICONS.scoreBreakdown} />
            Rank Factor Breakdown
          </div>
          <div className="st-panel-body research-panel-body-tight research-overview-composite-rank">
            <RankFactorChart
              rankRow={compositeRank}
              compositeId={DEFAULT_COMPOSITE_ID}
              loading={compositeRankLoading}
              embedded
            />
          </div>
        </div>
      )}

      <div className="research-overview-grid">
        <div className="st-panel research-overview-col">
          <div className="st-panel-header">
            <StIcon icon={RESEARCH_ICONS.scores} />
            Investment Signal
          </div>
          <div className="st-panel-body research-panel-body-tight">
            <ThesisBriefing thesisData={thesisData} loading={thesisLoading} />
          </div>
        </div>

        <div className="st-panel research-overview-col">
          <div className="st-panel-header">
            <StIcon icon={RESEARCH_ICONS.scoreBreakdown} />
            Pillar Profile
          </div>
          <div className="st-panel-body research-panel-body-tight">
            <PillarRadarPanel pillarData={pillarData} loading={pillarLoading} embedded />
          </div>
        </div>

        <div className="st-panel research-overview-col">
          <div className="st-panel-header">
            <StIcon icon={RESEARCH_ICONS.insiderActivity} />
            Insiders
          </div>
          <div className="st-panel-body research-panel-body-tight">
            {detailLoading && !detailData ? (
              <PanelLoading label="insider activity" />
            ) : (
              <InsiderPanel
                mode="deep-dive"
                insiderAnalysis={detailData?.insiderAnalysis}
                embedded
              />
            )}
          </div>
        </div>
      </div>

      <div className="research-overview-kpi-row">
        <div className="st-panel research-overview-margins-panel">
          <div className="st-panel-header">
            <StIcon icon={RESEARCH_ICONS.marginTrends} />
            Margin Trends
          </div>
          <div className="st-panel-body research-margin-panel-body">
            {detailLoading && !detailData ? (
              <PanelLoading label="margin trends" />
            ) : (
              <MarginTrendChart periods={detailPeriods} compact deepDive />
            )}
          </div>
        </div>

        <div className="st-panel research-overview-metrics-panel">
          <div className="st-panel-body research-panel-body-tight research-overview-metrics-body">
            <KeyMetricsStrip detailData={detailData} loading={detailLoading} />
          </div>
        </div>
      </div>

      <div className="research-overview-signals">
        <div className="st-panel research-overview-signals-col">
          <div className="st-panel-header">
            <StIcon icon={RESEARCH_ICONS.narrative} />
            Catalysts &amp; Risks
          </div>
          <div className="st-panel-body research-panel-body-tight">
            <CatalystsRisksPanel thesisData={thesisData} loading={thesisLoading} />
          </div>
        </div>

        <div className="st-panel research-overview-signals-col">
          <div className="st-panel-header">
            <StIcon icon={RESEARCH_ICONS.marginTrends} />
            Recent Changes
          </div>
          <div className="st-panel-body research-panel-body-tight">
            <NarrativePanel narrativeData={narrativeData} loading={narrativeLoading} deepDive />
          </div>
        </div>
      </div>
    </div>
  );
}
