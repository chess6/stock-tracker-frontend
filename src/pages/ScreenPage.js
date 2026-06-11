import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import DataGrid from '../components/DataGrid';
import API_ENDPOINTS from '../apiConfig';
import {
  DEFAULT_SCREEN_PRESET_ID,
  SCREEN_PRESETS,
  SCREEN_UNIVERSE_OPTIONS,
  buildScreenRequestSpec,
  formatScreenFilter,
  getScreenPreset,
  groupsFromSpec,
} from '../config/screenPresets';
import ScreenFilterBuilder from '../components/research/ScreenFilterBuilder';
import { formatDecimal, formatPercent, formatUsd } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import ResearchPinnedStrip from '../components/research/ResearchPinnedStrip';
import RankValidationPanel from '../components/research/RankValidationPanel';
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
import {
  clonePreset,
  deleteSavedScreen,
  getSavedScreens,
  saveScreen,
} from '../utils/savedScreens';
import { COMPOSITE_PRESETS, DEFAULT_COMPOSITE_ID, RANK_DELTA_LABEL } from '../config/compositePresets';
import { fetchCompositeRank } from '../utils/compositeRankApi';
import {
  formatCompositeScore,
  formatRankDelta,
  rankDeltaClassName,
  rankResultsByTicker,
  sortFactorsByContribution,
} from '../utils/compositeRank';
import './research.css';

const EVIDENCE_USD_METRICS = new Set(['buy6m', 'buy3m', 'market_cap']);
const EVIDENCE_PERCENT_DECIMAL_METRICS = new Set([
  'fcf_margin',
  'gross_margin',
  'roe',
  'fcf_yield',
  'dilution_rate',
]);
const EVIDENCE_INTEGER_METRICS = new Set([
  'cluster_count',
  'piotroski',
  'piotroski_f',
  'survivability',
  'survivability_score',
]);

function formatEvidenceValue(metric, value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  const key = String(metric || '').trim().toLowerCase();

  if (EVIDENCE_USD_METRICS.has(key)) {
    return formatUsd(num, 0);
  }
  if (EVIDENCE_INTEGER_METRICS.has(key)) {
    return formatDecimal(num, 0);
  }
  if (EVIDENCE_PERCENT_DECIMAL_METRICS.has(key)) {
    return formatPercent(num * 100);
  }
  return formatDecimal(num, 2);
}

function buildResultRows(results = [], rankByTicker = {}) {
  return results.map((row, index) => {
    const rankRow = rankByTicker[row.ticker];
    return {
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
      compositeScore: rankRow?.compositeScore,
      compositeRank: rankRow?.rank,
      rankDelta: rankRow?.rank_delta,
      topFactor: sortFactorsByContribution(rankRow?.factors || [])[0]?.key,
      filtersPassed: row.filtersPassed,
      filtersTotal: row.filtersTotal,
      filterEvidence: row.filterEvidence || [],
    };
  });
}

