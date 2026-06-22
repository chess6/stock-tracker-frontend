import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import HeatLegend from '../components/research/HeatLegend';
import ResearchToolbar from '../components/research/ResearchToolbar';
import FinancialGrid from '../components/research/FinancialGrid';
import ScoreSummaryBar from '../components/research/ScoreSummaryBar';
import MetricTooltipLabel from '../components/research/MetricTooltipLabel';
import InsiderPanel from '../components/research/InsiderPanel';
import CompareMetricsPanel, { MAX_COMPARE_TICKERS } from '../components/research/CompareMetricsPanel';
import ResearchCompactScoreBadges from '../components/research/ResearchCompactScoreBadges';
import ResearchPinnedStrip from '../components/research/ResearchPinnedStrip';
import useResearchKeyboard from '../hooks/useResearchKeyboard';
import { useHeatmapThemeKey } from '../hooks/useHeatmapThemeKey';
import { clampTickerIndex } from '../utils/researchKeyboard';
import {
  isPinnedTicker,
  loadPinnedTickers,
  togglePinnedTicker,
} from '../utils/researchPinned';
import { clearResearchScrollPeak, readResearchScroll } from '../utils/researchScrollState';
import ResearchTickerLink from '../components/research/ResearchTickerLink';
import {
  readScreenerTickersContext,
  saveScreenerContextBeforeLeave,
} from '../utils/researchNavigation';
import { tickerOverviewUrl } from '../utils/tickerLinks';
import { hydratePinnedTickersFromApi } from '../utils/researchPinned';
import StTooltip, { StTooltipText } from '../components/StTooltip';
import {
  SCREENER_METRIC_GROUPS,
  getScreenerMetricValue,
} from '../config/researchMetrics';
import { divergenceSignalLabel } from '../config/narrativeStates';
import { formatMetricCellTooltip } from '../config/tooltipRegistry';
import { formatDecimal, formatPercent, formatUsd, formatCompactUsd, formatSharesCell } from '../utils/formatters';
import {
  buildHistoricalStats,
  describeHeat,
  precomputeRowHeatStyles,
  precomputeScreenerRowHeatStyles,
} from '../utils/scoringColors';
import { researchPrefsFromUserData, saveResearchPreferences } from '../utils/researchPrefs';
import { copyTextToClipboard } from '../utils/gridExport';
import {
  buildScreenerSearchParams,
  parseCompareParam,
  parseGroupParam,
  serializeGroupParam,
  sortTickersByMetric,
  useResearchExport,
} from '../utils/researchUrlState';
import { getPortfolio, loadUserPreferences } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { isRegistryLoaded, loadMetricRegistry } from '../config/metricRegistry';
import './research.css';

const GRID_HEAT_TOOLTIP_PROPS = { placement: 'top-start', floating: true };

function parseTickers(text) {
  return [...new Set(String(text || '').split(/[,\s]+/).map((t) => t.trim().toUpperCase()).filter(Boolean))];
}

function formatCellValue(value, format, { compact = false } = {}) {
  if (value == null || value === '') return '-';
  switch (format) {
    case 'usd':
      return compact ? formatCompactUsd(value) : formatUsd(value, value >= 100 ? 0 : 2);
    case 'percent':
      return formatPercent(typeof value === 'number' && Math.abs(value) <= 1 ? value * 100 : value, 2);
    case 'integer':
      return Number.isFinite(Number(value)) ? String(Math.round(Number(value))) : '-';
    case 'shares':
      return formatSharesCell(value, { compact });
    case 'decimal':
      return formatDecimal(value, 2);
    case 'text':
    default:
      return String(value);
  }
}

