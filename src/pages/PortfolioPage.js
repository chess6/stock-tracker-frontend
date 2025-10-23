import { useState, useEffect, useRef, useMemo } from 'react';
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
    // Column tooltips for Tabulator
    const columnTooltips = {
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
    };
    // Search bar and results now handled in AppNavbar
    const [portfolio, setPortfolio] = useState(() => {
        // Try to load from localStorage, else default to []
        return JSON.parse(localStorage.getItem("portfolio")) || []
    });
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
            title: 'Ticker', field: 'ticker', width: 180, headerTooltip: columnTooltips.ticker, sorter: 'string', formatter: (cell) => {
                const row = cell.getRow().getData();
                return `<div><strong>${row.ticker}</strong>${row.company ? `<div class='text-muted'>${row.company}</div>` : ''}</div>`;
            }
        },
        // { title: 'Chart', field: 'chartData', width: 120, headerTooltip: 'Intraday price chart', formatter: tabulatorMiniChartFormatter }, // don't remove yet
        { title: 'Price', field: 'price', width: 100, headerTooltip: columnTooltips.price, sorter: 'string' },
        { title: 'Change', field: 'change', width: 100, headerTooltip: columnTooltips.change },
        { title: 'Market Cap', field: 'marketCap', width: 120, headerTooltip: columnTooltips.marketCap },
        { title: 'SP', field: 'sp', width: 80, headerTooltip: columnTooltips.sp },
        { title: 'EBITDA/EV', field: 'ebitdaEv', width: 100, headerTooltip: columnTooltips.ebitdaEv },
        { title: 'TBP', field: 'tbp', width: 80, headerTooltip: columnTooltips.tbp },
        { title: 'BP', field: 'bp', width: 80, headerTooltip: columnTooltips.bp },
        { title: 'EP', field: 'ep', width: 80, headerTooltip: columnTooltips.ep },
        { title: 'CFOP', field: 'cfop', width: 80, headerTooltip: columnTooltips.cfop },
        { title: 'SFCFP', field: 'sfcfp', width: 80, headerTooltip: columnTooltips.sfcfp },
        {
            title: 'Delete row?', field: 'delete', width: 100, headerTooltip: columnTooltips.delete,
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
    ], [MemoDeleteButton]);

    // Handler to delete ticker from portfolio
    const handleDeleteTicker = async ticker => {
        setPortfolio(prev => {
            const updated = prev.filter(t => t !== ticker);
            localStorage.setItem('portfolio', JSON.stringify(updated));
            return updated;
        });
    };

    // Dropdown state now handled in AppNavbar

    // Guard summary fetch against duplicate calls (Strict Mode)
    const fetchSummaryCalled = useRef({});


    useEffect(() => {
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        // let cancelled = false;
        async function fetchPortfolioData() {
            // Fetch all financials for tickers in one request
            let metricsMap = {};
            if (portfolio.length > 0) {
                try {
                    const tickersStr = portfolio.join(',');
                    const fundResp = await axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}&mostRecent=true`);
                    metricsMap = fundResp.data && fundResp.data.metrics ? fundResp.data.metrics : {};
                } catch (e) {
                    metricsMap = {};
                }
            }
            // Render grid immediately with financials data only
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
                if (marketCapValue !== null) {
                    marketCap = formatUsd(marketCapValue, 0);
                }
                const spValue = toNumber('sp');
                if (spValue !== null) {
                    sp = formatDecimal(spValue, 2);
                }
                const ebitdaEvValue = toNumber('ebitdaEv');
                if (ebitdaEvValue !== null) {
                    ebitdaEv = formatDecimal(ebitdaEvValue, 2);
                }
                const tbpValue = toNumber('tbp');
                if (tbpValue !== null) {
                    tbp = formatDecimal(tbpValue, 2);
                }
                const bpValue = toNumber('bp');
                if (bpValue !== null) {
                    bp = formatDecimal(bpValue, 2);
                }
                const epValue = toNumber('ep');
                if (epValue !== null) {
                    ep = formatDecimal(epValue, 2);
                }
                const cfopValue = toNumber('cfop');
                if (cfopValue !== null) {
                    cfop = formatDecimal(cfopValue, 2);
                }
                const sfcfpValue = toNumber('sfcfp');
                if (sfcfpValue !== null) {
                    sfcfp = formatDecimal(sfcfpValue, 2);
                }
                return {
                    id: idx,
                    ticker,
                    company: ticker,
                    chartData: [],
                    price: '-',
                    change: '-',
                    marketCap,
                    sp,
                    ebitdaEv,
                    tbp,
                    bp,
                    ep,
                    cfop,
                    sfcfp,
                    prevClose: null,
                    onDelete: handleDeleteTicker
                };
            });
            setRows(initialRows);
            // Now asynchronously fetch summary and intraday data for each ticker and update rows
            // Track which tickers have already been fetched to prevent double API calls
            const fetchedTickers = {};
            portfolio.forEach((ticker, idx) => {
                if (fetchedTickers[ticker]) return;
                fetchedTickers[ticker] = true;
                (async () => {
                    // ...existing code for async fetch and row update...
                    let chartData = [];
                    let prevClose = null;
                    try {
                        const intradayResp = await axios.get(API_ENDPOINTS.INTRADAY(ticker));
                        const intradayData = intradayResp.data;
                        chartData = (intradayData.intraday || [])
                            .map(point => {
                                const value = point && point.close !== undefined ? Number(point.close) : Number(point?.last);
                                return Number.isNaN(value) ? null : value;
                            })
                            .filter(value => value !== null);
                        const prev = intradayData.prevClose;
                        if (prev !== null && prev !== undefined) {
                            const parsedPrev = Number(prev);
                            prevClose = Number.isNaN(parsedPrev) ? null : parsedPrev;
                        }
                    } catch (e) {
                        chartData = [];
                        prevClose = null;
                    }
                    let price = '-';
                    let change = '-';
                    let company = ticker;
                    try {
                        const resp = await axios.get(API_ENDPOINTS.SUMMARY(ticker));
                        const prices = resp.data.prices || [];
                        const latest = prices[0] || {};
                        const priceRaw = latest.close;
                        const priceValue = (priceRaw !== null && priceRaw !== undefined) ? Number(priceRaw) : null;
                        price = (priceValue !== null && !Number.isNaN(priceValue)) ? formatUsd(priceValue) : '-';
                        if (priceValue !== null && !Number.isNaN(priceValue) && prevClose !== null) {
                            const diff = priceValue - prevClose;
                            change = formatPercent(diff / prevClose * 100);
                        }
                        if (resp.data && resp.data.meta && resp.data.meta.name) {
                            company = resp.data.meta.name;
                        }
                    } catch (e) {
                        // leave as default
                    }
                    setRows(prevRows => {
                        if (!prevRows[idx]) return prevRows;
                        const updatedRow = {
                            ...prevRows[idx],
                            price,
                            change,
                            company,
                            chartData,
                            prevClose
                        };
                        if (JSON.stringify(prevRows[idx]) === JSON.stringify(updatedRow)) return prevRows;
                        const newRows = prevRows.slice();
                        newRows[idx] = updatedRow;
                        return newRows;
                    });
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
