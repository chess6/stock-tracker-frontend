import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ApexCharts from 'react-apexcharts';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import DataGrid, { DataGridColumnMenu } from '../components/DataGrid';
import TickerSubnav from '../components/TickerSubnav';
import MetricTooltipLabel from '../components/research/MetricTooltipLabel';
import MarginTrendChart from '../components/research/MarginTrendChart';
import StTooltip, { StTooltipText } from '../components/StTooltip';
import { useToast } from '../context/ToastContext';
import { isInPortfolio, addToPortfolioWithNotification } from '../utils/portfolio';
import { isRegistryLoaded, loadMetricRegistry } from '../config/metricRegistry';
import { formatMetricCellTooltip } from '../config/tooltipRegistry';
import {
  RESEARCH_METRIC_GROUPS,
  YEAR_OPTIONS,
  buildGteDate,
} from '../config/researchMetrics';
import {
  CORE_ALWAYS_SHOW_METRIC_KEYS,
  sliceColumnPeriods,
} from '../utils/financialsPeriods';
import { formatDecimal, formatPercent, formatUsd, formatCompactUsd, formatSharesCell } from '../utils/formatters';
import { analyticsChartOptions, scrollChartLayout } from '../utils/chartTheme';
import { computeTrendPair } from '../utils/researchCalculations';
import {
  buildHistoricalStats,
  describeHeat,
  getMetricBackground,
  precomputeRowHeatStyles,
} from '../utils/scoringColors';
import './research.css';

const FINANCIALS_GROUPS = RESEARCH_METRIC_GROUPS.filter((group) => group.id !== 'scores');
const COLOR_MODE = 'historical';
const GRID_HEAT_TOOLTIP_PROPS = { placement: 'top-start', floating: true };

const STATEMENT_TABS = [
  { label: 'Income Statement', value: 'income', groupId: 'income' },
  { label: 'Balance Sheet', value: 'balanceSheet', groupId: 'balance' },
  { label: 'Cash Flow', value: 'cashFlow', groupId: 'cashflow' },
  { label: 'Ratios & Margins', value: 'ratios', groupId: 'ratios' },
];

const reportOptions = [
  { label: 'As Reported', value: 'AR' },
  { label: 'Most Recent', value: 'MR' },
];

const periodOptions = [
  { label: 'Annual', value: 'annual' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'TTM', value: 'ttm' },
];

const QUICK_RANGES = [
  { label: '1Y', value: 1 },
  { label: '3Y', value: 3 },
  { label: '5Y', value: 5 },
  { label: 'Max', value: 'all' },
];

const DEFAULT_CHART_KEYS = ['revenue', 'gp', 'opinc', 'netinc'];
const FINANCIAL_TREND_COLORS = ['#6ecf97', '#5b9cf5', '#f5a623', '#e87882', '#c084fc', '#56d9c9'];

function formatCellValue(value, format, { compact = false } = {}) {
  if (value == null || value === '') return '-';
  switch (format) {
    case 'usd':
      return compact ? formatCompactUsd(value) : formatUsd(value, Math.abs(Number(value)) >= 100 ? 0 : 2);
    case 'percent':
      return formatPercent(typeof value === 'number' && Math.abs(value) <= 1 ? value * 100 : value, 2);
    case 'integer':
      return Number.isFinite(Number(value)) ? String(Math.round(Number(value))) : '-';
    case 'shares':
      return formatSharesCell(value, { compact });
    case 'decimal':
      return formatDecimal(value, 2);
    default:
      return String(value);
  }
}

function rawMetricValue(period, metric, source = 'fundamentals') {
  if (source === 'metrics') return period.metrics?.[metric.key] ?? null;
  const fundamentals = period.fundamentals || {};
  if (fundamentals[metric.key] != null) return fundamentals[metric.key];
  if (Array.isArray(metric.alt)) {
    for (const altKey of metric.alt) {
      if (fundamentals[altKey] != null) return fundamentals[altKey];
    }
  }
  return null;
}

function metricRowHasValues(row, periodCount) {
  for (let idx = 0; idx < periodCount; idx += 1) {
    if (row[`p${idx}`] != null) return true;
  }
  return false;
}

