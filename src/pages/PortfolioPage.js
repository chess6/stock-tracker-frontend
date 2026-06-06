import { useState, useEffect, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { Container, Card, CardBody, CardTitle } from 'reactstrap';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import { signedHeatStyle, insiderDollarStyle, columnHeatStyle, columnMinMax } from '../utils/heatMap';
import { PORTFOLIO_COLUMN_META, PORTFOLIO_COLUMN_GROUPS } from '../config/portfolioColumns';
import DataGrid from '../components/DataGrid';
import { Link } from 'react-router-dom';
import { secEdgarUrl, whaleWisdomUrl, seekingAlphaUrl, tickerNewsUrl } from '../utils/tickerLinks';

const toNullableNumber = (value) => {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
};

const meta = (key) => ({
    ...(PORTFOLIO_COLUMN_META[key] || { label: key, tooltip: key }),
    numeric: key !== 'ticker',
});

const PortfolioPage = () => {
    const [portfolio, setPortfolio] = useState(() => JSON.parse(localStorage.getItem('portfolio')) || []);
    const [rows, setRows] = useState([]);
    const [rowSelection, setRowSelection] = useState({});
    const [isPageLoading, setIsPageLoading] = useState(false);

    const heatRanges = useMemo(() => ({
        sp: columnMinMax(rows, 'sp'),
        ebitdaEv: columnMinMax(rows, 'ebitdaEv'),
        tbp: columnMinMax(rows, 'tbp'),
        bp: columnMinMax(rows, 'bp'),
        ep: columnMinMax(rows, 'ep'),
        cfop: columnMinMax(rows, 'cfop'),
        sfcfp: columnMinMax(rows, 'sfcfp'),
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
            size: 32,
        }),
        columnHelper.accessor('ticker', {
            meta: meta('ticker'),
            header: 'Ticker',
            cell: ({ getValue }) => <strong>{getValue()}</strong>,
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
            size: 44,
        }),
        columnHelper.display({
            id: 'wwLink',
            meta: meta('wwLink'),
            header: 'WW',
            cell: ({ row }) => (
                <a href={whaleWisdomUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">WW</a>
            ),
            size: 40,
        }),
        columnHelper.display({
            id: 'saLink',
            meta: meta('saLink'),
            header: 'SA',
            cell: ({ row }) => (
                <a href={seekingAlphaUrl(row.original.ticker)} target="_blank" rel="noopener noreferrer">SA</a>
            ),
            size: 36,
        }),
        columnHelper.display({
            id: 'newsLink',
            meta: meta('newsLink'),
            header: 'News',
            cell: ({ row }) => (
                <Link to={tickerNewsUrl(row.original.ticker)}>News</Link>
            ),
            size: 48,
        }),
    ], [columnHelper, heatRanges]);

    const columnGroups = useMemo(() => PORTFOLIO_COLUMN_GROUPS.map((group) => ({
        ...group,
        columnIds: columns
            .map((col) => col.accessorKey ?? col.id)
            .filter((colId) => colId && PORTFOLIO_COLUMN_META[colId]?.group === group.id),
    })).filter((group) => group.columnIds.length > 0), [columns]);

    const handleDeleteTicker = (ticker) => {
        setPortfolio(prev => {
            const updated = prev.filter(t => t !== ticker);
            localStorage.setItem('portfolio', JSON.stringify(updated));
            return updated;
        });
    };

    useEffect(() => {
        function handleStorage(e) {
            if (e.key === 'portfolio') setPortfolio(JSON.parse(e.newValue) || []);
        }
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        const currentTickers = new Set(rows.map(r => r.ticker));
        const portfolioSet = new Set(portfolio);
        const added = portfolio.filter(t => !currentTickers.has(t));
        const removed = rows.filter(r => !portfolioSet.has(r.ticker)).map(r => r.ticker);

        if (portfolio.length === 0) {
            setRows([]);
            return;
        }
        if (removed.length) {
            setRows(prevRows => prevRows.filter(r => portfolioSet.has(r.ticker)));
        }
        if (rows.length === 0 || added.length) {
            setIsPageLoading(true);
            const fetchTickers = rows.length === 0 ? portfolio : added;
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
                            price,
                            change: null,
                            marketCap: toNullableNumber(m.marketCap),
                            sp: toNullableNumber(m.sp),
                            ebitdaEv: toNullableNumber(m.ebitdaEv),
                            tbp: toNullableNumber(m.tbp),
                            bp: toNullableNumber(m.bp),
                            ep: toNullableNumber(m.ep),
                            cfop: toNullableNumber(m.cfop),
                            sfcfp: toNullableNumber(m.sfcfp),
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
            })();
        }
    }, [portfolio]);

    useEffect(() => {
        const sync = () => {
            try {
                const parsed = JSON.parse(localStorage.getItem('portfolio') || '[]');
                if (JSON.stringify(portfolio) !== JSON.stringify(parsed)) setPortfolio(parsed);
            } catch { /* ignore */ }
        };
        window.addEventListener('focus', sync);
        const id = setInterval(sync, 1500);
        return () => { window.removeEventListener('focus', sync); clearInterval(id); };
    }, [portfolio]);

    return (
        <Container className="py-3">
            <Card className="shadow-sm p-3">
                <CardBody>
                    <CardTitle tag="h3" className="mb-1">Portfolio</CardTitle>
                    <div className="mb-2 d-flex gap-2 align-items-center">
                        <button
                            className="btn btn-danger"
                            disabled={Object.keys(rowSelection).length === 0}
                            onClick={() => {
                                const selected = Object.keys(rowSelection);
                                setPortfolio(prev => {
                                    const updated = prev.filter(t => !selected.includes(t));
                                    localStorage.setItem('portfolio', JSON.stringify(updated));
                                    return updated;
                                });
                                setRowSelection({});
                            }}
                        >
                            Delete Selected
                        </button>
                    </div>
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
                            stickyColumnIds={['select', 'ticker', 'price']}
                            columnGroups={columnGroups}
                        />
                    </div>
                </CardBody>
            </Card>
        </Container>
    );
};

export default PortfolioPage;
