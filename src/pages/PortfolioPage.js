import { useState, useEffect, useRef } from 'react';
import { Grid } from '@svar-ui/react-grid';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import 'bootstrap/dist/css/bootstrap.min.css';
import ApexCharts from 'react-apexcharts';

// Attach MiniChart as the cell renderer for the 'chart' column
function MiniChart({ row }) {
    // Accepts { row } prop from SVAR React Grid cell renderer
    const data = row && row.chartData ? row.chartData : [];
    const prevClose = row && row.prevClose;
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
                prevCloseLine ? { name: 'Prev Close', data: prevCloseLine, stroke: { dashArray: 4 }, color: '#888' } : null
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

const columns = [
    { id: 'ticker', width: 180, cell: tickerCellRenderer },
    { id: 'chart', width: 120, cell: MiniChart },
    { id: 'price', width: 100 },
    { id: 'change', width: 100 },
    { id: 'marketCap', width: 120 },
    { id: 'sp', width: 80 },
    { id: 'ebitdaEv', width: 100 },
    { id: 'tbp', width: 80 },
    { id: 'bp', width: 80 },
    { id: 'ep', width: 80 },
    { id: 'cfop', width: 80 },
    { id: 'sfcfp', width: 80 },
];

const PortfolioPage = () => {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [portfolio, setPortfolio] = useState(() => {
        // Try to load from localStorage, else default to []
        const saved = localStorage.getItem('portfolio');
        if (saved) return JSON.parse(saved);
        return [];
    });
    const [rows, setRows] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Sync with backend and localStorage on mount, guard against duplicate calls
    const fetchPortfolioCalled = useRef(false);

    const fetchPortfolio = async () => {
        if (fetchPortfolioCalled.current) return;
        fetchPortfolioCalled.current = true;
        const res = await axios.get(API_ENDPOINTS.PORTFOLIO);
        let data = res.data;
        setPortfolio(data);
        localStorage.setItem('portfolio', JSON.stringify(data));
    };
    useEffect(() => {
        fetchPortfolio();
        // eslint-disable-next-line
    }, []);

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

                        // Fetch summary for price and company details
                        const resp = await axios.get(API_ENDPOINTS.SUMMARY(ticker));
                        const prices = resp.data.prices || [];
                        const latest = prices[0] || {};
                        const priceRaw = latest.close;
                        const priceValue = (priceRaw !== null && priceRaw !== undefined) ? Number(priceRaw) : null;
                        const price = (priceValue !== null && !Number.isNaN(priceValue)) ? formatUsd(priceValue) : '-';

                        let change = '-';
                        if (priceValue !== null && !Number.isNaN(priceValue) && prevClose !== null) {
                            const diff = priceValue - prevClose;
                            console.log('dbug', diff, prevClose);
                            change = formatPercent(diff/prevClose*100);
                        }

                        let company = latest.name || ticker;

                        // Fetch fundamentals and calculate ratios
                        let marketCap = '-';
                        let sp = '-';
                        let ebitdaEv = '-';
                        let tbp = '-';
                        let bp = '-';
                        let ep = '-';
                        let cfop = '-';
                        let sfcfp = '-';

                        try {
                            const fundResp = await axios.get(API_ENDPOINTS.FINANCIALS(ticker));
                            const metrics = fundResp.data && fundResp.data.metrics ? fundResp.data.metrics : {};
                            const toNumber = key => {
                                const value = metrics[key];
                                if (value === null || value === undefined) return null;
                                const parsed = Number(value);
                                return Number.isNaN(parsed) ? null : parsed;
                            };

                            const marketCapValue = toNumber('marketCap');
                            if (marketCapValue !== null) {
                                marketCap = formatUsd(marketCapValue, 0);
                            }

                            const salesPerShare = toNumber('salesPerShare');
                            if (salesPerShare !== null) {
                                sp = formatDecimal(salesPerShare);
                            }

                            const ebitdaToEv = toNumber('ebitdaToEv');
                            if (ebitdaToEv !== null) {
                                ebitdaEv = formatDecimal(ebitdaToEv, 2);
                            }

                            const tangibleBookPerShare = toNumber('tangibleBookPerShare');
                            if (tangibleBookPerShare !== null) {
                                tbp = formatDecimal(tangibleBookPerShare, 2);
                            }

                            const bookPerShare = toNumber('bookPerShare');
                            if (bookPerShare !== null) {
                                bp = formatDecimal(bookPerShare, 2);
                            }

                            const earningsPerShare = toNumber('earningsPerShare');
                            if (earningsPerShare !== null) {
                                ep = formatDecimal(earningsPerShare, 2);
                            }

                            const cashFlowOpsPerShare = toNumber('cashFlowOpsPerShare');
                            if (cashFlowOpsPerShare !== null) {
                                cfop = formatDecimal(cashFlowOpsPerShare, 2);
                            }

                            const sfcfPerShare = toNumber('sfcfPerShare');
                            if (sfcfPerShare !== null) {
                                sfcfp = formatDecimal(sfcfPerShare, 2);
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
            // if (!cancelled) {
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
                    prevClose: row.prevClose
                }))
            );
            // }
        }
        if (portfolio.length > 0) {
            fetchPortfolioData();
        }
        else {
            setRows([]);
        }
        // return () => { cancelled = true; };
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
        // Add to backend
        axios.post(API_ENDPOINTS.PORTFOLIO, { ticker }).then(() => {
            setPortfolio(prev => {
                const updated = [...new Set([...prev, ticker])];
                localStorage.setItem('portfolio', JSON.stringify(updated));
                return updated;
            });
            // Ensure localStorage is updated immediately
            localStorage.setItem('portfolio', JSON.stringify([...new Set([...portfolio, ticker])]));
            setDropdownOpen(false);
            setSearch('');
        });
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