function findMetricDef(key) {
  for (const group of FINANCIALS_GROUPS) {
    const metric = group.metrics.find((item) => item.key === key);
    if (metric) {
      return { metric, source: group.source || 'fundamentals' };
    }
  }
  return null;
}

function metricLabel(key) {
  return findMetricDef(key)?.metric?.label || key;
}

function compactAxisLabel(val) {
  if (typeof val !== 'number' || Number.isNaN(val)) return '';
  const absVal = Math.abs(val);
  if (absVal >= 1e12) return `${(val / 1e12).toPrecision(3)}T`;
  if (absVal >= 1e9) return `${(val / 1e9).toPrecision(3)}B`;
  if (absVal >= 1e6) return `${(val / 1e6).toPrecision(3)}M`;
  if (absVal >= 1e3) return `${(val / 1e3).toPrecision(3)}K`;
  return String(val);
}

function buildDimension(report, period) {
  const reportCode = report || 'AR';
  let periodCode = 'Y';
  if (period === 'quarterly') periodCode = 'Q';
  else if (period === 'ttm') periodCode = 'T';
  return `${reportCode}${periodCode}`;
}

function countAnnualPeriods(periods = []) {
  return periods.filter((period) => {
    const dim = (period.dimension || '').toUpperCase();
    return dim === 'ARY' || dim === 'MRY';
  }).length;
}

function toggleCollapsiblePanel(event, setOpen) {
  if (event.target.closest('button, a, input, select, textarea, label, [role="menu"], [role="menuitem"]')) {
    return;
  }
  if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
  if (event.type === 'keydown') event.preventDefault();
  setOpen((open) => !open);
}