export default function ScreenPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetId = searchParams.get('preset') || DEFAULT_SCREEN_PRESET_ID;
  const preset = useMemo(() => getScreenPreset(presetId), [presetId]);
  const [universe, setUniverse] = useState(preset.spec.universe || 'sp500');
  const [filterGroups, setFilterGroups] = useState(() => groupsFromSpec(preset.spec));
  const [screenSort, setScreenSort] = useState(preset.spec.sort || null);
  const [screenLimit, setScreenLimit] = useState(preset.spec.limit ?? 100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);
  const [compositeId, setCompositeId] = useState(DEFAULT_COMPOSITE_ID);
  const [rankByTicker, setRankByTicker] = useState({});
  const [rankLoading, setRankLoading] = useState(false);
  const [pinnedTickers, setPinnedTickers] = useState(() => loadPinnedTickers());
  const [savedScreens, setSavedScreens] = useState(() => getSavedScreens());
  const [activeSavedScreenId, setActiveSavedScreenId] = useState('');
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

  const rows = useMemo(
    () => buildResultRows(payload?.results, rankByTicker),
    [payload?.results, rankByTicker],
  );
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

  const rankCellLoading = (value) => rankLoading && value == null && (payload?.results?.length > 0);

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
      id: 'compositeScore',
      accessorKey: 'compositeScore',
      header: 'Composite',
      cell: ({ row }) => {
        const score = row.original.compositeScore;
        if (rankCellLoading(score)) {
          return (
            <span className="text-muted" title="Loading composite rank…">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            </span>
          );
        }
        if (score == null) return '—';
        return (
          <span title={row.original.topFactor ? `Top factor: ${row.original.topFactor}` : undefined}>
            {formatCompositeScore(score)}
            {row.original.compositeRank != null ? ` (#${row.original.compositeRank})` : ''}
          </span>
        );
      },
    },
    {
      id: 'rankDelta',
      accessorKey: 'rankDelta',
      header: RANK_DELTA_LABEL,
      cell: ({ row }) => {
        const delta = row.original.rankDelta;
        if (rankCellLoading(delta)) {
          return (
            <span className="text-muted" title="Loading rank movement…">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            </span>
          );
        }
        if (delta == null) return '—';
        return (
          <span
            className={rankDeltaClassName(delta)}
            title="Change in universe rank vs snapshot from 7 days ago (positive = improved)"
          >
            {formatRankDelta(delta)}
          </span>
        );
      },
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
      size: 72,
      cell: ({ row }) => {
        const evidence = row.original.filterEvidence || [];
        if (!evidence.length) return '—';
        const passed = evidence.filter((item) => item.passed).length;
        return (
          <details className="screen-evidence-chip">
            <summary className={passed === evidence.length ? 'text-success' : 'text-warning'}>
              {passed}/{evidence.length}
            </summary>
            <ul className="screen-evidence-list mb-0">
              {evidence.map((item) => (
                <li key={`${item.metric}-${item.op}`} className={item.passed ? 'text-success' : 'text-danger'}>
                  {formatScreenFilter(item)}
                  {' '}
                  ({formatEvidenceValue(item.metric, item.actual)})
                </li>
              ))}
            </ul>
          </details>
        );
      },
    },
  ], [payload?.results?.length, rankLoading]);

  useEffect(() => {
    if (activeSavedScreenId) return;
    setUniverse(preset.spec.universe || 'sp500');
    setFilterGroups(groupsFromSpec(preset.spec));
    setScreenSort(preset.spec.sort || null);
    setScreenLimit(preset.spec.limit ?? 100);
  }, [preset, activeSavedScreenId]);

  const handleFilterGroupsChange = useCallback((nextGroups) => {
    setFilterGroups(nextGroups);
    setActiveSavedScreenId('');
  }, []);

  const handlePresetChange = (nextId) => {
    setActiveSavedScreenId('');
    setSearchParams({ preset: nextId }, { replace: true });
  };

  const handleLoadSavedScreen = (screenId) => {
    setActiveSavedScreenId(screenId);
    if (!screenId) return;
    const screen = savedScreens.find((item) => item.id === screenId);
    if (!screen) return;
    setUniverse(screen.universe || 'sp500');
    setFilterGroups(screen.filterGroups || []);
    setScreenSort(screen.sort || null);
    setScreenLimit(screen.limit ?? 100);
    if (screen.sourcePresetId) {
      setSearchParams({ preset: screen.sourcePresetId }, { replace: true });
    }
  };

  const handleClonePreset = () => {
    const cloned = clonePreset(preset);
    if (!cloned) return;
    setUniverse(cloned.universe);
    setFilterGroups(cloned.filterGroups);
    setScreenSort(cloned.sort || null);
    setScreenLimit(cloned.limit ?? 100);
    setActiveSavedScreenId('');
    showToast(`Cloned "${preset.label}" — edit filters and save.`, 'success', 3000);
  };

  const handleSaveScreen = () => {
    const defaultName = activeSavedScreenId
      ? savedScreens.find((item) => item.id === activeSavedScreenId)?.name
      : `${preset.label} (custom)`;
    const name = window.prompt('Name this screen:', defaultName || '');
    if (!name) return;
    try {
      const entry = saveScreen({
        name,
        universe,
        filterGroups,
        sort: screenSort,
        limit: screenLimit,
        sourcePresetId: preset.id,
      });
      const nextScreens = getSavedScreens();
      setSavedScreens(nextScreens);
      setActiveSavedScreenId(entry.id);
      showToast(`Saved screen "${entry.name}".`, 'success', 3000);
    } catch (err) {
      showToast(err.message || 'Could not save screen.', 'danger', 4000);
    }
  };

  const handleDeleteSavedScreen = () => {
    if (!activeSavedScreenId) return;
    const screen = savedScreens.find((item) => item.id === activeSavedScreenId);
    if (!screen) return;
    if (!window.confirm(`Delete saved screen "${screen.name}"?`)) return;
    deleteSavedScreen(activeSavedScreenId);
    setSavedScreens(getSavedScreens());
    setActiveSavedScreenId('');
    showToast(`Deleted "${screen.name}".`, 'success', 2500);
  };

  const loadRanksForTickers = useCallback(async (tickers, nextCompositeId) => {
    if (!tickers.length) {
      setRankByTicker({});
      setRankLoading(false);
      return;
    }
    setRankLoading(true);
    try {
      const rankPayload = await fetchCompositeRank({
        composite: nextCompositeId,
        tickers,
        limit: tickers.length,
      });
      setRankByTicker(rankResultsByTicker(rankPayload?.results || []));
    } catch {
      setRankByTicker({});
    } finally {
      setRankLoading(false);
    }
  }, []);

  const runScreen = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const spec = buildScreenRequestSpec({
        universe,
        filterGroups,
        sort: screenSort,
        limit: screenLimit,
      });
      const res = await axios.post(API_ENDPOINTS.RESEARCH_SCREEN, spec);
      setPayload(res.data || null);
    } catch (err) {
      const message = err?.response?.data?.error || 'Failed to run screen.';
      setError(message);
      setPayload(null);
      setRankByTicker({});
      setRankLoading(false);
      showToast(message, 'danger', 5000);
    } finally {
      setLoading(false);
    }
  }, [filterGroups, screenLimit, screenSort, showToast, universe]);

  useEffect(() => {
    const tickers = (payload?.results || []).map((row) => row.ticker).filter(Boolean);
    if (!tickers.length) return undefined;
    let cancelled = false;
    loadRanksForTickers(tickers, compositeId).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  }, [compositeId, loadRanksForTickers, payload?.results]);

  const meta = payload?.meta;

  return (
    <div className="st-page st-page--full research-page screen-page">
      <div className="st-toolbar mb-2">
        <div className="st-toolbar-field">
          <label className="st-label" htmlFor="screen-preset">Preset</label>
          <select
            id="screen-preset"
            className="st-select"
            value={preset.id}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {SCREEN_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="st-toolbar-field">
          <label className="st-label" htmlFor="screen-composite">Composite</label>
          <select
            id="screen-composite"
            className="st-select"
            value={compositeId}
            onChange={(e) => setCompositeId(e.target.value)}
          >
            {COMPOSITE_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="st-toolbar-field">
          <label className="st-label" htmlFor="screen-universe">Universe</label>
          <select
            id="screen-universe"
            className="st-select"
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
          >
            {SCREEN_UNIVERSE_OPTIONS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </div>
        <div className="st-toolbar-field">
          <label className="st-label" htmlFor="screen-saved">Saved</label>
          <select
            id="screen-saved"
            className="st-select"
            value={activeSavedScreenId}
            onChange={(e) => handleLoadSavedScreen(e.target.value)}
          >
            <option value="">— Built-in preset —</option>
            {savedScreens.map((screen) => (
              <option key={screen.id} value={screen.id}>{screen.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="st-btn-primary"
          onClick={runScreen}
          disabled={loading}
        >
          {loading ? 'Running…' : 'Run screen'}
        </button>
        <button
          type="button"
          className="st-btn-ghost"
          onClick={handleClonePreset}
          title="Copy preset filters into the editor"
        >
          Clone preset
        </button>
        <button
          type="button"
          className="st-btn-ghost"
          onClick={handleSaveScreen}
          title="Save current filter configuration"
        >
          Save screen
        </button>
        {activeSavedScreenId && (
          <button
            type="button"
            className="st-btn-danger"
            onClick={handleDeleteSavedScreen}
            title="Delete selected saved screen"
          >
            Delete saved
          </button>
        )}
      </div>

      <details className="st-details mb-3">
        <summary className="st-details-summary">Rank validation (forward returns)</summary>
        <RankValidationPanel compositeId={compositeId} />
      </details>

      <div className="st-panel mb-3">
        <div className="st-panel-header">{preset.label}</div>
        <div className="st-panel-body">
          <p className="small text-muted mb-2">{preset.description}</p>
          <ScreenFilterBuilder groups={filterGroups} onChange={handleFilterGroupsChange} />
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

      {error && <div className="st-alert-danger">{error}</div>}

      {meta && (
        <div className="small text-muted mb-2">
          Evaluated {meta.evaluated} · Matched {meta.matched} · Showing {meta.returned}
          {meta.universe ? ` · Universe ${meta.universe}` : ''}
        </div>
      )}

      {!loading && !payload && !error && (
        <div className="st-empty-state py-4 text-center text-muted small">
          Click <strong>Run screen</strong> to evaluate the current universe and filters.
        </div>
      )}

      {(loading || payload) && (
        <DataGrid
          data={rows}
          columns={columns}
          enableRowSelection={false}
          stickyColumnIds={['ticker']}
          compact
          activeRowId={activeRowId}
          scrollPersistenceKey="research-screen"
          defaultVisibleColumns={['ticker', 'companyName', 'sector', 'compositeScore', 'rankDelta', 'pb', 'pe', 'survivability', 'filtersPassed', 'evidence']}
          maxHeight="70vh"
        />
      )}
    </div>
  );
}