export default function ResearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const mountedRef = useRef(true);
  const { showToast } = useToast();
  const heatmapThemeKey = useHeatmapThemeKey();
  const { exportScreener, copyScreener } = useResearchExport({ showToast });

  const [tickersText, setTickersText] = useState(() => {
    const fromUrl = searchParams.get('tickers');
    if (fromUrl) return fromUrl;
    const saved = readScreenerTickersContext();
    if (saved) return saved;
    return getPortfolio().slice(0, 10).join(',');
  });
  const [dimension, setDimension] = useState(searchParams.get('dim') || 'MRY');
  const [hideEmptyRows, setHideEmptyRows] = useState(searchParams.get('hideEmpty') !== '0');
  const [sortMetric, setSortMetric] = useState(searchParams.get('sort') || null);
  const [compareTickers, setCompareTickers] = useState(() => parseCompareParam(searchParams.get('compare')));
  const [screenerData, setScreenerData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screenerExpandedGroups, setScreenerExpandedGroups] = useState(
    () => parseGroupParam(searchParams.get('groups'), SCREENER_METRIC_GROUPS.map((group) => group.id)),
  );
  const [colorMode, setColorMode] = useState(() => searchParams.get('colorMode') || 'deep_value');
  const [showHeatLegend, setShowHeatLegend] = useState(searchParams.get('heatLegend') !== '0');
  const [registryReady, setRegistryReady] = useState(isRegistryLoaded);
  const [sectorStats, setSectorStats] = useState(null);
  const [pinnedTickers, setPinnedTickers] = useState(() => loadPinnedTickers());
  const pinsLocallyModifiedRef = useRef(false);
  const [selectedTickerIndex, setSelectedTickerIndex] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const safeNavigate = useCallback((to) => {
    if (!mountedRef.current) return;
    if (!window.location.pathname.startsWith('/research')) return;
    navigate(to);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    hydratePinnedTickersFromApi(() => !pinsLocallyModifiedRef.current).then((tickers) => {
      if (cancelled || pinsLocallyModifiedRef.current) return;
      setPinnedTickers(tickers);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadMetricRegistry()
      .then(() => {
        if (!cancelled) setRegistryReady(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const urlColorMode = searchParams.get('colorMode');
    loadUserPreferences().then((prefs) => {
      if (!urlColorMode) {
        const ui = researchPrefsFromUserData(prefs);
        setColorMode(ui.colorMode);
        setShowHeatLegend(ui.showHeatLegend);
      }
    }).catch(() => {});
  }, [searchParams]);

  const handleColorModeChange = useCallback((mode) => {
    setColorMode(mode);
    saveResearchPreferences({ colorMode: mode }).catch(() => {});
  }, []);

  const handleShowHeatLegendChange = useCallback((show) => {
    setShowHeatLegend(show);
    saveResearchPreferences({ showHeatLegend: show }).catch(() => {});
  }, []);

  const syncScreenerParams = useCallback((overrides = {}) => {
    if (!mountedRef.current || location.pathname !== '/research') return;
    const tickers = overrides.tickers ?? parseTickers(tickersText);
    const params = buildScreenerSearchParams({
      tickers,
      dim: overrides.dim ?? dimension,
      compare: overrides.compare ?? compareTickers,
      groups: serializeGroupParam(
        overrides.screenerExpandedGroups ?? screenerExpandedGroups,
        SCREENER_METRIC_GROUPS.map((group) => group.id),
      ),
      sort: overrides.sortMetric ?? sortMetric,
      hideEmpty: overrides.hideEmptyRows ?? hideEmptyRows,
    });
    setSearchParams(params, { replace: true });
  }, [
    compareTickers,
    dimension,
    hideEmptyRows,
    location.pathname,
    screenerExpandedGroups,
    setSearchParams,
    sortMetric,
    tickersText,
  ]);

  const loadScreener = useCallback(async (tickers, dim) => {
    if (!tickers.length) {
      if (!mountedRef.current) return;
      setError('Enter at least one ticker.');
      setScreenerData({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_ENDPOINTS.RESEARCH_SCREENER, {
        params: { tickers: tickers.join(','), dimension: dim },
      });
      if (!mountedRef.current) return;
      setScreenerData(res.data?.results || {});
      syncScreenerParams({ tickers, dim });
    } catch {
      if (!mountedRef.current) return;
      setError('Failed to load research screener data.');
      setScreenerData({});
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [syncScreenerParams]);

  useEffect(() => {
    const tickers = parseTickers(tickersText);
    if (tickers.length) loadScreener(tickers, dimension);
    // Initial load only; toolbar actions refresh explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension]);

  useEffect(() => {
    syncScreenerParams();
  }, [
    compareTickers,
    sortMetric,
    screenerExpandedGroups,
    hideEmptyRows,
    syncScreenerParams,
  ]);

  const handleLoad = () => {
    const tickers = parseTickers(tickersText);
    loadScreener(tickers, dimension);
  };

  const handleDimensionChange = (nextDim) => {
    setDimension(nextDim);
    const tickers = parseTickers(tickersText);
    loadScreener(tickers, nextDim);
  };

  const handleCopyShareLink = async () => {
    try {
      await copyTextToClipboard(window.location.href);
      showToast('Share link copied.', 'success');
    } catch {
      showToast('Could not copy link.', 'warning');
    }
  };

  const toggleCompareTicker = useCallback((ticker) => {
    setCompareTickers((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((item) => item !== ticker);
      }
      if (prev.length >= MAX_COMPARE_TICKERS) {
        showToast(`Compare supports up to ${MAX_COMPARE_TICKERS} tickers.`, 'warning');
        return prev;
      }
      return [...prev, ticker];
    });
  }, [showToast]);

  const rawScreenerTickers = useMemo(() => parseTickers(tickersText), [tickersText]);

  const screenerTickers = useMemo(
    () => sortTickersByMetric(rawScreenerTickers, screenerData, sortMetric, SCREENER_METRIC_GROUPS),
    [rawScreenerTickers, screenerData, sortMetric],
  );
  const screenerTickersKey = useMemo(() => screenerTickers.join(','), [screenerTickers]);
  const selectedTicker = screenerTickers[selectedTickerIndex] || null;
  const highlightedColumnId = screenerTickers.length
    ? `t${clampTickerIndex(selectedTickerIndex, screenerTickers.length)}`
    : null;

  useEffect(() => {
    setSelectedTickerIndex((idx) => clampTickerIndex(idx, screenerTickers.length));
  }, [screenerTickers]);

  useEffect(() => {
    if (!screenerTickers.length || loading) return undefined;
    const saved = readResearchScroll('research-screener');
    if (saved == null) return undefined;
    let attempts = 0;
    let frame = 0;
    const restore = () => {
      window.scrollTo(0, saved);
      if (window.scrollY < saved - 16 && attempts < 16) {
        attempts += 1;
        frame = requestAnimationFrame(restore);
        return;
      }
      clearResearchScrollPeak('research-screener');
    };
    frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [screenerTickersKey, loading]);

  const handleOpenTicker = useCallback((ticker) => {
    saveScreenerContextBeforeLeave(tickersText);
    safeNavigate(tickerOverviewUrl(ticker));
  }, [safeNavigate, tickersText]);

  const handleTogglePin = useCallback((ticker) => {
    pinsLocallyModifiedRef.current = true;
    setPinnedTickers((prev) => {
      const wasPinned = isPinnedTicker(ticker, prev);
      const next = togglePinnedTicker(ticker, prev);
      showToast(wasPinned ? `Unpinned ${ticker}` : `Pinned ${ticker}`, 'success', 2500);
      return next;
    });
  }, [showToast]);

  const handleSelectPinned = useCallback((ticker) => {
    const idx = screenerTickers.indexOf(ticker);
    if (idx >= 0) setSelectedTickerIndex(idx);
    else handleOpenTicker(ticker);
  }, [handleOpenTicker, screenerTickers]);

  useResearchKeyboard({
    enabled: true,
    routePrefix: '/research',
    tickers: screenerTickers,
    selectedIndex: selectedTickerIndex,
    onSelectedIndexChange: setSelectedTickerIndex,
    onOpenTicker: handleOpenTicker,
    onTogglePin: handleTogglePin,
    onToggleCompare: toggleCompareTicker,
  });

  useEffect(() => {
    if (colorMode !== 'sector') {
      setSectorStats(null);
      return undefined;
    }
    const tickers = screenerTickersKey ? screenerTickersKey.split(',') : [];
    if (!tickers.length) {
      setSectorStats(null);
      return undefined;
    }
    let cancelled = false;
    axios.get(API_ENDPOINTS.RESEARCH_SECTOR_STATS, { params: { tickers: tickers.join(',') } })
      .then((res) => {
        if (!cancelled) setSectorStats(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setSectorStats(null);
      });
    return () => { cancelled = true; };
  }, [colorMode, screenerTickersKey]);

  const screenerGridRows = useMemo(() => {
    if (!screenerTickers.length) return [];
    const rows = [];
    SCREENER_METRIC_GROUPS.forEach((group) => {
      if (!screenerExpandedGroups.has(group.id)) return;
      rows.push({
        id: `group-${group.id}`,
        _isGroupHeader: true,
        _groupLabel: group.label,
      });
      group.metrics.forEach((metric) => {
        const row = {
          id: metric.id,
          metric: metric.label,
          metricKey: metric.id,
          format: metric.format,
          scoreCategory: metric.scoreCategory,
        };
        screenerTickers.forEach((ticker, idx) => {
          row[`t${idx}`] = getScreenerMetricValue(screenerData[ticker], metric);
        });
        if (metric.scoreCategory) {
          row._historicalStats = buildHistoricalStats(
            screenerTickers.map((_, idx) => row[`t${idx}`]),
          );
          if (colorMode !== 'sector' || sectorStats) {
            row._heatStyles = colorMode === 'sector'
              ? precomputeScreenerRowHeatStyles(row, screenerTickers, screenerData, sectorStats, colorMode)
              : precomputeRowHeatStyles(row, screenerTickers.length, {
                mode: colorMode === 'historical' ? 'relative' : colorMode,
              });
          }
        }
        rows.push(row);
      });
    });
    return rows;
  }, [screenerTickers, screenerData, screenerExpandedGroups, colorMode, sectorStats, registryReady, heatmapThemeKey]);

  const screenerGridColumns = useMemo(() => {
    const cols = [
      {
        id: 'metric',
        accessorKey: 'metric',
        header: 'Metric',
        size: 176,
        cell: ({ row }) => (
          <MetricTooltipLabel
            metricKey={row.original.metricKey || row.original.id}
            label={row.original.metric}
            className="research-metric-label"
          />
        ),
      },
    ];
    screenerTickers.forEach((ticker, idx) => {
      const data = screenerData[ticker];
      cols.push({
        id: `t${idx}`,
        accessorKey: `t${idx}`,
        header: () => {
          const subtitle = [data?.companyName, data?.sector].filter(Boolean).join(' · ');
          return (
            <div
              className={`research-ticker-header research-ticker-header--compact${selectedTicker === ticker ? ' research-ticker-header--selected' : ''}`}
              title={subtitle || undefined}
            >
              <label className="research-compare-toggle mb-0">
                <input
                  type="checkbox"
                  checked={compareTickers.includes(ticker)}
                  onChange={() => toggleCompareTicker(ticker)}
                  aria-label={`Compare ${ticker}`}
                />
              </label>
              <ResearchTickerLink
                ticker={ticker}
                dimension={dimension}
                className="st-ticker"
                onBeforeNavigate={() => saveScreenerContextBeforeLeave(tickersText)}
              >
                {ticker}
              </ResearchTickerLink>
              <ResearchCompactScoreBadges scores={data?.scores} />
            </div>
          );
        },
        size: 96,
        meta: { numeric: true, ticker },
        cellStyle: ({ row }) => {
          if (row.original?._isGroupHeader || !row.original?.scoreCategory) return {};
          return row.original._heatStyles?.[`t${idx}`] || {};
        },
        cell: ({ row }) => {
          const val = row.original[`t${idx}`];
          if (row.original.format === 'divergence_badge') {
            const divergence = val;
            if (!divergence?.signal && divergence?.divergenceScore == null) {
              return <span className="text-muted">—</span>;
            }
            return (
              <span
                className={`research-narrative-divergence-pill research-narrative-divergence-${divergence?.signal || 'neutral'}`}
                title={divergence?.divergenceScore != null
                  ? `Divergence score ${Number(divergence.divergenceScore).toFixed(2)}`
                  : undefined}
              >
                <span className="research-narrative-divergence-label">
                  {divergenceSignalLabel(divergence?.signal)}
                </span>
                {divergence?.divergenceScore != null && (
                  <span className="research-narrative-divergence-score st-num">
                    {Number(divergence.divergenceScore).toFixed(2)}
                  </span>
                )}
              </span>
            );
          }
          const sector = data?.sector;
          const cellContext = {
            mode: colorMode === 'historical' ? 'historical' : colorMode,
            format: row.original.format,
            historical: row.original._historicalStats,
            sector: sectorStats?.bySector?.[sector]?.[row.original.metricKey],
          };
          const tip = colorMode === 'sector'
            ? formatMetricCellTooltip(
              row.original.metricKey,
              describeHeat(row.original.metricKey, val, cellContext),
            )
            : row.original._heatStyles?.[`t${idx}Title`];
          const formatted = formatCellValue(val, row.original.format);
          if (!tip) return <span>{formatted}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />} {...GRID_HEAT_TOOLTIP_PROPS}>
              <span>{formatted}</span>
            </StTooltip>
          );
        },
      });
    });
    return cols;
  }, [screenerTickers, screenerData, dimension, compareTickers, toggleCompareTicker, colorMode, sectorStats, selectedTicker, tickersText]);

  return (
    <div className="st-page st-page--full research-page">
      <ResearchToolbar
        tickersText={tickersText}
        onTickersTextChange={setTickersText}
        onLoad={handleLoad}
        dimension={dimension}
        onDimensionChange={handleDimensionChange}
        hideEmptyRows={hideEmptyRows}
        onHideEmptyRowsChange={setHideEmptyRows}
        loading={loading}
        mode="screener"
        sortMetric={sortMetric}
        onSortMetricChange={setSortMetric}
        onExportCsv={() => exportScreener(screenerGridRows, screenerTickers)}
        onCopyGrid={() => copyScreener(screenerGridRows, screenerTickers)}
        onCopyShareLink={handleCopyShareLink}
        exportDisabled={!screenerGridRows.length}
        colorMode={colorMode}
        onColorModeChange={handleColorModeChange}
        showHeatLegend={showHeatLegend}
        onShowHeatLegendChange={handleShowHeatLegendChange}
      />

      {showHeatLegend && <HeatLegend colorMode={colorMode} />}

      <ResearchPinnedStrip
        pinnedTickers={pinnedTickers}
        selectedTicker={selectedTicker}
        onUnpin={handleTogglePin}
        onSelect={handleSelectPinned}
        onBeforeDeepDive={() => saveScreenerContextBeforeLeave(tickersText)}
      />

      {error && <div className="st-alert-warn">{error}</div>}

      <CompareMetricsPanel compareTickers={compareTickers} />

      <details className="st-details research-screener-card" open>
        <summary className="st-details-summary research-screener-card-summary">
          <span>Financial Screener</span>
          <span className="research-screener-card-meta">
            {screenerTickers.length} ticker{screenerTickers.length === 1 ? '' : 's'} · metrics × tickers
          </span>
        </summary>
        <div className="research-screener-card-toolbar">
          {SCREENER_METRIC_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              className={screenerExpandedGroups.has(group.id) ? 'st-btn-active' : 'st-btn-muted'}
              onClick={() => setScreenerExpandedGroups((prev) => {
                const next = new Set(prev);
                if (next.has(group.id)) next.delete(group.id);
                else next.add(group.id);
                return next;
              })}
            >
              {group.label}
            </button>
          ))}
        </div>
        <div className="research-screener-card-body">
          {loading && !screenerGridRows.length ? (
            <div className="p-2 text-xs text-st-muted">Loading…</div>
          ) : screenerTickers.length === 0 ? (
            <div className="p-2 text-xs text-st-muted">Enter at least one ticker above.</div>
          ) : (
            <FinancialGrid
              data={screenerGridRows}
              columns={screenerGridColumns}
              stickyColumnIds={['metric']}
              getRowId={(row) => row.id}
              scrollMode="page"
              scrollPersistenceKey="research-screener"
              highlightedColumnId={highlightedColumnId}
              compact
            />
          )}
        </div>
      </details>

      {screenerTickers.length > 0 && (
        <div className="research-screener-summary-row">
          <details className="st-details research-screener-summary-col research-insider-panel" open>
            <summary className="st-details-summary">Insider Buy Clusters</summary>
            <div className="research-screener-summary-scroll">
              <InsiderPanel mode="screener" tickers={screenerTickers} embedded />
            </div>
          </details>
          {Object.keys(screenerData).length > 0 && (
            <details className="st-details research-screener-summary-col research-screener-summary-col--scores" open>
              <summary className="st-details-summary">Score Summary</summary>
              <div className="research-screener-summary-scroll">
                <ScoreSummaryBar
                  tickers={screenerTickers}
                  screenerData={screenerData}
                  onBeforeDeepDive={() => saveScreenerContextBeforeLeave(tickersText)}
                />
              </div>
            </details>
          )}
        </div>
      )}

    </div>
  );
}
