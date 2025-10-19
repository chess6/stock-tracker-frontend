import { useState, useEffect, useRef, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Grid } from '@svar-ui/react-grid';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import ApexCharts from 'react-apexcharts';

// Attach MiniChart as the cell renderer for the 'chart' column
function MiniChart({ row }) {
    // Accepts { row } prop from SVAR React Grid cell renderer
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

function tickerCellRenderer({ row }) {
    return (
        <div>
            <div><strong>{row.ticker}</strong></div>
            {row.company && <div className="text-muted">{row.company}</div>}
        </div>
    );
}

function deleteButtonCellRenderer({ row }) {
    return (
        <button
            className="btn btn-sm btn-danger"
            style={{ marginLeft: 8 }}
            onClick={e => {
                e.stopPropagation();
                if (window.confirm(`Remove ${row.ticker} from portfolio?`)) {
                    if (typeof row.onDelete === 'function') row.onDelete(row.ticker);
                }
            }}
        >
            <FontAwesomeIcon icon={faTrash} />
        </button>
    );
}



const PortfolioPage = () => {
    // Column tooltips for SVAR Grid
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
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [portfolio, setPortfolio] = useState(() => {
        // Try to load from localStorage, else default to []
        return JSON.parse(localStorage.getItem("portfolio")) || []
    });
    const [rows, setRows] = useState([]);
    const columns = useMemo(() => [
    { id: 'ticker', width: 180, cell: tickerCellRenderer, sort: true, tooltip: columnTooltips.ticker },
    // { id: 'chart', width: 120, cell: MiniChart },
    { id: 'price', width: 100, sort: true, tooltip: columnTooltips.price },
    { id: 'change', width: 100, tooltip: columnTooltips.change },
    { id: 'marketCap', width: 120, tooltip: columnTooltips.marketCap },
    { id: 'sp', width: 80, tooltip: columnTooltips.sp },
    { id: 'ebitdaEv', width: 100, tooltip: columnTooltips.ebitdaEv },
    { id: 'tbp', width: 80, tooltip: columnTooltips.tbp },
    { id: 'bp', width: 80, tooltip: columnTooltips.bp },
    { id: 'ep', width: 80, tooltip: columnTooltips.ep },
    { id: 'cfop', width: 80, tooltip: columnTooltips.cfop },
    { id: 'sfcfp', width: 80, tooltip: columnTooltips.sfcfp },
    { id: 'delete', width: 80, cell: deleteButtonCellRenderer, tooltip: columnTooltips.delete },
    ], []);

    // Handler to delete ticker from portfolio
    const handleDeleteTicker = async ticker => {
        setPortfolio(prev => {
            const updated = prev.filter(t => t !== ticker);
            localStorage.setItem('portfolio', JSON.stringify(updated));
            return updated;
        });
    };

    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Guard summary fetch against duplicate calls (Strict Mode)
    const fetchSummaryCalled = useRef({});

    const formatUsd = (value, fractionDigits = 2) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        }).format(Number(value));
    };

    const formatDecimal = (value, fractionDigits = 2) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
        return Number(value).toFixed(fractionDigits);
    };

    const formatPercent = (value, fractionDigits = 2) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
        return Number(value).toFixed(fractionDigits) + '%';
    };

    useEffect(() => {
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
        // let cancelled = false;
        async function fetchPortfolioData() {
            // Fetch all financials for tickers in one request
            let metricsMap = {};
            if (portfolio.length > 0) {
                try {
                    const tickersStr = portfolio.join(',');
                    const fundResp = await axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=${tickersStr}`);
                    metricsMap = fundResp.data && fundResp.data.metrics ? fundResp.data.metrics : {};
                } catch (e) {
                    metricsMap = {};
                }
            }
            const data = await Promise.all(
                portfolio.map(async ticker => {
                    if (fetchSummaryCalled.current[ticker]) return fetchSummaryCalled.current[ticker];
                    const promise = (async () => {
                        // Fetch intraday prices for chart and previous close
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


                        // Fetch summary for price and company meta
                        const resp = await axios.get(API_ENDPOINTS.SUMMARY(ticker));
                        const prices = resp.data.prices || [];
                        const latest = prices[0] || {};
                        const priceRaw = latest.close;
                        const priceValue = (priceRaw !== null && priceRaw !== undefined) ? Number(priceRaw) : null;
                        const price = (priceValue !== null && !Number.isNaN(priceValue)) ? formatUsd(priceValue) : '-';

                        let change = '-';
                        if (priceValue !== null && !Number.isNaN(priceValue) && prevClose !== null) {
                            const diff = priceValue - prevClose;
                            change = formatPercent(diff / prevClose * 100);
                        }

                        // Use company name from summary meta
                        let company = ticker;
                        if (resp.data && resp.data.meta && resp.data.meta.name) {
                            company = resp.data.meta.name;
                        }

                        // Use metricsMap for fundamentals and ratios
                        let marketCap = '-';
                        let sp = '-';
                        let ebitdaEv = '-';
                        let tbp = '-';
                        let bp = '-';
                        let ep = '-';
                        let cfop = '-';
                        let sfcfp = '-';

                        try {
                            const metrics = metricsMap[ticker] || {};
                            const toNumber = key => {
                                const value = metrics[key];
                                if (value === null || value === undefined) return null;
                                const parsed = Number(value);
                                return Number.isNaN(parsed) ? null : parsed;
                            };

                            // NASDAQ keys
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
                        } catch (e) {
                            // Leave defaults as '-'
                        }

                        return {
                            ticker,
                            company,
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
                            chartData,
                            prevClose,
                        };
                    })();
                    fetchSummaryCalled.current[ticker] = promise;
                    return promise;
                })
            );
            setRows(
                data.map((row, idx) => ({
                    id: idx,
                    ticker: row.ticker,
                    company: row.company,
                    chartData: row.chartData,
                    price: row.price,
                    change: row.change,
                    marketCap: row.marketCap,
                    sp: row.sp,
                    ebitdaEv: row.ebitdaEv,
                    tbp: row.tbp,
                    bp: row.bp,
                    ep: row.ep,
                    cfop: row.cfop,
                    sfcfp: row.sfcfp,
                    prevClose: row.prevClose,
                    onDelete: handleDeleteTicker
                }))
            );
        }
        if (portfolio.length > 0) {
            fetchPortfolioData();
        }
        else {
            setRows([]);
        }
    }, [portfolio]);

    // Debounce timer for search (only call API for latest value)
    const searchTimeoutRef = useRef();
    const latestSearchValue = useRef('');
    const handleSearchChange = e => {
        const value = e.target.value;
        setSearch(value);
        latestSearchValue.current = value;
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (value.length > 1) {
            searchTimeoutRef.current = setTimeout(async () => {
                // Only call API if value hasn't changed and not empty
                if (latestSearchValue.current === value && value.trim() !== '') {
                    const res = await axios.get(`${API_ENDPOINTS.SEARCH}?q=${value}`);
                    setSearchResults(res.data);
                    setDropdownOpen(true);
                }
            }, 1000);
        } else {
            setDropdownOpen(false);
            setSearchResults([]);
        }
    };

    const handleAddToPortfolio = ticker => {
        // Add to localstorage
        setPortfolio(prev => {
            const updated = [...new Set([...prev, ticker])];
            localStorage.setItem('portfolio', JSON.stringify(updated));
            return updated;
        });
        // Ensure localStorage is updated immediately
        localStorage.setItem('portfolio', JSON.stringify([...new Set([...portfolio, ticker])]));
        setDropdownOpen(false);
        setSearch('');
    };

    const handleSearchTicker = ticker => {
        window.location.href = `/${ticker}`;
    };

    return (
        <>
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
                <div className="container-fluid">
                    <span className="navbar-brand">Stock Portfolio</span>
                </div>
            </nav>
            <div className="container">
                <div className="row justify-content-center mb-4">
                    <div className="col-md-6">
                        <div className="card shadow-sm p-3">
                            <h2 className="mb-3">Add/Search Ticker</h2>
                            <input
                                type="text"
                                className="form-control mb-2"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search or add ticker/company name"
                            />
                            {dropdownOpen && searchResults.length > 0 && (
                                <div
                                    className="list-group shadow"
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        top: '100%',
                                        marginTop: 2,
                                        zIndex: 10,
                                        maxHeight: 250,
                                        overflowY: 'auto',
                                    }}
                                >
                                    {searchResults.map((item, idx) => (
                                        <div key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                            <span><strong>{item.ticker}</strong> <span className="text-muted">{item.name}</span></span>
                                            <span>
                                                <button className="btn btn-sm btn-success me-2" onClick={() => handleAddToPortfolio(item.ticker)}>Add</button>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleSearchTicker(item.ticker)}>Search</button>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card shadow-sm p-3">
                    <h2 className="mb-3">Portfolio</h2>
                    <Grid
                        data={rows}
                        columns={columns.map(col => ({
                            ...col,
                            header: col.id.charAt(0).toUpperCase() + col.id.slice(1),
                            footer: col.id.charAt(0).toUpperCase() + col.id.slice(1)
                        }))}
                        sortMarks={{ ticker: { order: "asc" }, price: { order: "asc" } }}
                        autoRowHeight={true}
                    />
                </div>
                {/* Dummy grid below portfolio grid */}
                {/* <div className="card shadow-sm p-3 mt-4">
                    <h2 className="mb-3">Dummy Grid</h2>
                    <Grid
                        data={[
                            {
                                id: 1,
                                city: "Amieshire",
                                email: "Leora13@yahoo.com",
                                firstName: "Ernest",
                                lastName: "Schuppe",
                                companyName: "Lebsack - Nicolas",
                                chartData: [210, 212, 215, 213, 218, 220, 217],
                            },
                            {
                                id: 2,
                                city: "Gust",
                                email: "Mose_Gerhold51@yahoo.com",
                                firstName: "Janis",
                                lastName: "Vandervort",
                                companyName: "Glover - Hermiston",
                                chartData: [210, 212, 215, 213, 218, 220, 217],
                            },
                        ]}
                        columns={[
                            { id: "id", width: 50 },
                            { id: "city", width: 100, header: "City", footer: "City" },
                            { id: "firstName", header: "First Name", footer: "First Name", width: 150 },
                            { id: "lastName", header: "Last Name", footer: "Last Name", width: 150 },
                            { id: "email", header: "Email", footer: "Email" },
                            { id: "companyName", header: "Company", footer: "Company" },
                            { id: "chart", header: "Chart", footer: "Chart", cell: MiniChart },
                        ]}
                    />
                </div> */}
            </div>
        </>
    );
    // ...existing code...
};

export default PortfolioPage;
