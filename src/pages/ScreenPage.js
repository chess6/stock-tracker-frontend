import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import DataGrid from '../components/DataGrid';
import API_ENDPOINTS from '../apiConfig';
import {
  DEFAULT_SCREEN_PRESET_ID,
  SCREEN_PRESETS,
  SCREEN_UNIVERSE_OPTIONS,
  formatScreenFilter,
  getScreenPreset,
} from '../config/screenPresets';
import { formatDecimal, formatPercent, formatUsd } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import ResearchPinnedStrip from '../components/research/ResearchPinnedStrip';
import useResearchKeyboard from '../hooks/useResearchKeyboard';
import { clampTickerIndex } from '../utils/researchKeyboard';
import {
  hydratePinnedTickersFromApi,
  isPinnedTicker,
  loadPinnedTickers,
  togglePinnedTicker,
} from '../utils/researchPinned';
import { commitResearchScroll } from '../utils/researchScrollState';
import { saveScreenScrollBeforeLeave } from '../utils/researchNavigation';
import './research.css';

function formatEvidenceValue(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  if (Math.abs(num) >= 1_000_000) return formatUsd(num, 0);
  if (Math.abs(num) <= 1 && Math.abs(num) > 0) return formatPercent(num * 100);
  return formatDecimal(num, 2);
}

function buildResultRows(results = []) {
  return results.map((row, index) => ({
    id: row.ticker || index,
    ticker: row.ticker,
    companyName: row.companyName,
    sector: row.sector,
    price: row.price,
    pb: row.metrics?.pb,
    pe: row.metrics?.pe,
    survivability: row.scores?.survivability,
    altmanZ: row.scores?.altmanZ,
    buy6m: row.insider?.buy6m,
    filtersPassed: row.filtersPassed,
    filtersTotal: row.filtersTotal,
    filterEvidence: row.filterEvidence || [],
  }));
}

