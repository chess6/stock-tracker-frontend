import { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
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
            }, tooltip: function (cell) {
        let data = cell.getRow();
        return "Value of " + data._row.data.company;
      }
        },
        { title: 'Chart', field: 'chartData', width: 120, headerTooltip: 'Intraday price chart', formatter: tabulatorMiniChartFormatter }, // don't remove yet
        { title: 'Price', field: 'price', headerTooltip: columnTooltips.price, sorter: 'string', formatter: (cell) => formatUsd(cell.getValue()) },
        { title: 'Change', field: 'change', headerTooltip: columnTooltips.change, formatter: (cell) => formatPercent(cell.getValue()) },
        { title: 'Market Cap', field: 'marketCap', headerTooltip: columnTooltips.marketCap, formatter: (cell) => formatUsd(cell.getValue(), 0) },
        { title: 'SP', field: 'sp', headerTooltip: columnTooltips.sp, formatter: (cell) => formatDecimal(cell.getValue(), 2) },
        { title: 'Eb/EV', field: 'ebitdaEv', headerTooltip: columnTooltips.ebitdaEv, formatter: (cell) => formatDecimal(cell.getValue(), 2) },
        { title: 'TBP', field: 'tbp', headerTooltip: columnTooltips.tbp, formatter: (cell) => formatDecimal(cell.getValue(), 2) },
        { title: 'BP', field: 'bp', headerTooltip: columnTooltips.bp, formatter: (cell) => formatDecimal(cell.getValue(), 2) },
        { title: 'EP', field: 'ep', headerTooltip: columnTooltips.ep, formatter: (cell) => formatDecimal(cell.getValue(), 2) },
        { title: 'CFOP', field: 'cfop', headerTooltip: columnTooltips.cfop, formatter: (cell) => formatDecimal(cell.getValue(), 2) },
        { title: 'SFCFP', field: 'sfcfp', headerTooltip: columnTooltips.sfcfp, formatter: (cell) => formatDecimal(cell.getValue(), 2) },
        {
            title: 'Delete row?', field: 'delete', headerTooltip: columnTooltips.delete,
            formatter: function (cell, formatterParams, onRendered) {
                const cellElement = cell.getElement();
                const row = cell.getRow().getData();
                onRendered(() => {
                    if (cellElement._reactRoot) {
                        cellElement._reactRoot.unmount();
                    }
                    const root = createRoot(cellElement);
                    cellElement._reactRoot = root;
                    root.render(<MemoDeleteButton ticker={row.ticker} onDelete={row.onDelete} />);
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
            let intradayMap = {};
            if (portfolio.length > 0) {
                const tickersStr = portfolio.join(',');
                const [fundRes, topRes, changeRes, ...intradayResArr] = await Promise.allSettled([
                    axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&mostRecent=true`),
                    axios.get(API_ENDPOINTS.TOP_OF_BOOK, { params: { tickers: tickersStr } }),
                    axios.get(API_ENDPOINTS.DAILY_CHANGE, { params: { tickers: tickersStr } }),
                    ...portfolio.map(ticker => axios.get(API_ENDPOINTS.INTRADAY(ticker)))
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
                // Collect intraday data for each ticker
                portfolio.forEach((ticker, idx) => {
                    const res = intradayResArr[idx];
                    if (res && res.status === 'fulfilled') {
                        const intradayData = res.value.data;
                        // Store both intraday and tickerMeta
                        intradayMap[ticker] = {
                            intraday: (intradayData.intraday || []).map(point => {
                                const value = point && point.close !== undefined ? Number(point.close) : Number(point?.last);
                                return Number.isNaN(value) ? null : value;
                            }).filter(value => value !== null),
                            tickerMeta: intradayData.tickerMeta || null
                        };
                    } else {
                        intradayMap[ticker] = { intraday: [], tickerMeta: null };
                    }
                });
            }
            const initialRows = portfolio.map((ticker, idx) => {
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

                const changeInfo = changeMap[ticker] || {};
                const prevClose = changeInfo.prevClose != null ? Number(changeInfo.prevClose) : null;
                const todayClose = changeInfo.todayClose != null ? Number(changeInfo.todayClose) : null;
                let change = null;
                if (todayClose != null && prevClose != null && !Number.isNaN(todayClose) && !Number.isNaN(prevClose) && prevClose !== 0) {
                    const diff = todayClose - prevClose;
                    change = (diff / prevClose) * 100;
                }
                // Price fallback order: last -> todayClose -> prevClose -> null
                let price = null;
                if (last != null && !Number.isNaN(last)) {
                    price = last;
                } else if (todayClose != null && !Number.isNaN(todayClose)) {
                    price = todayClose;
                } else if (prevClose != null && !Number.isNaN(prevClose)) {
                    price = prevClose;
                }
                // Use company name from tickerMeta if available, else fallback
                let company = ticker;
                const meta = intradayMap[ticker] && intradayMap[ticker].tickerMeta ? intradayMap[ticker].tickerMeta : null;
                if (meta && meta.name) {
                    company = meta.name;
                } else if (tq.name) {
                    company = tq.name;
                }
                // chartData: always use intradayMap[ticker].intraday if present
                let chartData = [];
                if (intradayMap[ticker] && Array.isArray(intradayMap[ticker].intraday)) {
                    chartData = intradayMap[ticker].intraday;
                }
                return {
                    id: idx,
                    ticker,
                    company,
                    chartData,
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
