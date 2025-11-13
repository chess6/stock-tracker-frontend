import { useState, useEffect, useMemo } from 'react';
import {
    createColumnHelper
} from '@tanstack/react-table';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import ApexCharts from 'react-apexcharts';
import { createRoot } from 'react-dom/client';
import { Container, Card, CardBody, CardTitle } from 'reactstrap';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import DataGrid from '../components/DataGrid';

// Tabulator custom formatter for MiniChart React component
function tabulatorMiniChartFormatter(cell, formatterParams, onRendered) { // don't remove yet
    const cellElement = cell.getElement();
    const row = cell.getRow().getData();
    onRendered(function () {
        if (cellElement._reactRoot) {
            cellElement._reactRoot.unmount();
        }
        const root = createRoot(cellElement);
        cellElement._reactRoot = root;
        root.render(<MiniChart row={row} />);
    });
    return "";
}

// Attach MiniChart as the cell renderer for the 'chart' column
function MiniChart({ row }) {
    // Accepts { row } prop from Tabulator cell renderer
    const data = row && row.chartData
        ? row.chartData.map(v => typeof v === 'number' && !isNaN(v) ? Math.round(v * 100) / 100 : v)
        : [];
    const prevClose = row && row.prevClose;
    // Always show dotted line if prevClose and data exist
    const showPrevCloseLine = prevClose != null && data.length > 0;
    if (!data || data.length === 0) return null;
    // Dotted line for previous close
    const prevCloseLine = prevClose != null ? Array(data.length).fill(prevClose) : null;
    // Determine color: green if price >= 0, red if price < 0
    let changeValue = row.change;
    if (typeof changeValue === "string") {
        changeValue = parseFloat(changeValue.replace('%', ''));
    }
    const priceColor = (changeValue >= 0) ? '#28a745' : '#dc3545';
    return (
        <ApexCharts
            options={{
                chart: { id: 'mini', sparkline: { enabled: true } },
                stroke: {
                    width: [2, 2],
                    colors: [priceColor, priceColor], // Dotted line matches priceColor
                    curve: 'straight',
                    dashArray: [0, 2]
                },
                tooltip: { enabled: false },
                xaxis: { labels: { show: false } },
                yaxis: { labels: { show: false } },
            }}
            series={[
                { name: 'Price', data },
                showPrevCloseLine && prevCloseLine ? { name: 'Prev Close', data: prevCloseLine, stroke: { dashArray: 4 }, color: priceColor } : null
            ].filter(Boolean)}
            type="line"
            height={50}
            width={100}
        />
    );
}

