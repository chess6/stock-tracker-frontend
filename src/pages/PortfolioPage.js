import { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { ReactTabulator } from 'react-tabulator';
import 'react-tabulator/lib/styles.css';
import 'tabulator-tables/dist/css/tabulator.min.css';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import ApexCharts from 'react-apexcharts';
import { createRoot } from 'react-dom/client';
import { Container, Card, CardBody, CardTitle } from 'reactstrap';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';

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
    const [showPrevCloseLine, setShowPrevCloseLine] = useState(false);
    useEffect(() => {
        setShowPrevCloseLine(false);
        if (prevClose != null && data.length > 0) {
            const timer = setTimeout(() => setShowPrevCloseLine(true), 500); // 300ms delay
            return () => clearTimeout(timer);
        }
    }, [prevClose, data.length]);
    if (!data || data.length === 0) return null;
    // Dotted line for previous close
    const prevCloseLine = prevClose != null ? Array(data.length).fill(prevClose) : null;
    return (
        <ApexCharts
            options={{
                chart: { id: 'mini', sparkline: { enabled: true } },
                stroke: {
                    width: [2, 2],
                    colors: ['#77B6EA', '#545454'],
                    curve: 'straight',
                    dashArray: [0, 2]
                },
                tooltip: { enabled: false },
                xaxis: { labels: { show: false } },
                yaxis: { labels: { show: false } },
            }}
            series={[
                { name: 'Price', data },
                showPrevCloseLine && prevCloseLine ? { name: 'Prev Close', data: prevCloseLine, stroke: { dashArray: 4 }, color: '#888' } : null
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
    // Memoized delete button to prevent flicker
    const MemoDeleteButton = useMemo(() => {
        return function DeleteButton({ ticker }) {
            return (
                <button
                    className="btn btn-sm btn-danger"
                    style={{ marginLeft: 8 }}
                    onClick={e => {
                        e.stopPropagation();
                        if (window.confirm(`Remove ${ticker} from portfolio?`)) {
                            handleDeleteTicker(ticker);
                        }
                    }}
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
            );
        };
    }, []);

    const columns = useMemo(() => [
        {
            title: 'Ticker', field: 'ticker', headerTooltip: columnTooltips.ticker, sorter: 'string', formatter: (cell) => {
                const row = cell.getRow().getData();
                return `<div><strong>${row.ticker}</strong>${row.company ? `<div class='text-muted'>${row.company}</div>` : ''}</div>`;
            }
        },
        { title: 'Chart', field: 'chartData', width: 120, headerTooltip: 'Intraday price chart', formatter: tabulatorMiniChartFormatter }, // don't remove yet
        { title: 'Price', field: 'price', headerTooltip: columnTooltips.price, sorter: 'string' },
        { title: 'Change', field: 'change', headerTooltip: columnTooltips.change },
        { title: 'Market Cap', field: 'marketCap', headerTooltip: columnTooltips.marketCap },
        { title: 'SP', field: 'sp', headerTooltip: columnTooltips.sp },
        { title: 'Eb/EV', field: 'ebitdaEv', headerTooltip: columnTooltips.ebitdaEv },
        { title: 'TBP', field: 'tbp', headerTooltip: columnTooltips.tbp },
        { title: 'BP', field: 'bp', headerTooltip: columnTooltips.bp },
        { title: 'EP', field: 'ep', headerTooltip: columnTooltips.ep },
        { title: 'CFOP', field: 'cfop', headerTooltip: columnTooltips.cfop },
        { title: 'SFCFP', field: 'sfcfp', headerTooltip: columnTooltips.sfcfp },
        {
            title: 'Delete row?', field: 'delete', headerTooltip: columnTooltips.delete,
            formatter: function (cell, formatterParams, onRendered) {
                const cellElement = cell.getElement();
                const row = cell.getRow().getData();
                onRendered(function () {
                    if (!cellElement._reactRoot) {
                        const root = createRoot(cellElement);
                        cellElement._reactRoot = root;
                        root.render(<MemoDeleteButton ticker={row.ticker} />);
                    }
                });
                return "";
            }
        },
    ], [columnTooltips]);

    // Handler to delete ticker from portfolio
    const handleDeleteTicker = async ticker => {
        setPortfolio(prev => {
            const updated = prev.filter(t => t !== ticker);
            localStorage.setItem('portfolio', JSON.stringify(updated));
            return updated;
        });
    };

    // Dropdown state now handled in AppNavbar

    // Guard summary fetch against duplicate calls (Strict Mode) — no longer needed after batch refactor


    useEffect(() => {
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        async function fetchPortfolioData() {
            let metricsMap = {};
            let topQuotes = {};
            let changeMap = {};
            if (portfolio.length > 0) {
                const tickersStr = portfolio.join(',');
                const [fundRes, topRes, changeRes] = await Promise.allSettled([
                    axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&mostRecent=true`),
                    axios.get(API_ENDPOINTS.TOP_OF_BOOK, { params: { tickers: tickersStr } }),
                    axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: tickersStr } }),
                ]);
                if (fundRes.status === 'fulfilled') {
                    metricsMap = fundRes.value.data && fundRes.value.data.metrics ? fundRes.value.data.metrics : {};
                }
                if (topRes.status === 'fulfilled') {
                    topQuotes = (topRes.value.data && topRes.value.data.quotes) || {};
                }
                if (changeRes.status === 'fulfilled') {
                    changeMap = (changeRes.value.data && changeRes.value.data.changes) || {};
                }
            }
            const initialRows = portfolio.map((ticker, idx) => {
                const metrics = metricsMap[ticker] || {};
                const toNumber = key => {
                    const value = metrics[key];
                    if (value === null || value === undefined) return null;
                    const parsed = Number(value);
                    return Number.isNaN(parsed) ? null : parsed;
                };
                let marketCap = '-';
                let sp = '-';
                let ebitdaEv = '-';
                let tbp = '-';
                let bp = '-';
                let ep = '-';
                let cfop = '-';
                let sfcfp = '-';
                const marketCapValue = toNumber('marketCap');
                if (marketCapValue !== null) marketCap = formatUsd(marketCapValue, 0);
                const spValue = toNumber('sp'); if (spValue !== null) sp = formatDecimal(spValue, 2);
                const ebitdaEvValue = toNumber('ebitdaEv'); if (ebitdaEvValue !== null) ebitdaEv = formatDecimal(ebitdaEvValue, 2);
                const tbpValue = toNumber('tbp'); if (tbpValue !== null) tbp = formatDecimal(tbpValue, 2);
                const bpValue = toNumber('bp'); if (bpValue !== null) bp = formatDecimal(bpValue, 2);
                const epValue = toNumber('ep'); if (epValue !== null) ep = formatDecimal(epValue, 2);
                const cfopValue = toNumber('cfop'); if (cfopValue !== null) cfop = formatDecimal(cfopValue, 2);
                const sfcfpValue = toNumber('sfcfp'); if (sfcfpValue !== null) sfcfp = formatDecimal(sfcfpValue, 2);

                const tq = topQuotes[ticker] || {};
                const lastCandidates = [tq.last, tq.tngoLast];
                const lastVal = lastCandidates.find(v => v != null && !Number.isNaN(Number(v)));
                const last = lastVal != null ? Number(lastVal) : null;

                const changeInfo = changeMap[ticker] || {};
                const prevClose = changeInfo.prevClose != null ? Number(changeInfo.prevClose) : null;
                const todayClose = changeInfo.todayClose != null ? Number(changeInfo.todayClose) : null;
                let change = '-';
                if (todayClose != null && prevClose != null && !Number.isNaN(todayClose) && !Number.isNaN(prevClose) && prevClose !== 0) {
                    const diff = todayClose - prevClose;
                    change = formatPercent((diff / prevClose) * 100);
                }
                // Price fallback order: last -> todayClose -> prevClose -> '-'
                let price = '-';
                if (last != null && !Number.isNaN(last)) {
                    price = formatUsd(last);
                } else if (todayClose != null && !Number.isNaN(todayClose)) {
                    price = formatUsd(todayClose);
                } else if (prevClose != null && !Number.isNaN(prevClose)) {
                    price = formatUsd(prevClose);
                }
                const company = tq.name || ticker;
                return {
                    id: idx,
                    ticker,
                    company,
                    chartData: [],
                    price,
                    change,
                    marketCap,
                    sp,
                    ebitdaEv,
                    tbp,
                    bp,
                    ep,
                    cfop,
                    sfcfp,
                    prevClose,
                    onDelete: handleDeleteTicker
                };
            });
            setRows(initialRows);
            // Restore intraday fetch for charts (per-ticker)
            const fetched = {};
            portfolio.forEach((ticker, idx) => {
                if (fetched[ticker]) return;
                fetched[ticker] = true;
                (async () => {
                    try {
                        const intradayResp = await axios.get(API_ENDPOINTS.INTRADAY(ticker));
                        const intradayData = intradayResp.data;
                        const chartData = (intradayData.intraday || [])
                            .map(point => {
                                const value = point && point.close !== undefined ? Number(point.close) : Number(point?.last);
                                return Number.isNaN(value) ? null : value;
                            })
                            .filter(value => value !== null);
                        setRows(prev => {
                            if (!prev[idx]) return prev;
                            const updated = { ...prev[idx], chartData };
                            if (JSON.stringify(prev[idx]) === JSON.stringify(updated)) return prev;
                            const copy = prev.slice();
                            copy[idx] = updated;
                            return copy;
                        });
                    } catch (e) {
                        // ignore chart errors
                    }
                })();
            });
        }
        if (portfolio.length > 0) {
            fetchPortfolioData();
        } else {
            setRows([]);
        }
    }, [portfolio]);

    // Search handlers now handled in AppNavbar

    return (
        <Container className="py-3"> {/* remove container if want to max out width of the grid */}
            <Card className="shadow-sm p-3">
                <CardBody>
                    <CardTitle tag="h3" className="mb-3">Portfolio</CardTitle>
                    <ReactTabulator
                        data={rows}
                        columns={columns}
                        layout="fitData"
                        options={{
                            movableColumns: true,
                            tooltips: true
                        }}
                    />
                </CardBody>
            </Card>
        </Container>
    );
};

export default PortfolioPage;