export default function ScreenPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetId = searchParams.get('preset') || DEFAULT_SCREEN_PRESET_ID;
  const preset = useMemo(() => getScreenPreset(presetId), [presetId]);
  const [universe, setUniverse] = useState(preset.spec.universe || 'sp500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);
  const [pinnedTickers, setPinnedTickers] = useState(() => loadPinnedTickers());
  const pinsLocallyModifiedRef = useRef(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    hydratePinnedTickersFromApi(() => !pinsLocallyModifiedRef.current).then((tickers) => {
      if (cancelled || pinsLocallyModifiedRef.current) return;
      setPinnedTickers(tickers);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => buildResultRows(payload?.results), [payload?.results]);
  const screenTickers = useMemo(
    () => rows.map((row) => row.ticker).filter(Boolean),
    [rows],
  );
  const activeRowId = rows[clampTickerIndex(selectedRowIndex, rows.length)]?.id;

  useEffect(() => {
    setSelectedRowIndex((idx) => clampTickerIndex(idx, rows.length));
  }, [rows]);

  const handleTogglePin = useCallback((ticker) => {
    pinsLocallyModifiedRef.current = true;
    setPinnedTickers((prev) => {
      const wasPinned = isPinnedTicker(ticker, prev);
      const next = togglePinnedTicker(ticker, prev);
      showToast(wasPinned ? `Unpinned ${ticker}` : `Pinned ${ticker}`, 'success', 2500);
      return next;
    });
  }, [showToast]);

  const handleOpenTicker = useCallback((ticker) => {
    commitResearchScroll('research-screen');
    navigate(`/research/${ticker}`);
  }, [navigate]);

  useResearchKeyboard({
    enabled: rows.length > 0,
    tickers: screenTickers,
    selectedIndex: selectedRowIndex,
    onSelectedIndexChange: setSelectedRowIndex,
    onOpenTicker: handleOpenTicker,
    onTogglePin: handleTogglePin,
  });

  const columns = useMemo(() => [
    {
      id: 'ticker',
      accessorKey: 'ticker',
      header: 'Ticker',
      cell: ({ row }) => (
        <Link
          to={`/research/${row.original.ticker}`}
          className="research-ticker-link"
          onClick={saveScreenScrollBeforeLeave}
        >
          {row.original.ticker}
        </Link>
      ),
    },
    { id: 'companyName', accessorKey: 'companyName', header: 'Company' },
    { id: 'sector', accessorKey: 'sector', header: 'Sector' },
    {
      id: 'price',
      accessorKey: 'price',
      header: 'Price',
      cell: ({ getValue }) => formatUsd(getValue()),
    },
    {
      id: 'pb',
      accessorKey: 'pb',
      header: 'P/B',
      cell: ({ getValue }) => formatDecimal(getValue(), 2),
    },
    {
      id: 'pe',
      accessorKey: 'pe',
      header: 'P/E',
      cell: ({ getValue }) => formatDecimal(getValue(), 1),
    },
    {
      id: 'survivability',
      accessorKey: 'survivability',
      header: 'Surv.',
      cell: ({ getValue }) => formatDecimal(getValue(), 0),
    },
    {
      id: 'altmanZ',
      accessorKey: 'altmanZ',
      header: 'Altman Z',
      cell: ({ getValue }) => formatDecimal(getValue(), 2),
    },
    {
      id: 'buy6m',
      accessorKey: 'buy6m',
      header: 'Buy 6M',
      cell: ({ getValue }) => formatUsd(getValue(), 0),
    },
    {
      id: 'filtersPassed',
      accessorKey: 'filtersPassed',
      header: 'Filters',
      cell: ({ row }) => `${row.original.filtersPassed}/${row.original.filtersTotal}`,
    },
    {
      id: 'evidence',
      header: 'Evidence',
      enableSorting: false,
      cell: ({ row }) => (
        <ul className="screen-evidence-list mb-0">
          {(row.original.filterEvidence || []).map((item) => (
            <li key={`${item.metric}-${item.op}`} className={item.passed ? 'text-success' : 'text-danger'}>
              {formatScreenFilter(item)}
              {' '}
              ({formatEvidenceValue(item.actual)})
            </li>
          ))}
        </ul>
      ),
    },
  ], []);

  const handlePresetChange = (nextId) => {
    const nextPreset = getScreenPreset(nextId);
    setUniverse(nextPreset.spec.universe || 'sp500');
    setSearchParams({ preset: nextId }, { replace: true });
  };

  const runScreen = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const spec = {
        ...preset.spec,
        universe,
      };
      const res = await axios.post(API_ENDPOINTS.RESEARCH_SCREEN, spec);
      setPayload(res.data || null);
    } catch (err) {
      const message = err?.response?.data?.error || 'Failed to run screen.';
      setError(message);
      setPayload(null);
      showToast(message, 'danger', 5000);
    } finally {
      setLoading(false);
    }
  }, [preset.spec, showToast, universe]);

  const meta = payload?.meta;

  return (
    <div className="st-page st-page--full research-page screen-page">
      <div className="research-toolbar d-flex flex-wrap align-items-end gap-3 mb-3">
        <div>
          <label className="form-label small text-muted mb-1" htmlFor="screen-preset">Preset</label>
          <select
            id="screen-preset"
            className="form-select form-select-sm"
            value={preset.id}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {SCREEN_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label small text-muted mb-1" htmlFor="screen-universe">Universe</label>
          <select
            id="screen-universe"
            className="form-select form-select-sm"
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
          >
            {SCREEN_UNIVERSE_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={runScreen}
          disabled={loading}
        >
          {loading ? 'Running…' : 'Run screen'}
        </button>
      </div>

      <div className="st-panel mb-3">
        <div className="st-panel-header">{preset.label}</div>
        <div className="st-panel-body">
          <p className="small text-muted mb-2">{preset.description}</p>
          <ul className="screen-filter-spec mb-0">
            {preset.spec.filters.map((filter) => (
              <li key={`${filter.metric}-${filter.op}-${filter.value}`}>
                <code>{formatScreenFilter(filter)}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ResearchPinnedStrip
        pinnedTickers={pinnedTickers}
        selectedTicker={screenTickers[selectedRowIndex]}
        onUnpin={handleTogglePin}
        onSelect={(ticker) => {
          const idx = screenTickers.indexOf(ticker);
          if (idx >= 0) setSelectedRowIndex(idx);
          else handleOpenTicker(ticker);
        }}
      />

      {rows.length > 0 && (
        <div className="research-keyboard-hints small text-muted mb-2">
          <kbd>j</kbd> prev · <kbd>k</kbd> next row · <kbd>Enter</kbd> deep-dive · <kbd>p</kbd> pin
        </div>
      )}

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {meta && (
        <div className="small text-muted mb-2">
          Evaluated {meta.evaluated} · Matched {meta.matched} · Showing {meta.returned}
          {meta.universe ? ` · Universe ${meta.universe}` : ''}
        </div>
      )}

      <DataGrid
        data={rows}
        columns={columns}
        enableRowSelection={false}
        stickyColumnIds={['ticker']}
        compact
        activeRowId={activeRowId}
        scrollPersistenceKey="research-screen"
        defaultVisibleColumns={['ticker', 'companyName', 'sector', 'pb', 'pe', 'survivability', 'filtersPassed', 'evidence']}
        maxHeight="70vh"
      />
    </div>
  );
}