const FinancialsPage = () => {
  const { ticker } = useParams();
  const { showToast } = useToast();
  const [periodSeries, setPeriodSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('annual');
  const [years, setYears] = useState(5);
  const [report, setReport] = useState('AR');
  const [activeType, setActiveType] = useState('all');
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [chartMode, setChartMode] = useState('trend');
  const [selectedMetrics, setSelectedMetrics] = useState(DEFAULT_CHART_KEYS);
  const [chartsPanelOpen, setChartsPanelOpen] = useState(true);
  const [statementsPanelOpen, setStatementsPanelOpen] = useState(true);
  const [registryReady, setRegistryReady] = useState(isRegistryLoaded());

  useEffect(() => {
    loadMetricRegistry().then(() => setRegistryReady(true));
  }, []);

  const groupsToShow = useMemo(() => {
    if (activeType === 'all') return FINANCIALS_GROUPS;
    const groupId = STATEMENT_TABS.find((tab) => tab.value === activeType)?.groupId;
    const group = FINANCIALS_GROUPS.find((item) => item.id === groupId);
    return group ? [group] : [];
  }, [activeType]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function fetchFinancials() {
      try {
        const tickersStr = String(ticker || '').toUpperCase();
        const gteDate = buildGteDate(years);
        const dimensionParam = buildDimension(report, period);
        const url = `${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&dimension=${dimensionParam}${gteDate ? `&gte=${gteDate}` : ''}`;
        const res = await axios.get(url);
        const series = res.data?.periodSeries?.[tickersStr]
          || res.data?.periodSeries?.[ticker]
          || [];
        if (!cancelled) setPeriodSeries(Array.isArray(series) ? series : []);
      } catch {
        if (!cancelled) setPeriodSeries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFinancials();
    return () => { cancelled = true; };
  }, [ticker, period, years, report]);

  const columnPeriods = useMemo(
    () => sliceColumnPeriods(periodSeries, { years, period }),
    [periodSeries, years, period],
  );

  const chartPeriods = useMemo(
    () => [...columnPeriods].reverse(),
    [columnPeriods],
  );

  const tabRows = useMemo(() => {
    if (!columnPeriods.length || !groupsToShow.length) return [];
    const rows = [];
    groupsToShow.forEach((group) => {
      if (activeType === 'all') {
        rows.push({
          id: `group-${group.id}`,
          _isGroupHeader: true,
          _groupLabel: group.label,
        });
      }
      const source = group.source || 'fundamentals';
      group.metrics.forEach((metric) => {
        const columnValues = columnPeriods.map((periodRow) => rawMetricValue(periodRow, metric, source));
        const { yoy, cagr } = computeTrendPair(columnValues);
        const row = {
          id: `${group.id}-${metric.key}`,
          metric: metric.label,
          metricKey: metric.key,
          key: metric.key,
          format: metric.format,
          scoreCategory: metric.scoreCategory,
          yoy,
          cagr,
        };
        columnPeriods.forEach((periodRow, idx) => {
          row[`p${idx}`] = columnValues[idx];
        });
        row._historicalStats = buildHistoricalStats(columnValues);
        row._heatStyles = precomputeRowHeatStyles(row, columnPeriods.length, {
          mode: COLOR_MODE,
        });
        if (columnPeriods.length >= 2) {
          row._heatStyles.yoy = getMetricBackground('yoy', yoy, { mode: COLOR_MODE, format: 'percent' });
        }
        if (columnPeriods.length >= 3) {
          row._heatStyles.cagr = getMetricBackground('cagr', cagr, { mode: COLOR_MODE, format: 'percent' });
        }
        if (CORE_ALWAYS_SHOW_METRIC_KEYS.has(metric.key)) {
          rows.push(row);
          return;
        }
        if (!hideEmptyRows || metricRowHasValues(row, columnPeriods.length)) {
          rows.push(row);
        }
      });
    });
    return rows;
  }, [groupsToShow, columnPeriods, hideEmptyRows, activeType, registryReady]);

  const columns = useMemo(() => {
    const fmt = (value, format) => formatCellValue(value, format, { compact: true });
    const cols = [
      {
        id: 'metric',
        header: 'Metric',
        accessorKey: 'metric',
        cell: ({ row }) => {
          if (row.original._isGroupHeader) {
            return <strong>{row.original._groupLabel}</strong>;
          }
          const selected = selectedMetrics.includes(row.original.key);
          return (
            <span className={selected ? 'financials-metric-selected' : undefined}>
              <MetricTooltipLabel
                metricKey={row.original.metricKey || row.original.key}
                label={row.original.metric}
              />
            </span>
          );
        },
        enableSorting: false,
        size: 180,
      },
      ...columnPeriods.map((periodRow, idx) => ({
        id: `p${idx}`,
        header: (periodRow.periodEnd || '').slice(0, 10) || `P${idx + 1}`,
        accessorKey: `p${idx}`,
        meta: { numeric: true },
        cellStyle: ({ row }) => {
          if (row.original?._isGroupHeader) return { whiteSpace: 'nowrap' };
          return { whiteSpace: 'nowrap', ...(row.original._heatStyles?.[`p${idx}`] || {}) };
        },
        cell: ({ row, getValue }) => {
          if (row.original._isGroupHeader) return null;
          const val = getValue();
          const tip = row.original._heatStyles?.[`p${idx}Title`];
          const formatted = fmt(val, row.original.format);
          if (!tip) return <span>{formatted}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />} {...GRID_HEAT_TOOLTIP_PROPS}>
              <span>{formatted}</span>
            </StTooltip>
          );
        },
        size: 120,
      })),
    ];
    if (columnPeriods.length >= 2) {
      cols.push({
        id: 'yoy',
        header: 'YoY %',
        accessorKey: 'yoy',
        meta: { numeric: true },
        cellStyle: ({ row }) => ({
          whiteSpace: 'nowrap',
          ...(row.original?._isGroupHeader ? {} : row.original._heatStyles?.yoy || {}),
        }),
        cell: ({ row, getValue }) => {
          if (row.original._isGroupHeader) return null;
          const val = getValue();
          const tip = val != null
            ? formatMetricCellTooltip('yoy', describeHeat('yoy', val, { mode: COLOR_MODE, format: 'percent' }))
            : null;
          const body = val == null ? '-' : formatPercent(val, 1);
          if (!tip) return <span>{body}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />} {...GRID_HEAT_TOOLTIP_PROPS}>
              <span>{body}</span>
            </StTooltip>
          );
        },
        size: 90,
      });
    }
    if (columnPeriods.length >= 3) {
      cols.push({
        id: 'cagr',
        header: 'CAGR',
        accessorKey: 'cagr',
        meta: { numeric: true },
        cellStyle: ({ row }) => ({
          whiteSpace: 'nowrap',
          ...(row.original?._isGroupHeader ? {} : row.original._heatStyles?.cagr || {}),
        }),
        cell: ({ row, getValue }) => {
          if (row.original._isGroupHeader) return null;
          const val = getValue();
          const tip = val != null
            ? formatMetricCellTooltip('cagr', describeHeat('cagr', val, { mode: COLOR_MODE, format: 'percent' }))
            : null;
          const body = val == null ? '-' : formatPercent(val, 1);
          if (!tip) return <span>{body}</span>;
          return (
            <StTooltip tip={<StTooltipText text={tip} />} {...GRID_HEAT_TOOLTIP_PROPS}>
              <span>{body}</span>
            </StTooltip>
          );
        },
        size: 90,
      });
    }
    return cols;
  }, [columnPeriods, selectedMetrics]);

  const allColumnIds = useMemo(
    () => columns.map((col) => col.accessorKey ?? col.id).filter((id) => id && id !== 'select'),
    [columns],
  );
  const [visibleColumns, setVisibleColumns] = useState([]);
  useEffect(() => {
    setVisibleColumns((prev) => {
      if (!prev.length) return allColumnIds;
      const kept = prev.filter((id) => allColumnIds.includes(id));
      const added = allColumnIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [allColumnIds]);
  const effectiveVisibleColumns = visibleColumns.length ? visibleColumns : allColumnIds;

  const toggleColumnVisibility = useCallback((colKey) => {
    setVisibleColumns((prev) => {
      const base = prev.length ? prev : allColumnIds;
      return base.includes(colKey) ? base.filter((k) => k !== colKey) : [...base, colKey];
    });
  }, [allColumnIds]);

  const resetColumnVisibility = useCallback(() => {
    setVisibleColumns(allColumnIds);
  }, [allColumnIds]);

  const chartCategories = useMemo(
    () => chartPeriods.map((p) => (p.periodEnd || '').slice(0, 10)),
    [chartPeriods],
  );

  const chartSeries = useMemo(() => (
    selectedMetrics.map((key) => {
      const def = findMetricDef(key);
      const seriesData = chartPeriods.map((periodRow) => {
        if (!def) return null;
        const val = rawMetricValue(periodRow, def.metric, def.source);
        return typeof val === 'number' ? val : null;
      });
      return {
        name: def?.metric?.label || key,
        data: seriesData,
      };
    })
  ), [selectedMetrics, chartPeriods]);

  const chartRowLayout = useMemo(() => {
    const main = scrollChartLayout(chartCategories.length, { variant: 'currency' });
    const margin = scrollChartLayout(countAnnualPeriods(periodSeries), { variant: 'percent', scale: 1.15 });
    const height = Math.max(main.height, margin.height);
    return {
      mainWidth: main.width,
      marginWidth: margin.width,
      height,
    };
  }, [chartCategories.length, periodSeries]);

  const chartYearLabels = useMemo(
    () => chartCategories.map((label) => label.slice(0, 4)),
    [chartCategories],
  );

  const chartOptions = useMemo(() => {
    const isTrend = chartMode === 'trend';
    return analyticsChartOptions({
      chart: {
        type: isTrend ? 'line' : 'bar',
        stacked: false,
        toolbar: { show: false },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
      },
      ...(isTrend ? { stroke: { curve: 'smooth', width: 2 } } : {
        plotOptions: {
          bar: {
            columnWidth: '70%',
            groupPadding: 0.08,
          },
        },
      }),
      dataLabels: { enabled: false },
      colors: FINANCIAL_TREND_COLORS,
      xaxis: {
        categories: chartYearLabels,
        labels: {
          rotate: chartYearLabels.length >= 8 ? 0 : -45,
          style: { fontSize: '9px' },
          offsetY: 0,
        },
      },
      yaxis: {
        labels: {
          formatter: (val) => compactAxisLabel(val),
          style: { fontSize: '9px' },
        },
        title: { text: undefined },
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: {
          formatter: (value, { dataPointIndex }) => chartCategories[dataPointIndex] || value,
        },
        y: { formatter: (val) => compactAxisLabel(val) || '-' },
      },
    });
  }, [chartMode, chartCategories, chartYearLabels]);

  const toggleChartMetric = useCallback((key) => {
    if (!key) return;
    setSelectedMetrics((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  }, []);

  const onMetricRowClick = useCallback((row) => {
    const original = row?.original ?? row;
    if (original?._isGroupHeader || !original?.key) return;
    toggleChartMetric(original.key);
  }, [toggleChartMetric]);

  const handleAddToPortfolio = () => {
    if (!ticker) return;
    const notif = addToPortfolioWithNotification(ticker);
    showToast(notif.message, notif.type);
  };

  const gridTitle = activeType === 'all'
    ? 'All Statements'
    : STATEMENT_TABS.find((s) => s.value === activeType)?.label;

  return (
    <div className="st-page">
      <TickerSubnav ticker={ticker} />
      <div className="financials-toolbar mb-1">
        <div className="financials-toolbar-title">
          <h1 className="h3 mb-0">{ticker} Financials</h1>
          <button
            type="button"
            className={`btn btn-sm ${isInPortfolio(ticker) ? 'btn-outline-secondary' : 'btn-success'}`}
            onClick={handleAddToPortfolio}
          >
            {isInPortfolio(ticker) ? 'In Portfolio' : 'Add to Portfolio'}
          </button>
        </div>
        <div className="financials-toolbar-filters">
          <div className="financials-filter-group">
            <span className="st-label">Report</span>
            <div className="st-segment" role="group" aria-label="Financial report basis">
              {reportOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`st-segment-btn ${report === opt.value ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
                  onClick={() => setReport(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="financials-filter-group">
            <span className="st-label">Period</span>
            <div className="st-segment" role="group" aria-label="Financial period">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`st-segment-btn ${period === opt.value ? 'st-segment-btn-active' : 'st-segment-btn-idle'}`}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="financials-filter-group">
            <label htmlFor="yearsSelect" className="form-label">Range</label>
            <div className="d-flex gap-1 flex-wrap align-items-center">
              <select
                id="yearsSelect"
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={years}
                onChange={(e) => setYears(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                {YEAR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt === 'all' ? 'All Years' : `Last ${opt} Years`}</option>
                ))}
              </select>
              <div className="btn-group btn-group-sm" role="group" aria-label="Quick range">
                {QUICK_RANGES.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`btn ${years === opt.value ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setYears(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="financials-filter-group">
            <label className="form-label d-block">&nbsp;</label>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="hideEmptyRows"
                checked={hideEmptyRows}
                onChange={(e) => setHideEmptyRows(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="hideEmptyRows">Hide empty rows</label>
            </div>
          </div>
          <div className="financials-filter-group">
            <label className="form-label d-block">Statement</label>
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${activeType === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setActiveType('all')}
              >
                All
              </button>
              {STATEMENT_TABS.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`btn btn-sm ${activeType === type.value ? 'btn-secondary' : 'btn-outline-secondary'}`}
                  onClick={() => setActiveType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section
        className={`st-details financials-panel financials-charts-panel${chartsPanelOpen ? ' is-open' : ''}`}
        aria-expanded={chartsPanelOpen}
      >
        <div
          className="st-details-summary financials-charts-panel-summary"
          tabIndex={0}
          onClick={(event) => toggleCollapsiblePanel(event, setChartsPanelOpen)}
          onKeyDown={(event) => toggleCollapsiblePanel(event, setChartsPanelOpen)}
        >
          <span className="financials-charts-panel-title">Charts</span>
          <div className="financials-charts-panel-header-controls">
            <div className="btn-group btn-group-sm" role="group" aria-label="Chart mode">
              <button
                type="button"
                className={`btn ${chartMode === 'trend' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setChartMode('trend')}
              >
                Trend
              </button>
              <button
                type="button"
                className={`btn ${chartMode === 'composition' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setChartMode('composition')}
              >
                Composition
              </button>
            </div>
            {selectedMetrics.length > 0 && (
              <div className="financials-chart-filters">
                <span className="financials-chart-filters-label">Chart series</span>
                <div className="financials-chart-filter-actions">
                  {selectedMetrics.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="st-btn-active financials-metric-filter-btn"
                      onClick={() => toggleChartMetric(key)}
                      aria-label={`Remove ${metricLabel(key)} from chart`}
                      title={`Remove ${metricLabel(key)}`}
                    >
                      {metricLabel(key)}
                      <span className="financials-metric-filter-dismiss" aria-hidden="true">×</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="st-btn-ghost"
                    onClick={() => setSelectedMetrics([])}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
          {selectedMetrics.length > 0 && (
            <span className="financials-panel-summary-meta">
              {selectedMetrics.length} series selected
            </span>
          )}
        </div>
        <div
          className="st-panel-body financials-panel-body financials-charts-panel-body"
          hidden={!chartsPanelOpen}
        >
          <div className="financials-charts-grid">
            <section className="financials-chart-section">
              <div className="financials-chart-section-title">Key Financial Trends</div>
              {!loading && chartSeries.length > 0 && chartCategories.length > 0 ? (
                <div className="financials-chart-scroll">
                  <div
                    className="financials-chart-scroll-inner"
                    style={{ width: chartRowLayout.mainWidth }}
                  >
                    <div className="research-chart-plot">
                      <ApexCharts
                        options={chartOptions}
                        series={chartSeries}
                        type={chartMode === 'trend' ? 'line' : 'bar'}
                        height={chartRowLayout.height}
                        width={chartRowLayout.mainWidth}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted small">
                  {loading ? 'Loading chart data…' : 'Click grid rows to add metrics to this chart.'}
                </div>
              )}
            </section>
            <section className="financials-chart-section financials-chart-section-divider">
              <div className="financials-chart-section-title">Margin Trends</div>
              <div className="financials-chart-scroll">
                <div
                  className="financials-chart-scroll-inner"
                  style={{ width: chartRowLayout.marginWidth }}
                >
                  <MarginTrendChart
                    periods={periodSeries}
                    width={chartRowLayout.marginWidth}
                    height={chartRowLayout.height}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section
        className={`st-details financials-panel${statementsPanelOpen ? ' is-open' : ''}`}
        aria-expanded={statementsPanelOpen}
      >
        <div
          className="st-details-summary financials-panel-summary"
          tabIndex={0}
          onClick={(event) => toggleCollapsiblePanel(event, setStatementsPanelOpen)}
          onKeyDown={(event) => toggleCollapsiblePanel(event, setStatementsPanelOpen)}
        >
          <span className="financials-panel-summary-leading">
            <DataGridColumnMenu
              columns={columns}
              effectiveVisibleColumns={effectiveVisibleColumns}
              onToggleColumn={toggleColumnVisibility}
              onResetColumns={resetColumnVisibility}
              onShowAllColumns={resetColumnVisibility}
              resetColumnsTitle="Reset visible columns to the default set for this view"
            />
          </span>
          <span>{gridTitle}</span>
        </div>
        <div className="st-panel-body financials-panel-body" hidden={!statementsPanelOpen}>
          {loading ? (
            <div>Loading...</div>
          ) : tabRows.length === 0 ? (
            <div>No data.</div>
          ) : (
            <DataGrid
              data={tabRows}
              columns={columns}
              compact
              tableExtraClassName="portfolio-grid-table research-grid-hscroll"
              enableRowSelection={false}
              enableSorting={false}
              enableGlobalFilter={false}
              showToolbar={false}
              useSharedColumnState
              columnVisibility={effectiveVisibleColumns}
              onColumnVisibilityChange={setVisibleColumns}
              onRowClick={onMetricRowClick}
              getRowId={(row) => row.key || row.id}
            />
          )}
          <div className="form-text mt-2">
            Tip: Click any metric row to add or remove it from the financial trends chart. Colors compare each value to the ticker&apos;s own history (same as Research).
          </div>
        </div>
      </section>
    </div>
  );
};

export default FinancialsPage;
