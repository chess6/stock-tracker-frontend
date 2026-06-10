import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import { attachPortfolioHeatStyles, PORTFOLIO_HEAT_METRIC_KEYS } from '../utils/portfolioHeat';
import { getCachedColumnMinMaxMap, rowsDatasetKey } from '../utils/heatmapCache';
import {
    PORTFOLIO_COLUMN_META,
    PORTFOLIO_COLUMN_GROUPS,
} from '../config/portfolioColumns';
import {
    buildVisibleColumnsForPreset,
    getPortfolioPresetById,
    PORTFOLIO_RESEARCH_PRESETS,
    setActivePortfolioPresetId,
} from '../config/portfolioPresets';
import {
    buildGroupedDisplayRows,
    PORTFOLIO_GROUP_BY_OPTIONS,
    setActivePortfolioGroupBy,
    setCollapsedPortfolioGroups,
    sortPortfolioRows,
} from '../utils/portfolioRowGroups';
import {
    addTagToTicker,
    ALL_TAGS_FILTER,
    filterRowsByTag,
    getActiveTagFilter,
    getAllUniqueTags,
    getCompanyTagsMap,
    setActiveTagFilter,
    removeTagFromTicker,
} from '../utils/companyTags';
import DataGrid from '../components/DataGrid';
import CompareMetricsPanel, { MAX_COMPARE_TICKERS } from '../components/research/CompareMetricsPanel';
import ConfirmModal from '../components/ConfirmModal';
import PortfolioWatchlists from '../components/PortfolioWatchlists';
import { Link, useSearchParams } from 'react-router-dom';
import {
    buildPortfolioSearchParams,
    loadPortfolioResearchState,
    savePortfolioResearchState,
} from '../utils/portfolioResearchState';
import { getPortfolio, loadUserPreferences, PORTFOLIO_UPDATED_EVENT, setPortfolioTickers } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { formatFreshnessTimestamp } from '../utils/dataFreshness';
import {
    secEdgarUrl, instHoldingsUrl, analysisUrl, tickerFinancialsUrl, tickerNewsUrl,
    extChartUrl, insiderScreenerUrl,
} from '../utils/tickerLinks';
import './research.css';

const toNullableNumber = (value) => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const PORTFOLIO_STICKY_COLUMNS = ['select', 'ticker', 'price'];

const meta = (key) => ({
    ...(PORTFOLIO_COLUMN_META[key] || { label: key, tooltip: key }),
    numeric: key !== 'ticker',
});

const isRowDataIncomplete = (row) => row.price == null || row.marketCap == null;

const portfolioHeatCell = (key) => ({ row }) => row.original?._heatStyles?.[key] || {};

const incompleteCacheTitle = (row) => {
    if (row.price == null && row.marketCap == null) {
        return 'Missing price and market cap — refresh prices and fundamentals in Admin';
    }
    if (row.price == null) {
        return 'Missing price — run Refresh prices in Admin';
    }
    if (row.marketCap == null) {
        return 'Missing market cap (shares outstanding) — run Refresh fundamentals in Admin';
    }
    return 'Incomplete cache — refresh in Admin';
};

const PortfolioPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [initialResearchState] = useState(() => loadPortfolioResearchState(searchParams));
    const [portfolio, setPortfolio] = useState(() => getPortfolio());
    const [rows, setRows] = useState([]);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const [rowSelection, setRowSelection] = useState({});
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [cacheFreshness, setCacheFreshness] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const { showToast } = useToast();
    const portfolioKey = useMemo(() => portfolio.join(','), [portfolio]);
    const [tagsByTicker, setTagsByTicker] = useState(() => getCompanyTagsMap());
    const [tagFilter, setTagFilter] = useState(() => initialResearchState.tagFilter);
    const [tagInput, setTagInput] = useState('');
    const [compareTickers, setCompareTickers] = useState(() => initialResearchState.compareTickers);
    const [compareOpen, setCompareOpen] = useState(() => initialResearchState.compareOpen);
    const [showPercentileRanks, setShowPercentileRanks] = useState(() => initialResearchState.showPercentileRanks);

    const tagFilteredRows = useMemo(
        () => filterRowsByTag(rows, tagFilter, tagsByTicker),
        [rows, tagFilter, tagsByTicker],
    );
    const allTags = useMemo(() => getAllUniqueTags(tagsByTicker), [tagsByTicker]);
    const selectedTickers = useMemo(
        () => Object.keys(rowSelection).filter((id) => !String(id).startsWith('group:')),
        [rowSelection],
    );

    const refreshTags = useCallback(() => {
        setTagsByTicker(getCompanyTagsMap());
        setTagFilter(getActiveTagFilter());
    }, []);

    const handleTagFilterChange = (event) => {
        const nextFilter = setActiveTagFilter(event.target.value);
        setTagFilter(nextFilter);
    };

    const handleAddTagToSelected = () => {
        const label = tagInput.trim();
        if (!selectedTickers.length || !label) return;
        try {
            selectedTickers.forEach((ticker) => addTagToTicker(ticker, label));
            refreshTags();
            setTagInput('');
            showToast(`Tagged ${selectedTickers.length} ticker(s).`, 'success');
        } catch (err) {
            showToast(err.message || 'Could not add tag.', 'error');
        }
    };

    const handleRemoveTag = useCallback((ticker, tag) => {
        removeTagFromTicker(ticker, tag);
        refreshTags();
    }, [refreshTags]);

    const heatDatasetKey = useMemo(
        () => rowsDatasetKey(tagFilteredRows, { idKey: 'ticker', metricKeys: PORTFOLIO_HEAT_METRIC_KEYS }),
        [tagFilteredRows],
    );
    const heatRanges = useMemo(
        () => getCachedColumnMinMaxMap(tagFilteredRows, PORTFOLIO_HEAT_METRIC_KEYS, heatDatasetKey),
        [tagFilteredRows, heatDatasetKey],
    );
    const gridRows = useMemo(
        () => attachPortfolioHeatStyles(tagFilteredRows, heatRanges),
        [tagFilteredRows, heatRanges],
    );

    const columnHelper = useMemo(() => createColumnHelper(), []);
    const columns = useMemo(() => [
        columnHelper.display({
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllPageRowsSelected()}
                    ref={el => el && (el.indeterminate = table.getIsSomePageRowsSelected())}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                    title="Select all rows"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={(e) => { e.stopPropagation(); row.toggleSelected(); }}
                    title="Select row"
                />
            ),
        }),
        columnHelper.accessor('ticker', {
            meta: meta('ticker'),
            header: 'Ticker',
            cell: ({ getValue, row }) => (
                <>
                    <Link to={tickerFinancialsUrl(getValue())}><strong>{getValue()}</strong></Link>
                    {!isPageLoading && isRowDataIncomplete(row.original) && (
                        <span
                            className="badge text-bg-warning ms-1"
                            title={incompleteCacheTitle(row.original)}
                            style={{ fontSize: 10, verticalAlign: 'middle' }}
                        >
                            !
                        </span>
                    )}
                </>
            ),
        }),
        columnHelper.accessor('price', {
            meta: meta('price'),
            header: 'Price',
            cell: ({ getValue }) => <span>{formatUsd(getValue())}</span>,
        }),
        columnHelper.accessor('change', {
            meta: meta('change'),
            header: 'Change',
            cellStyle: portfolioHeatCell('change'),
            cell: ({ getValue, row }) => {
                const pending = row.original?._pending?.change;
                const val = getValue();
                if (pending && (val == null || Number.isNaN(val))) {
                    return (
                        <span title="Loading change..." className="text-muted">
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        </span>
                    );
                }
                return <span>{formatPercent(val)}</span>;
            },
        }),
        columnHelper.accessor('marketCap', {
            meta: meta('marketCap'),
            header: 'Market Cap',
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('sector', {
            meta: meta('sector'),
            header: 'Sector',
            cell: ({ getValue }) => <span className="small">{getValue() || '—'}</span>,
        }),
        columnHelper.display({
            id: 'tags',
            meta: meta('tags'),
            header: 'Tags',
            cell: ({ row }) => {
                if (row.original?._isGroupHeader) return null;
                const ticker = row.original.ticker;
                const tags = tagsByTicker[ticker] || [];
                return (
                    <span className="portfolio-tag-pills">
                        {tags.map((tag) => (
                            <span key={tag} className="st-badge-muted portfolio-tag-pill">
                                {tag}
                                <button
                                    type="button"
                                    className="portfolio-tag-remove"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTag(ticker, tag);
                                    }}
                                    aria-label={`Remove tag ${tag}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </span>
                );
            },
        }),
        columnHelper.accessor('industry', {
            meta: meta('industry'),
            header: 'Industry',
            cell: ({ getValue }) => <span className="small text-muted">{getValue() || '—'}</span>,
        }),
        columnHelper.accessor('change1w', {
            meta: meta('change1w'),
            header: '1W %',
            cellStyle: portfolioHeatCell('change1w'),
            cell: ({ getValue }) => <span>{formatPercent(getValue())}</span>,
        }),
        columnHelper.accessor('change6m', {
            meta: meta('change6m'),
            header: '6M %',
            cellStyle: portfolioHeatCell('change6m'),
            cell: ({ getValue }) => <span>{formatPercent(getValue())}</span>,
        }),
        columnHelper.accessor('pctTo52wHi', {
            meta: meta('pctTo52wHi'),
            header: '% to 52H',
            cellStyle: portfolioHeatCell('pctTo52wHi'),
            cell: ({ getValue }) => <span>{formatPercent(getValue())}</span>,
        }),
        columnHelper.accessor('pctFrom52wLo', {
            meta: meta('pctFrom52wLo'),
            header: '% fr 52L',
            cellStyle: portfolioHeatCell('pctFrom52wLo'),
            cell: ({ getValue }) => <span>{formatPercent(getValue())}</span>,
        }),
        columnHelper.accessor('revenue', {
            meta: meta('revenue'),
            header: 'Revenue',
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('sp', {
            meta: meta('sp'),
            header: 'SP',
            cellStyle: portfolioHeatCell('sp'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ebitdaEv', {
            meta: meta('ebitdaEv'),
            header: 'Eb/EV',
            cellStyle: portfolioHeatCell('ebitdaEv'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('tbp', {
            meta: meta('tbp'),
            header: 'TBP',
            cellStyle: portfolioHeatCell('tbp'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('bp', {
            meta: meta('bp'),
            header: 'BP',
            cellStyle: portfolioHeatCell('bp'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ep', {
            meta: meta('ep'),
            header: 'EP',
            cellStyle: portfolioHeatCell('ep'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('pe', {
            meta: meta('pe'),
            header: 'P/E',
            cellStyle: portfolioHeatCell('pe'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 1)}</span>,
        }),
        columnHelper.accessor('de', {
            meta: meta('de'),
            header: 'D/E',
            cellStyle: portfolioHeatCell('de'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('currentRatio', {
            meta: meta('currentRatio'),
            header: 'Cur R',
            cellStyle: portfolioHeatCell('currentRatio'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('grossMargin', {
            meta: meta('grossMargin'),
            header: 'GM%',
            cellStyle: portfolioHeatCell('grossMargin'),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('netMargin', {
            meta: meta('netMargin'),
            header: 'NM%',
            cellStyle: portfolioHeatCell('netMargin'),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('roe', {
            meta: meta('roe'),
            header: 'ROE',
            cellStyle: portfolioHeatCell('roe'),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('roa', {
            meta: meta('roa'),
            header: 'ROA',
            cellStyle: portfolioHeatCell('roa'),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('divYield', {
            meta: meta('divYield'),
            header: 'Div%',
            cellStyle: portfolioHeatCell('divYield'),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('cfop', {
            meta: meta('cfop'),
            header: 'CFOP',
            cellStyle: portfolioHeatCell('cfop'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('sfcfp', {
            meta: meta('sfcfp'),
            header: 'SFCFP',
            cellStyle: portfolioHeatCell('sfcfp'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ncfp', {
            meta: meta('ncfp'),
            header: 'NCFP',
            cellStyle: portfolioHeatCell('ncfp'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('cashp', {
            meta: meta('cashp'),
            header: 'Cash/P',
            cellStyle: portfolioHeatCell('cashp'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('assetp', {
            meta: meta('assetp'),
            header: 'Asset/P',
            cellStyle: portfolioHeatCell('assetp'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('revDebt', {
            meta: meta('revDebt'),
            header: 'Rev/Debt',
            cellStyle: portfolioHeatCell('revDebt'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('mcEv', {
            meta: meta('mcEv'),
            header: 'MC/EV',
            cellStyle: portfolioHeatCell('mcEv'),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('insiderBuy6m', {
            meta: meta('insiderBuy6m'),
            header: 'Insider Buy 6M',
            cellStyle: portfolioHeatCell('insiderBuy6m'),
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('insiderBuy3m', {
            meta: meta('insiderBuy3m'),
            header: 'Insider Buy 3M',
            cellStyle: portfolioHeatCell('insiderBuy3m'),
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('insiderBuy1m', {
            meta: meta('insiderBuy1m'),
            header: 'Insider Buy 1M',
            cellStyle: portfolioHeatCell('insiderBuy1m'),
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.display({
            id: 'secLink',
            meta: meta('secLink'),
            header: 'SEC',
            cell: ({ row }) => (
                <a href={secEdgarUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">SEC</a>
            ),
        }),
        columnHelper.display({
            id: 'wwLink',
            meta: meta('wwLink'),
            header: 'Inst',
            cell: ({ row }) => (
                <a href={instHoldingsUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">Inst</a>
            ),
        }),
        columnHelper.display({
            id: 'saLink',
            meta: meta('saLink'),
            header: 'Anlys',
            cell: ({ row }) => (
                <a href={analysisUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">Anlys</a>
            ),
        }),
        columnHelper.display({
            id: 'newsLink',
            meta: meta('newsLink'),
            header: 'News',
            cell: ({ row }) => (
                <Link to={tickerNewsUrl(row.original.ticker)}>News</Link>
            ),
        }),
        columnHelper.display({
            id: 'chartLink',
            meta: meta('chartLink'),
            header: 'Chart',
            cell: ({ row }) => (
                <a href={extChartUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">
                    {row.original.price != null ? formatUsd(row.original.price) : 'Chart'}
                </a>
            ),
        }),
        columnHelper.display({
            id: 'openInsiderLink',
            meta: meta('openInsiderLink'),
            header: '6M Ins',
            cell: ({ row }) => (
                <a href={insiderScreenerUrl(row.original.ticker, 180)} target="_blank" rel="noopener noreferrer">6M</a>
            ),
        }),
    ], [columnHelper, isPageLoading, tagsByTicker, handleRemoveTag]);

    const allColumnIds = useMemo(
        () => columns.map((col) => col.accessorKey ?? col.id).filter(Boolean),
        [columns],
    );

    const [presetId, setPresetId] = useState(() => initialResearchState.presetId);
    const [visibleColumns, setVisibleColumns] = useState(() => initialResearchState.visibleColumns);
    const [sorting, setSorting] = useState(() => initialResearchState.sorting);

    const [groupBy, setGroupBy] = useState(() => initialResearchState.groupBy);
    const [collapsedGroups, setCollapsedGroups] = useState(
        () => new Set(initialResearchState.collapsedGroups || []),
    );
    const isGrouped = groupBy !== 'none';

    const sortedGridRows = useMemo(
        () => (isGrouped ? sortPortfolioRows(gridRows, sorting) : gridRows),
        [gridRows, sorting, isGrouped],
    );

    const displayRows = useMemo(
        () => (isGrouped
            ? buildGroupedDisplayRows(sortedGridRows, groupBy, collapsedGroups)
            : gridRows),
        [gridRows, sortedGridRows, groupBy, collapsedGroups, isGrouped],
    );

    const handleGroupByChange = (event) => {
        const nextGroupBy = setActivePortfolioGroupBy(event.target.value);
        setGroupBy(nextGroupBy);
        setCollapsedGroups(new Set());
        setCollapsedPortfolioGroups(new Set());
    };

    const handleGroupHeaderToggle = (groupKey) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            setCollapsedPortfolioGroups(next);
            return next;
        });
    };

    const handlePresetChange = (event) => {
        const nextId = event.target.value;
        const preset = getPortfolioPresetById(nextId);
        const resolvedId = setActivePortfolioPresetId(nextId);
        setPresetId(resolvedId);
        setVisibleColumns(buildVisibleColumnsForPreset(preset, allColumnIds));
        setSorting(preset.defaultSort ? [preset.defaultSort] : []);
    };

    const handleCompareSelected = () => {
        const tickers = selectedTickers
            .map((ticker) => String(ticker).toUpperCase())
            .slice(0, MAX_COMPARE_TICKERS);
        if (tickers.length < 2) {
            showToast('Select 2–5 tickers to compare.', 'warning');
            return;
        }
        setCompareTickers(tickers);
        setCompareOpen(true);
    };

    const handleClearCompare = () => {
        setCompareOpen(false);
        setCompareTickers([]);
        setShowPercentileRanks(false);
    };

    const collapsedGroupsKey = useMemo(() => [...collapsedGroups].sort().join('|'), [collapsedGroups]);

    useEffect(() => {
        savePortfolioResearchState({
            presetId,
            groupBy,
            tagFilter,
            visibleColumns,
            sorting,
            compareTickers,
            compareOpen,
            showPercentileRanks,
            collapsedGroups: [...collapsedGroups],
        });
        setSearchParams(
            buildPortfolioSearchParams({
                presetId,
                groupBy,
                tagFilter,
                compareTickers,
                compareOpen,
                showPercentileRanks,
            }),
            { replace: true },
        );
    }, [
        presetId,
        groupBy,
        tagFilter,
        visibleColumns,
        sorting,
        compareTickers,
        compareOpen,
        showPercentileRanks,
        collapsedGroupsKey,
        setSearchParams,
    ]);

    const columnGroups = useMemo(() => PORTFOLIO_COLUMN_GROUPS.map((group) => ({
        ...group,
        columnIds: columns
            .map((col) => col.accessorKey ?? col.id)
            .filter((colId) => colId && PORTFOLIO_COLUMN_META[colId]?.group === group.id),
    })).filter((group) => group.columnIds.length > 0), [columns]);

    const handleDeleteTicker = (ticker) => {
        setPortfolio((prev) => {
            const updated = prev.filter((t) => t !== ticker);
            setPortfolioTickers(updated);
            return updated;
        });
    };

    useEffect(() => {
        loadUserPreferences().then(() => setPortfolio(getPortfolio()));
        const sync = () => setPortfolio(getPortfolio());
        window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
        return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
    }, []);

    useEffect(() => {
        const portfolioList = portfolioKey ? portfolioKey.split(',') : [];
        const rows = rowsRef.current;
        const currentTickers = new Set(rows.map(r => r.ticker));
        const portfolioSet = new Set(portfolioList);
        const added = portfolioList.filter(t => !currentTickers.has(t));
        const removed = rows.filter(r => !portfolioSet.has(r.ticker)).map(r => r.ticker);

        if (portfolioList.length === 0) {
            setRows((prev) => (prev.length ? [] : prev));
            return;
        }
        if (removed.length) {
            setRows(prevRows => prevRows.filter(r => portfolioSet.has(r.ticker)));
        }
        if (rows.length === 0 || added.length) {
            setIsPageLoading(true);
            const fetchTickers = rows.length === 0 ? portfolioList : added;
            const controller = new AbortController();
            const signal = controller.signal;
            (async () => {
                try {
                    const tickersStr = fetchTickers.join(',');
                    const [fundRes, topRes] = await Promise.allSettled([
                        axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&mostRecent=true`, { signal }),
                        axios.get(API_ENDPOINTS.TOP_OF_BOOK, { params: { tickers: tickersStr }, signal }),
                    ]);
                    if (signal.aborted) return;
                    const metricsMap = fundRes.status === 'fulfilled' ? (fundRes.value.data?.metrics || {}) : {};
                    const topQuotes = topRes.status === 'fulfilled' ? (topRes.value.data?.quotes || {}) : {};

                    const newRows = fetchTickers.map((ticker) => {
                        const m = metricsMap[ticker] || {};
                        const tq = topQuotes[ticker] || {};
                        const lastVal = [tq.last, tq.tngoLast].find(v => v != null && !Number.isNaN(Number(v)));
                        const price = lastVal != null ? Number(lastVal) : null;
                        return {
                            id: ticker,
                            ticker,
                            company: tq.name || null,
                            sector: tq.sector || null,
                            industry: tq.industry || null,
                            price,
                            change: null,
                            change1w: null,
                            change4w: null,
                            change6m: null,
                            pctTo52wHi: null,
                            pctFrom52wLo: null,
                            marketCap: toNullableNumber(m.marketCap),
                            revenue: toNullableNumber(m.revenue),
                            sp: toNullableNumber(m.sp),
                            ebitdaEv: toNullableNumber(m.ebitdaEv),
                            tbp: toNullableNumber(m.tbp),
                            bp: toNullableNumber(m.bp),
                            ep: toNullableNumber(m.ep),
                            cfop: toNullableNumber(m.cfop),
                            sfcfp: toNullableNumber(m.sfcfp),
                            ncfp: toNullableNumber(m.ncfp),
                            cashp: toNullableNumber(m.cashp),
                            assetp: toNullableNumber(m.assetp),
                            revDebt: toNullableNumber(m.revDebt),
                            de: toNullableNumber(m.de),
                            mcEv: toNullableNumber(m.mcEv),
                            pe: toNullableNumber(m.pe),
                            currentRatio: toNullableNumber(m.currentRatio),
                            grossMargin: toNullableNumber(m.grossMargin),
                            netMargin: toNullableNumber(m.netMargin),
                            roe: toNullableNumber(m.roe),
                            roa: toNullableNumber(m.roa),
                            divYield: toNullableNumber(m.divYield),
                            insiderBuy6m: null,
                            insiderBuy3m: null,
                            insiderBuy1m: null,
                            prevClose: null,
                            _pending: { change: true },
                            onDelete: handleDeleteTicker,
                        };
                    });
                    setRows(prevRows => {
                        if (prevRows.length === 0) return newRows;
                        const existing = new Set(prevRows.map(r => r.ticker));
                        return [...prevRows, ...newRows.filter(r => !existing.has(r.ticker))];
                    });
                } finally {
                    if (!signal.aborted) setIsPageLoading(false);
                }

                if (signal.aborted) return;

                try {
                    const changeRes = await axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: fetchTickers.join(',') }, signal });
                    if (signal.aborted) return;
                    const changeMap = changeRes.data?.changes || {};
                    setRows(prev => prev.map(row => {
                        if (!fetchTickers.includes(row.ticker)) return row;
                        const changeInfo = changeMap[row.ticker] || {};
                        const prevClose = changeInfo.prevClose != null ? Number(changeInfo.prevClose) : null;
                        const todayClose = changeInfo.todayClose != null ? Number(changeInfo.todayClose) : null;
                        let change = row.change;
                        if (todayClose != null && prevClose != null && prevClose !== 0) {
                            change = ((todayClose - prevClose) / prevClose) * 100;
                        }
                        let price = row.price;
                        if (price == null && todayClose != null) price = todayClose;
                        else if (price == null && prevClose != null) price = prevClose;
                        return { ...row, price, change, prevClose, _pending: { ...(row._pending || {}), change: false } };
                    }));
                } catch (err) {
                    if (axios.isCancel(err)) return;
                    setRows(prev => prev.map(row => (
                        fetchTickers.includes(row.ticker)
                            ? { ...row, _pending: { ...(row._pending || {}), change: false } }
                            : row
                    )));
                }

                if (signal.aborted) return;

                try {
                    const insiderRes = await axios.get(API_ENDPOINTS.INSIDER_BUYING_SUMS, { params: { tickers: fetchTickers.join(',') }, signal });
                    if (signal.aborted) return;
                    const payload = insiderRes?.data;
                    const map = {};
                    (payload?.rows || []).forEach(r => { if (r?.ticker) map[r.ticker] = r; });
                    setRows(prev => prev.map(row => {
                        const s = map[row.ticker];
                        if (!s) return row;
                        return {
                            ...row,
                            insiderBuy6m: toNullableNumber(s.buy6m ?? s.insiderBuy6m),
                            insiderBuy3m: toNullableNumber(s.buy3m ?? s.insiderBuy3m),
                            insiderBuy1m: toNullableNumber(s.buy1m ?? s.insiderBuy1m),
                        };
                    }));
                } catch { /* ignore */ }

                if (signal.aborted) return;

                try {
                    const statsRes = await axios.get(API_ENDPOINTS.MARKET_STATS, { params: { tickers: fetchTickers.join(',') }, signal });
                    if (signal.aborted) return;
                    const statsMap = statsRes.data?.stats || {};
                    setRows(prev => prev.map(row => {
                        if (!fetchTickers.includes(row.ticker)) return row;
                        const s = statsMap[row.ticker] || {};
                        return {
                            ...row,
                            change1w: toNullableNumber(s.change1w),
                            change4w: toNullableNumber(s.change4w),
                            change6m: toNullableNumber(s.change6m),
                            pctTo52wHi: toNullableNumber(s.pctTo52wHi),
                            pctFrom52wLo: toNullableNumber(s.pctFrom52wLo),
                        };
                    }));
                } catch { /* ignore */ }
            })();
            return () => controller.abort();
        }
    }, [portfolioKey]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axios.get(API_ENDPOINTS.ADMIN_STATUS);
                if (!cancelled) setCacheFreshness(res.data?.freshness || null);
            } catch {
                if (!cancelled) setCacheFreshness(null);
            }
        })();
        return () => { cancelled = true; };
    }, [portfolio.length]);

    if (portfolio.length === 0) {
        return (
            <div className="st-page st-page--constrained">
                <div className="st-panel">
                    <div className="st-panel-body st-empty-state">
                        <PortfolioWatchlists
                            portfolio={portfolio}
                            onLoaded={() => setPortfolio(getPortfolio())}
                            showToast={showToast}
                        />
                        <h1 className="st-page-heading">Your portfolio is empty</h1>
                        <p className="st-muted-note">
                            Search for a ticker in the navbar and click <strong>+</strong> to add it.
                            After adding tickers, load fundamentals and prices from the admin console.
                        </p>
                        <div className="d-flex gap-2 justify-content-center flex-wrap">
                            <Link to="/admin" className="st-btn-primary st-link-btn">Open Admin Console</Link>
                            <Link to="/screener" className="st-btn-ghost st-link-btn">Browse Insider Screener</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="st-page st-page--full">
            <div className="st-panel">
                <div className="st-panel-header">Portfolio</div>
                <div className="st-panel-body">
                    <PortfolioWatchlists
                        portfolio={portfolio}
                        onLoaded={() => setPortfolio(getPortfolio())}
                        showToast={showToast}
                    />
                    {cacheFreshness && (
                        <div className="st-muted-note mb-2">
                            Cache: prices {formatFreshnessTimestamp(cacheFreshness.pricesUpdatedAt)}
                            {' · '}fundamentals {formatFreshnessTimestamp(cacheFreshness.fundamentalsUpdatedAt)}
                            {' · '}insiders {formatFreshnessTimestamp(cacheFreshness.insidersUpdatedAt)}
                        </div>
                    )}
                    <div className="mb-2 d-flex gap-2 align-items-center flex-wrap">
                        <label className="d-flex align-items-center gap-2 mb-0">
                            <span className="small text-muted">View preset</span>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: 'auto', minWidth: 160 }}
                                value={presetId}
                                onChange={handlePresetChange}
                                aria-label="Portfolio research view preset"
                            >
                                {PORTFOLIO_RESEARCH_PRESETS.map((preset) => (
                                    <option key={preset.id} value={preset.id}>
                                        {preset.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="d-flex align-items-center gap-2 mb-0">
                            <span className="small text-muted">Group by</span>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: 'auto', minWidth: 140 }}
                                value={groupBy}
                                onChange={handleGroupByChange}
                                aria-label="Portfolio row grouping"
                            >
                                {PORTFOLIO_GROUP_BY_OPTIONS.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="d-flex align-items-center gap-2 mb-0">
                            <span className="small text-muted">Filter tag</span>
                            <select
                                className="form-select form-select-sm"
                                style={{ width: 'auto', minWidth: 140 }}
                                value={tagFilter}
                                onChange={handleTagFilterChange}
                                aria-label="Filter portfolio by tag"
                            >
                                <option value={ALL_TAGS_FILTER}>All tags</option>
                                {allTags.map((tag) => (
                                    <option key={tag} value={tag}>
                                        {tag}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {selectedTickers.length > 0 && (
                            <label className="d-flex align-items-center gap-2 mb-0">
                                <span className="small text-muted">Tag selected</span>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    style={{ width: 120 }}
                                    value={tagInput}
                                    onChange={(event) => setTagInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            handleAddTagToSelected();
                                        }
                                    }}
                                    placeholder="e.g. deep value"
                                    list="portfolio-tag-suggestions"
                                    aria-label="Tag name for selected tickers"
                                />
                                <datalist id="portfolio-tag-suggestions">
                                    {allTags.map((tag) => (
                                        <option key={tag} value={tag} />
                                    ))}
                                </datalist>
                                <button
                                    type="button"
                                    className="st-btn"
                                    disabled={!tagInput.trim()}
                                    onClick={handleAddTagToSelected}
                                >
                                    Add tag
                                </button>
                            </label>
                        )}
                        <button
                            type="button"
                            className="st-btn"
                            disabled={selectedTickers.length < 2 || selectedTickers.length > MAX_COMPARE_TICKERS}
                            onClick={handleCompareSelected}
                            title="Compare 2–5 selected tickers"
                        >
                            Compare selected
                        </button>
                        {compareOpen && compareTickers.length >= 2 && (
                            <button
                                type="button"
                                className="st-btn-ghost"
                                onClick={handleClearCompare}
                            >
                                Close compare
                            </button>
                        )}
                        <button
                            type="button"
                            className="st-btn"
                            style={{ borderColor: 'var(--st-negative)', color: 'var(--st-negative)' }}
                            disabled={Object.keys(rowSelection).length === 0}
                            onClick={() => setDeleteConfirm(Object.keys(rowSelection))}
                        >
                            Delete Selected
                        </button>
                        <Link to="/admin" className="st-btn-ghost st-link-btn">Refresh data</Link>
                    </div>
                    <ConfirmModal
                        isOpen={Boolean(deleteConfirm?.length)}
                        title="Remove tickers?"
                        message={deleteConfirm
                            ? `Remove ${deleteConfirm.length} ticker(s) from your portfolio?`
                            : ''}
                        confirmLabel="Remove"
                        onCancel={() => setDeleteConfirm(null)}
                        onConfirm={() => {
                            const selected = deleteConfirm || [];
                            setPortfolio((prev) => {
                                const updated = prev.filter((t) => !selected.includes(t));
                                setPortfolioTickers(updated);
                                return updated;
                            });
                            setRowSelection({});
                            setDeleteConfirm(null);
                            showToast(`Removed ${selected.length} ticker(s) from portfolio.`, 'success');
                        }}
                    />
                    {tagFilter !== ALL_TAGS_FILTER && tagFilteredRows.length === 0 && (
                        <div className="st-alert-info mb-2">
                            No portfolio rows match tag <strong>{tagFilter}</strong>.
                        </div>
                    )}
                    {compareOpen && compareTickers.length >= 2 && (
                        <CompareMetricsPanel
                            compareTickers={compareTickers}
                            snapshotRows={tagFilteredRows}
                            percentileUniverse={tagFilteredRows}
                            showPercentileRanks={showPercentileRanks}
                            onTogglePercentileRanks={() => setShowPercentileRanks((prev) => !prev)}
                            onClose={handleClearCompare}
                        />
                    )}
                    <div style={{ position: 'relative' }}>
                        {isPageLoading && (
                            <div className="portfolio-loading-overlay" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                <div className="spinner-border" role="status" aria-hidden="true" />
                            </div>
                        )}
                        <DataGrid
                            data={displayRows}
                            columns={columns}
                            getRowId={row => String(row.id ?? row.ticker)}
                            enableRowSelection
                            enableMultiRowSelection
                            enableSorting
                            enableGlobalFilter
                            manualSorting={isGrouped}
                            onGroupHeaderToggle={isGrouped ? handleGroupHeaderToggle : undefined}
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                            stickyColumnIds={PORTFOLIO_STICKY_COLUMNS}
                            columnGroups={columnGroups}
                            useSharedColumnState
                            columnVisibility={visibleColumns}
                            onColumnVisibilityChange={setVisibleColumns}
                            sorting={sorting}
                            onSortingChange={setSorting}
                            tableExtraClassName="portfolio-grid-table"
                            compact
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioPage;
