import { useState, useEffect, useMemo, useRef } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { Container, Card, CardBody, CardTitle } from 'reactstrap';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import { signedHeatStyle, insiderDollarStyle, columnHeatStyle, columnMinMax } from '../utils/heatMap';
import {
    PORTFOLIO_COLUMN_META,
    PORTFOLIO_COLUMN_GROUPS,
    PORTFOLIO_DEFAULT_VISIBLE_COLUMNS,
} from '../config/portfolioColumns';
import DataGrid from '../components/DataGrid';
import ConfirmModal from '../components/ConfirmModal';
import { Link } from 'react-router-dom';
import { PORTFOLIO_UPDATED_EVENT, setPortfolioTickers } from '../utils/portfolio';
import { useToast } from '../context/ToastContext';
import { formatFreshnessTimestamp } from '../utils/dataFreshness';
import {
    secEdgarUrl, whaleWisdomUrl, seekingAlphaUrl, tickerNewsUrl,
    stockChartsUrl, openInsiderUrl,
} from '../utils/tickerLinks';

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

const PortfolioPage = () => {
    const [portfolio, setPortfolio] = useState(() => {
        try { return JSON.parse(localStorage.getItem('portfolio')) || []; }
        catch { return []; }
    });
    const [rows, setRows] = useState([]);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const [rowSelection, setRowSelection] = useState({});
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [cacheFreshness, setCacheFreshness] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const { showToast } = useToast();
    const portfolioKey = useMemo(() => portfolio.join(','), [portfolio]);

    const heatRanges = useMemo(() => ({
        sp: columnMinMax(rows, 'sp'),
        ebitdaEv: columnMinMax(rows, 'ebitdaEv'),
        tbp: columnMinMax(rows, 'tbp'),
        bp: columnMinMax(rows, 'bp'),
        ep: columnMinMax(rows, 'ep'),
        pe: columnMinMax(rows, 'pe'),
        cfop: columnMinMax(rows, 'cfop'),
        sfcfp: columnMinMax(rows, 'sfcfp'),
        ncfp: columnMinMax(rows, 'ncfp'),
        cashp: columnMinMax(rows, 'cashp'),
        assetp: columnMinMax(rows, 'assetp'),
        revDebt: columnMinMax(rows, 'revDebt'),
        de: columnMinMax(rows, 'de'),
        mcEv: columnMinMax(rows, 'mcEv'),
        currentRatio: columnMinMax(rows, 'currentRatio'),
        grossMargin: columnMinMax(rows, 'grossMargin'),
        netMargin: columnMinMax(rows, 'netMargin'),
        roe: columnMinMax(rows, 'roe'),
        roa: columnMinMax(rows, 'roa'),
        divYield: columnMinMax(rows, 'divYield'),
    }), [rows]);

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
                    <strong>{getValue()}</strong>
                    {!isPageLoading && isRowDataIncomplete(row.original) && (
                        <span
                            className="badge bg-warning text-dark ms-1"
                            title="Incomplete cache — refresh in Admin"
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
            cellStyle: ({ row }) => signedHeatStyle(row.original?.change, 5),
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
        columnHelper.accessor('industry', {
            meta: meta('industry'),
            header: 'Industry',
            cell: ({ getValue }) => <span className="small text-muted">{getValue() || '—'}</span>,
        }),
        columnHelper.accessor('change1w', {
            meta: meta('change1w'),
            header: '1W %',
            cellStyle: ({ row }) => signedHeatStyle(row.original?.change1w, 8),
            cell: ({ getValue }) => <span>{formatPercent(getValue())}</span>,
        }),
        columnHelper.accessor('change6m', {
            meta: meta('change6m'),
            header: '6M %',
            cellStyle: ({ row }) => signedHeatStyle(row.original?.change6m, 20),
            cell: ({ getValue }) => <span>{formatPercent(getValue())}</span>,
        }),
        columnHelper.accessor('pctTo52wHi', {
            meta: meta('pctTo52wHi'),
            header: '% to 52H',
            cellStyle: ({ row }) => signedHeatStyle(row.original?.pctTo52wHi, 15),
            cell: ({ getValue }) => <span>{formatPercent(getValue())}</span>,
        }),
        columnHelper.accessor('pctFrom52wLo', {
            meta: meta('pctFrom52wLo'),
            header: '% fr 52L',
            cellStyle: ({ row }) => signedHeatStyle(row.original?.pctFrom52wLo, 30),
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
            cellStyle: ({ row }) => columnHeatStyle(row.original?.sp, heatRanges.sp.min, heatRanges.sp.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ebitdaEv', {
            meta: meta('ebitdaEv'),
            header: 'Eb/EV',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.ebitdaEv, heatRanges.ebitdaEv.min, heatRanges.ebitdaEv.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('tbp', {
            meta: meta('tbp'),
            header: 'TBP',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.tbp, heatRanges.tbp.min, heatRanges.tbp.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('bp', {
            meta: meta('bp'),
            header: 'BP',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.bp, heatRanges.bp.min, heatRanges.bp.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ep', {
            meta: meta('ep'),
            header: 'EP',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.ep, heatRanges.ep.min, heatRanges.ep.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('pe', {
            meta: meta('pe'),
            header: 'P/E',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.pe, heatRanges.pe.min, heatRanges.pe.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 1)}</span>,
        }),
        columnHelper.accessor('de', {
            meta: meta('de'),
            header: 'D/E',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.de, heatRanges.de.min, heatRanges.de.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('currentRatio', {
            meta: meta('currentRatio'),
            header: 'Cur R',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.currentRatio, heatRanges.currentRatio.min, heatRanges.currentRatio.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('grossMargin', {
            meta: meta('grossMargin'),
            header: 'GM%',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.grossMargin, heatRanges.grossMargin.min, heatRanges.grossMargin.max),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('netMargin', {
            meta: meta('netMargin'),
            header: 'NM%',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.netMargin, heatRanges.netMargin.min, heatRanges.netMargin.max),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('roe', {
            meta: meta('roe'),
            header: 'ROE',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.roe, heatRanges.roe.min, heatRanges.roe.max),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('roa', {
            meta: meta('roa'),
            header: 'ROA',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.roa, heatRanges.roa.min, heatRanges.roa.max),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('divYield', {
            meta: meta('divYield'),
            header: 'Div%',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.divYield, heatRanges.divYield.min, heatRanges.divYield.max),
            cell: ({ getValue }) => <span>{formatPercent(getValue() != null ? getValue() * 100 : null)}</span>,
        }),
        columnHelper.accessor('cfop', {
            meta: meta('cfop'),
            header: 'CFOP',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.cfop, heatRanges.cfop.min, heatRanges.cfop.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('sfcfp', {
            meta: meta('sfcfp'),
            header: 'SFCFP',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.sfcfp, heatRanges.sfcfp.min, heatRanges.sfcfp.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ncfp', {
            meta: meta('ncfp'),
            header: 'NCFP',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.ncfp, heatRanges.ncfp.min, heatRanges.ncfp.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('cashp', {
            meta: meta('cashp'),
            header: 'Cash/P',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.cashp, heatRanges.cashp.min, heatRanges.cashp.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('assetp', {
            meta: meta('assetp'),
            header: 'Asset/P',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.assetp, heatRanges.assetp.min, heatRanges.assetp.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('revDebt', {
            meta: meta('revDebt'),
            header: 'Rev/Debt',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.revDebt, heatRanges.revDebt.min, heatRanges.revDebt.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('mcEv', {
            meta: meta('mcEv'),
            header: 'MC/EV',
            cellStyle: ({ row }) => columnHeatStyle(row.original?.mcEv, heatRanges.mcEv.min, heatRanges.mcEv.max),
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('insiderBuy6m', {
            meta: meta('insiderBuy6m'),
            header: 'Insider Buy 6M',
            cellStyle: ({ row }) => insiderDollarStyle(row.original?.insiderBuy6m),
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('insiderBuy3m', {
            meta: meta('insiderBuy3m'),
            header: 'Insider Buy 3M',
            cellStyle: ({ row }) => insiderDollarStyle(row.original?.insiderBuy3m),
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('insiderBuy1m', {
            meta: meta('insiderBuy1m'),
            header: 'Insider Buy 1M',
            cellStyle: ({ row }) => insiderDollarStyle(row.original?.insiderBuy1m),
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
            header: 'WW',
            cell: ({ row }) => (
                <a href={whaleWisdomUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">WW</a>
            ),
        }),
        columnHelper.display({
            id: 'saLink',
            meta: meta('saLink'),
            header: 'SA',
            cell: ({ row }) => (
                <a href={seekingAlphaUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">SA</a>
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
                <a href={stockChartsUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">
                    {row.original.price != null ? formatUsd(row.original.price) : 'Chart'}
                </a>
            ),
        }),
        columnHelper.display({
            id: 'openInsiderLink',
            meta: meta('openInsiderLink'),
            header: '6M Ins',
            cell: ({ row }) => (
                <a href={openInsiderUrl(row.original.ticker, 180)} target="_blank" rel="noopener noreferrer">6M</a>
            ),
        }),
    ], [columnHelper, heatRanges, isPageLoading]);

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
        function handleStorage(e) {
            if (e.key === 'portfolio') {
                try { setPortfolio(JSON.parse(e.newValue) || []); }
                catch { /* ignore corrupt value */ }
            }
        }
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
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
            (async () => {
                try {
                    const tickersStr = fetchTickers.join(',');
                    const [fundRes, topRes] = await Promise.allSettled([
                        axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&mostRecent=true`),
                        axios.get(API_ENDPOINTS.TOP_OF_BOOK, { params: { tickers: tickersStr } }),
                    ]);
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
                    setIsPageLoading(false);
                }

                try {
                    const changeRes = await axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: fetchTickers.join(',') } });
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
                } catch {
                    setRows(prev => prev.map(row => (
                        fetchTickers.includes(row.ticker)
                            ? { ...row, _pending: { ...(row._pending || {}), change: false } }
                            : row
                    )));
                }

                try {
                    const insiderRes = await axios.get(API_ENDPOINTS.INSIDER_BUYING_SUMS, { params: { tickers: fetchTickers.join(',') } });
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

                try {
                    const statsRes = await axios.get(API_ENDPOINTS.MARKET_STATS, { params: { tickers: fetchTickers.join(',') } });
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

    useEffect(() => {
        const sync = () => {
            try {
                const parsed = JSON.parse(localStorage.getItem('portfolio') || '[]');
                setPortfolio((prev) => (JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev));
            } catch { /* ignore */ }
        };
        window.addEventListener(PORTFOLIO_UPDATED_EVENT, sync);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(PORTFOLIO_UPDATED_EVENT, sync);
            window.removeEventListener('focus', sync);
        };
    }, []);

    if (portfolio.length === 0) {
        return (
            <Container className="py-3">
                <Card className="shadow-sm">
                    <CardBody className="text-center py-5">
                        <CardTitle tag="h3" className="mb-3">Your portfolio is empty</CardTitle>
                        <p className="text-muted mb-4">
                            Search for a ticker in the navbar and click <strong>+</strong> to add it.
                            After adding tickers, load fundamentals and prices from the admin console.
                        </p>
                        <div className="d-flex gap-2 justify-content-center flex-wrap">
                            <Link to="/admin" className="btn btn-primary">Open Admin Console</Link>
                            <Link to="/screener" className="btn btn-outline-secondary">Browse Insider Screener</Link>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        );
    }

    return (
        <Container className="py-3">
            <Card className="shadow-sm p-3">
                <CardBody>
                    <CardTitle tag="h3" className="mb-1">Portfolio</CardTitle>
                    {cacheFreshness && (
                        <div className="text-muted small mb-2">
                            Cache: prices {formatFreshnessTimestamp(cacheFreshness.pricesUpdatedAt)}
                            {' · '}fundamentals {formatFreshnessTimestamp(cacheFreshness.fundamentalsUpdatedAt)}
                            {' · '}insiders {formatFreshnessTimestamp(cacheFreshness.insidersUpdatedAt)}
                        </div>
                    )}
                    <div className="mb-2 d-flex gap-2 align-items-center flex-wrap">
                        <button
                            type="button"
                            className="btn btn-danger"
                            disabled={Object.keys(rowSelection).length === 0}
                            onClick={() => setDeleteConfirm(Object.keys(rowSelection))}
                        >
                            Delete Selected
                        </button>
                        <Link to="/admin" className="btn btn-outline-secondary btn-sm">Refresh data</Link>
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
                    <div style={{ position: 'relative' }}>
                        {isPageLoading && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                                <div className="spinner-border" role="status" aria-hidden="true" />
                            </div>
                        )}
                        <DataGrid
                            data={rows}
                            columns={columns}
                            getRowId={row => String(row.id ?? row.ticker)}
                            enableRowSelection
                            enableMultiRowSelection
                            enableSorting
                            enableGlobalFilter
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                            stickyColumnIds={PORTFOLIO_STICKY_COLUMNS}
                            columnGroups={columnGroups}
                            defaultVisibleColumns={PORTFOLIO_DEFAULT_VISIBLE_COLUMNS}
                            tableExtraClassName="portfolio-grid-table"
                            compact
                        />
                    </div>
                </CardBody>
            </Card>
        </Container>
    );
};

export default PortfolioPage;