const PortfolioPage = () => {
    // Column tooltips for Tabulator (memoized for stable reference)
    const columnTooltips = useMemo(() => ({
        ticker: 'Stock ticker symbol',
        price: 'Latest closing price (USD)',
        change: 'Percent change from previous close',
        marketCap: 'Market capitalization (USD)',
        sp: 'Sales per share',
        ebitdaEv: 'EBITDA/Enterprise Value',
        tbp: 'Tangible book value per share',
        bp: 'Book value per share',
        ep: 'Earnings per share',
        cfop: 'Cash flow from operations per share',
        sfcfp: 'Free cash flow per share',
        insiderBuy6m: 'Sum of insider buying (last 6 months)',
        insiderBuy3m: 'Sum of insider buying (last 3 months)',
        insiderBuy1m: 'Sum of insider buying (last 1 month)',
        delete: 'Remove from portfolio',
    }), []);
    // Search bar and results now handled in AppNavbar
    const [portfolio, setPortfolio] = useState(() => {
        // Try to load from localStorage, else default to []
        return JSON.parse(localStorage.getItem("portfolio")) || []
    });

    // Listen for changes to localStorage (from AppNavbar or other tabs)
    useEffect(() => {
        function handleStorage(e) {
            if (e.key === "portfolio") {
                setPortfolio(JSON.parse(e.newValue) || []);
            }
        }
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);
    const [rows, setRows] = useState([]);
    const [rowSelection, setRowSelection] = useState({});
    const [isPageLoading, setIsPageLoading] = useState(false);

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
                    onChange={(e) => {
                        e.stopPropagation();
                        row.toggleSelected();
                    }}
                    title="Select row"
                />
            ),
            size: 32,
        }),
        columnHelper.accessor('ticker', {
            header: () => <span title={columnTooltips.ticker}>Ticker</span>,
            cell: ({ row, getValue }) => {
                const ticker = getValue();
                const company = row.original.company;
                // const showCompany = company && company !== ticker; // don't remove yet
                return (
                    <div style={{ maxHeight: 40, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ lineHeight: '1.2', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}><strong>{ticker}</strong></div>
                        {/* // don't remove yet */}
                        {/* {showCompany ? <div className='text-muted' style={{ lineHeight: '1.2', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{company}</div> : null} */}
                    </div>
                );
            },
        }),
        // columnHelper.accessor('chartData', { header: 'Chart', cell: () => null }),
        columnHelper.accessor('price', {
            header: () => <span title={columnTooltips.price}>Price</span>,
            cell: ({ getValue }) => <span>{formatUsd(getValue())}</span>,
        }),
        columnHelper.accessor('change', {
            header: () => <span title={columnTooltips.change}>Change</span>,
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
            header: () => <span title={columnTooltips.marketCap}>Market Cap</span>,
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('sp', {
            header: () => <span title={columnTooltips.sp}>SP</span>,
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ebitdaEv', {
            header: () => <span title={columnTooltips.ebitdaEv}>Eb/EV</span>,
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('tbp', {
            header: () => <span title={columnTooltips.tbp}>TBP</span>,
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('bp', {
            header: () => <span title={columnTooltips.bp}>BP</span>,
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('ep', {
            header: () => <span title={columnTooltips.ep}>EP</span>,
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('cfop', {
            header: () => <span title={columnTooltips.cfop}>CFOP</span>,
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('sfcfp', {
            header: () => <span title={columnTooltips.sfcfp}>SFCFP</span>,
            cell: ({ getValue }) => <span>{formatDecimal(getValue(), 2)}</span>,
        }),
        columnHelper.accessor('insiderBuy6m', {
            header: () => <span title={columnTooltips.insiderBuy6m}>Insider Buy 6M</span>,
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('insiderBuy3m', {
            header: () => <span title={columnTooltips.insiderBuy3m}>Insider Buy 3M</span>,
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
        columnHelper.accessor('insiderBuy1m', {
            header: () => <span title={columnTooltips.insiderBuy1m}>Insider Buy 1M</span>,
            cell: ({ getValue }) => <span>{formatUsd(getValue(), 0)}</span>,
        }),
    ], [columnTooltips, columnHelper]);

    // Handler to delete ticker from portfolio
    const handleDeleteTicker = async ticker => {
        setPortfolio(prev => {
            const updated = prev.filter(t => t !== ticker);
            localStorage.setItem('portfolio', JSON.stringify(updated));
            return updated;
        });
    };

    useEffect(() => {
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        // Get current tickers in rows
        const currentTickers = new Set(rows.map(r => r.ticker));
        const portfolioSet = new Set(portfolio);
        // Find added and removed tickers
        const added = portfolio.filter(t => !currentTickers.has(t));
        const removed = rows.filter(r => !portfolioSet.has(r.ticker)).map(r => r.ticker);

        // If portfolio is empty, clear rows
        if (portfolio.length === 0) {
            setRows([]);
            return;
        }

        // Remove rows for deleted tickers
        if (removed.length) {
            setRows(prevRows => prevRows.filter(r => portfolioSet.has(r.ticker)));
        }

        // Initial load or only additions
        if (rows.length === 0 || added.length) {
            setIsPageLoading(true);
            const fetchTickers = rows.length === 0 ? portfolio : added;
            (async () => {
                try {
                    const tickersStr = fetchTickers.join(',');
                    // Stage 1: financials + top-of-book
                    const [fundRes, topRes] = await Promise.allSettled([
                        axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&mostRecent=true`),
                        axios.get(API_ENDPOINTS.TOP_OF_BOOK, { params: { tickers: tickersStr } }),
                    ]);
                    const metricsMap = fundRes.status === 'fulfilled' ? (fundRes.value.data?.metrics || {}) : {};
                    const topQuotes = topRes.status === 'fulfilled' ? (topRes.value.data?.quotes || {}) : {};

                    const newRows = fetchTickers.map((ticker) => {
                        const metrics = metricsMap[ticker] || {};
                        const toNumber = key => {
                            const value = metrics[key];
                            if (value === null || value === undefined) return null;
                            const parsed = Number(value);
                            return Number.isNaN(parsed) ? null : parsed;
                        };
                        const marketCap = toNumber('marketCap');
                        const sp = toNumber('sp');
                        const ebitdaEv = toNumber('ebitdaEv');
                        const tbp = toNumber('tbp');
                        const bp = toNumber('bp');
                        const ep = toNumber('ep');
                        const cfop = toNumber('cfop');
                        const sfcfp = toNumber('sfcfp');

                        const tq = topQuotes[ticker] || {};
                        const lastCandidates = [tq.last, tq.tngoLast];
                        const lastVal = lastCandidates.find(v => v != null && !Number.isNaN(Number(v)));
                        const last = lastVal != null ? Number(lastVal) : null;

                        const price = last != null && !Number.isNaN(last) ? last : null;
                        const company = tq.name || null;
                        const chartData = [];
                        return {
                            id: ticker,
                            ticker,
                            company,
                            chartData,
                            price,
                            change: null,
                            marketCap,
                            sp,
                            ebitdaEv,
                            tbp,
                            bp,
                            ep,
                            cfop,
                            sfcfp,
                            prevClose: null,
                            _pending: { change: true },
                            onDelete: handleDeleteTicker,
                        };
                    });
                    setRows(prevRows => {
                        // On initial load, replace all
                        if (prevRows.length === 0) return newRows;
                        // Otherwise, append only new rows
                        const existing = new Set(prevRows.map(r => r.ticker));
                        const dedupNew = newRows.filter(r => !existing.has(r.ticker));
                        return [...prevRows, ...dedupNew];
                    });

                    // Intraday enrichment for fetchTickers
                    // try { // commented out, don't remove yet
                    //     const intradayResults = await Promise.allSettled(
                    //         fetchTickers.map((ticker) => axios.get(API_ENDPOINTS.INTRADAY(ticker)))
                    //     );
                    //     const companyByTicker = {};
                    //     intradayResults.forEach((res, idx) => {
                    //         if (res.status === 'fulfilled') {
                    //             const data = res.value?.data;
                    //             const name = data?.tickerMeta?.name;
                    //             if (name) companyByTicker[fetchTickers[idx]] = name;
                    //         }
                    //     });
                    //     if (Object.keys(companyByTicker).length > 0) {
                    //         setRows(prev => prev.map(row => (
                    //             fetchTickers.includes(row.ticker)
                    //                 ? { ...row, company: companyByTicker[row.ticker] || row.company }
                    //                 : row
                    //         )));
                    //     }
                    // } catch { }

                } finally {
                    setIsPageLoading(false);
                }

                // Stage 2: daily change for only fetchTickers
                try {
                    const changeRes = await axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: fetchTickers.join(',') } });
                    const changeMap = changeRes.data?.changes || {};
                    setRows(prev => prev.map(row => {
                        if (!fetchTickers.includes(row.ticker)) return row;
                        const changeInfo = changeMap[row.ticker] || {};
                        const prevClose = changeInfo.prevClose != null ? Number(changeInfo.prevClose) : null;
                        const todayClose = changeInfo.todayClose != null ? Number(changeInfo.todayClose) : null;
                        let change = row.change;
                        if (todayClose != null && prevClose != null && !Number.isNaN(todayClose) && !Number.isNaN(prevClose) && prevClose !== 0) {
                            const diff = todayClose - prevClose;
                            change = (diff / prevClose) * 100;
                        }
                        let price = row.price;
                        if (price == null && todayClose != null && !Number.isNaN(todayClose)) {
                            price = todayClose;
                        } else if (price == null && prevClose != null && !Number.isNaN(prevClose)) {
                            price = prevClose;
                        }
                        return { ...row, price, change, prevClose, _pending: { ...(row._pending || {}), change: false } };
                    }));
                } catch {
                    setRows(prev => prev.map(row => (
                        fetchTickers.includes(row.ticker)
                            ? { ...row, _pending: { ...(row._pending || {}), change: false } }
                            : row
                    )));
                }

                // Stage 3: insider buying sums for fetchTickers
                try {
                    const insiderRes = await axios.get(API_ENDPOINTS.INSIDER_BUYING_SUMS, { params: { tickers: fetchTickers.join(',') } });
                    let payload = insiderRes?.data;
                    let map = {};
                    if (Array.isArray(payload?.rows)) {
                        payload.rows.forEach(r => { if (r && r.ticker) map[r.ticker] = r; });
                    } else if (Array.isArray(payload)) {
                        payload.forEach(r => { if (r && r.ticker) map[r.ticker] = r; });
                    } else if (payload && typeof payload === 'object') {
                        // assume keyed by ticker
                        map = payload.sums || payload;
                    }
                    setRows(prev => prev.map(row => {
                        const s = map[row.ticker] || {};
                        const buy6m = Number(s.buy6m ?? s.insiderBuy6m ?? 0);
                        const buy3m = Number(s.buy3m ?? s.insiderBuy3m ?? 0);
                        const buy1m = Number(s.buy1m ?? s.insiderBuy1m ?? 0);
                        return { ...row, insiderBuy6m: buy6m, insiderBuy3m: buy3m, insiderBuy1m: buy1m };
                    }));
                } catch {
                    // ignore
                }
            })();
        }
    }, [portfolio]);

    // Same-tab portfolio sync (storage event doesn't fire in same tab)
    useEffect(() => {
        const sync = () => {
            try {
                const raw = localStorage.getItem('portfolio');
                const parsed = raw ? JSON.parse(raw) : [];
                const current = JSON.stringify(portfolio);
                const next = JSON.stringify(parsed);
                if (current !== next) setPortfolio(parsed);
            } catch { }
        };
        const onFocus = () => sync();
        window.addEventListener('focus', onFocus);
        const id = setInterval(sync, 1500);
        return () => {
            window.removeEventListener('focus', onFocus);
            clearInterval(id);
        };
    }, [portfolio]);

    return (
        <Container className="py-3">
            <Card className="shadow-sm p-3">
                <CardBody>
                    <CardTitle tag="h3" className="mb-3">Portfolio</CardTitle>
                    <div className="mb-2 d-flex gap-2 align-items-center">
                        <button
                            className="btn btn-danger"
                            disabled={Object.keys(rowSelection).length === 0}
                            onClick={() => {
                                setIsPageLoading(true);
                                setTimeout(() => {
                                    const selected = Object.keys(rowSelection);
                                    setPortfolio(prev => {
                                        const updated = prev.filter(t => !selected.includes(t));
                                        localStorage.setItem('portfolio', JSON.stringify(updated));
                                        return updated;
                                    });
                                    setRowSelection({});
                                    setIsPageLoading(false);
                                }, 0);
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
                            enableRowSelection={true}
                            enableMultiRowSelection={true}
                            enableSorting={true}
                            enableGlobalFilter={true}
                            style={{ tableLayout: 'auto' }}
                            rowSelection={rowSelection}
                            onRowSelectionChange={setRowSelection}
                        />
                    </div>
                </CardBody>
            </Card>
        </Container>
    );
};

export default PortfolioPage;
