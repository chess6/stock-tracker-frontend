import React, { useEffect, useState } from 'react';
import { Table } from 'reactstrap';
import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';
import { formatUsd, formatDecimal, formatPercent } from '../utils/formatters';
import { formatShares } from '../utils/formatters';

// Column metadata from NASDAQ API response
const columns = [
    { name: 'ticker', fullName: 'Ticker Symbol', description: 'Stock ticker symbol (e.g., MSFT, AAPL).', formula: '' },
    { name: 'dimension', fullName: 'Dimension', description: 'Reporting dimension (e.g., ARY for annual, QTR for quarterly).', formula: '' },
    { name: 'calendardate', fullName: 'Calendar Date', description: 'End date of the reporting period (YYYY-MM-DD).', formula: '' },
    { name: 'datekey', fullName: 'Date Key', description: 'Date the financials were reported or keyed.', formula: '' },
    { name: 'reportperiod', fullName: 'Report Period', description: 'Fiscal period end date for the report.', formula: '' },
    { name: 'fiscalperiod', fullName: 'Fiscal Period', description: 'Fiscal period label (e.g., 2024-FY, 2024-Q4).', formula: '' },
    { name: 'lastupdated', fullName: 'Last Updated', description: 'Date the data was last updated.', formula: '' },
    { name: 'accoci', fullName: 'Accumulated Other Comprehensive Income', description: 'Total other comprehensive income.', formula: '' },
    { name: 'assets', fullName: 'Total Assets', description: 'Sum of all assets owned by the company.', formula: '' },
    { name: 'assetsavg', fullName: 'Average Assets', description: 'Average assets over the period.', formula: '(assets at period start + assets at period end) / 2' },
    { name: 'assetsc', fullName: 'Current Assets', description: 'Assets expected to be converted to cash within a year.', formula: '' },
    { name: 'assetsnc', fullName: 'Non-Current Assets', description: 'Assets not expected to be converted to cash within a year.', formula: '' },
    { name: 'assetturnover', fullName: 'Asset Turnover', description: 'Revenue generated per dollar of assets.', formula: 'revenue / assetsavg' },
    { name: 'bvps', fullName: 'Book Value Per Share', description: 'Net asset value per share.', formula: '(equity - preferred equity) / sharesbas' },
    { name: 'capex', fullName: 'Capital Expenditures', description: 'Funds used to acquire or upgrade physical assets.', formula: '' },
    { name: 'cashneq', fullName: 'Cash and Equivalents', description: 'Cash and cash equivalents.', formula: '' },
    { name: 'cashnequsd', fullName: 'Cash and Equivalents (USD)', description: 'Cash and equivalents in USD.', formula: '' },
    { name: 'cor', fullName: 'Cost of Revenue', description: 'Direct costs attributable to revenue.', formula: '' },
    { name: 'consolinc', fullName: 'Consolidated Net Income', description: 'Net income including minority interests.', formula: '' },
    { name: 'currentratio', fullName: 'Current Ratio', description: 'Liquidity ratio.', formula: 'assetsc / liabilitiesc' },
    { name: 'de', fullName: 'Debt to Equity Ratio', description: 'Leverage ratio.', formula: 'debt / equity' },
    { name: 'debt', fullName: 'Total Debt', description: 'Sum of all debts.', formula: '' },
    { name: 'debtc', fullName: 'Current Debt', description: 'Debt due within a year.', formula: '' },
    { name: 'debtnc', fullName: 'Non-Current Debt', description: 'Debt due after more than a year.', formula: '' },
    { name: 'debtusd', fullName: 'Total Debt (USD)', description: 'Total debt in USD.', formula: '' },
    { name: 'deferredrev', fullName: 'Deferred Revenue', description: 'Revenue received but not yet earned.', formula: '' },
    { name: 'depamor', fullName: 'Depreciation & Amortization', description: 'Non-cash expenses for asset value reduction.', formula: '' },
    { name: 'deposits', fullName: 'Deposits', description: 'Deposits held by the company.', formula: '' },
    { name: 'divyield', fullName: 'Dividend Yield', description: 'Annual dividend per share divided by price per share.', formula: 'dps / price' },
    { name: 'dps', fullName: 'Dividends Per Share', description: 'Dividends paid per share.', formula: '' },
    { name: 'ebit', fullName: 'Earnings Before Interest & Taxes (EBIT)', description: 'Operating profit before interest and taxes.', formula: '' },
    { name: 'ebitda', fullName: 'Earnings Before Interest, Taxes, Depreciation & Amortization (EBITDA)', description: 'Operating profit before interest, taxes, depreciation, and amortization.', formula: '' },
    { name: 'ebitdamargin', fullName: 'EBITDA Margin', description: 'EBITDA as a percentage of revenue.', formula: 'ebitda / revenue' },
    { name: 'ebitdausd', fullName: 'EBITDA (USD)', description: 'EBITDA in USD.', formula: '' },
    { name: 'ebitusd', fullName: 'EBIT (USD)', description: 'EBIT in USD.', formula: '' },
    { name: 'ebt', fullName: 'Earnings Before Tax (EBT)', description: 'Profit before tax.', formula: '' },
    { name: 'eps', fullName: 'Earnings Per Share (EPS)', description: 'Net income per share.', formula: 'netinc / sharesbas' },
    { name: 'epsdil', fullName: 'Diluted Earnings Per Share', description: 'EPS assuming all convertible securities are exercised.', formula: '' },
    { name: 'epsusd', fullName: 'EPS (USD)', description: 'EPS in USD.', formula: '' },
    { name: 'equity', fullName: 'Shareholder Equity', description: 'Total equity owned by shareholders.', formula: '' },
    { name: 'equityavg', fullName: 'Average Equity', description: 'Average equity over the period.', formula: '(equity at start + equity at end) / 2' },
    { name: 'equityusd', fullName: 'Equity (USD)', description: 'Equity in USD.', formula: '' },
    { name: 'ev', fullName: 'Enterprise Value', description: 'Total value of the company.', formula: 'marketcap + debt - cashneq' },
    { name: 'evebit', fullName: 'EV/EBIT', description: 'Enterprise value divided by EBIT.', formula: 'ev / ebit' },
    { name: 'evebitda', fullName: 'EV/EBITDA', description: 'Enterprise value divided by EBITDA.', formula: 'ev / ebitda' },
    { name: 'fcf', fullName: 'Free Cash Flow', description: 'Cash generated after capital expenditures.', formula: 'ncfo - capex' },
    { name: 'fcfps', fullName: 'Free Cash Flow Per Share', description: 'FCF divided by shares outstanding.', formula: 'fcf / sharesbas' },
    { name: 'fxusd', fullName: 'Foreign Exchange (USD)', description: 'Foreign exchange impact in USD.', formula: '' },
    { name: 'gp', fullName: 'Gross Profit', description: 'Revenue minus cost of revenue.', formula: 'revenue - cor' },
    { name: 'grossmargin', fullName: 'Gross Margin', description: 'Gross profit as a percentage of revenue.', formula: 'gp / revenue' },
    { name: 'intangibles', fullName: 'Intangible Assets', description: 'Non-physical assets (e.g., patents, goodwill).', formula: '' },
    { name: 'intexp', fullName: 'Interest Expense', description: 'Cost of borrowed funds.', formula: '' },
    { name: 'invcap', fullName: 'Invested Capital', description: 'Total capital invested in the business.', formula: '' },
    { name: 'invcapavg', fullName: 'Average Invested Capital', description: 'Average invested capital over the period.', formula: '' },
    { name: 'inventory', fullName: 'Inventory', description: 'Goods available for sale.', formula: '' },
    { name: 'investments', fullName: 'Investments', description: 'Investments held by the company.', formula: '' },
    { name: 'investmentsc', fullName: 'Current Investments', description: 'Investments expected to be liquidated within a year.', formula: '' },
    { name: 'investmentsnc', fullName: 'Non-Current Investments', description: 'Investments not expected to be liquidated within a year.', formula: '' },
    { name: 'liabilities', fullName: 'Total Liabilities', description: 'Sum of all liabilities.', formula: '' },
    { name: 'liabilitiesc', fullName: 'Current Liabilities', description: 'Liabilities due within a year.', formula: '' },
    { name: 'liabilitiesnc', fullName: 'Non-Current Liabilities', description: 'Liabilities due after more than a year.', formula: '' },
    { name: 'marketcap', fullName: 'Market Capitalization', description: 'Total market value of outstanding shares.', formula: 'price * sharesbas' },
    { name: 'ncf', fullName: 'Net Cash Flow', description: 'Total net cash flow for the period.', formula: '' },
    { name: 'ncfbus', fullName: 'Net Cash Flow from Business', description: 'Net cash flow from business operations.', formula: '' },
    { name: 'ncfcommon', fullName: 'Net Cash Flow to Common', description: 'Net cash flow to common shareholders.', formula: '' },
    { name: 'ncfdebt', fullName: 'Net Cash Flow from Debt', description: 'Net cash flow from debt activities.', formula: '' },
    { name: 'ncfdiv', fullName: 'Net Cash Flow from Dividends', description: 'Net cash flow from dividend payments.', formula: '' },
    { name: 'ncff', fullName: 'Net Cash Flow from Financing', description: 'Net cash flow from financing activities.', formula: '' },
    { name: 'ncfi', fullName: 'Net Cash Flow from Investing', description: 'Net cash flow from investing activities.', formula: '' },
    { name: 'ncfinv', fullName: 'Net Cash Flow from Investments', description: 'Net cash flow from investment activities.', formula: '' },
    { name: 'ncfo', fullName: 'Net Cash Flow from Operations', description: 'Net cash flow from operating activities.', formula: '' },
    { name: 'ncfx', fullName: 'Net Cash Flow from Foreign Exchange', description: 'Net cash flow from foreign exchange.', formula: '' },
    { name: 'netinc', fullName: 'Net Income', description: 'Total net income for the period.', formula: '' },
    { name: 'netinccmn', fullName: 'Net Income to Common', description: 'Net income attributable to common shareholders.', formula: '' },
    { name: 'netinccmnusd', fullName: 'Net Income to Common (USD)', description: 'Net income to common shareholders in USD.', formula: '' },
    { name: 'netincdis', fullName: 'Net Income Discontinued Ops', description: 'Net income from discontinued operations.', formula: '' },
    { name: 'netincnci', fullName: 'Net Income Non-Controlling Interest', description: 'Net income attributable to non-controlling interests.', formula: '' },
    { name: 'netmargin', fullName: 'Net Margin', description: 'Net income as a percentage of revenue.', formula: 'netinc / revenue' },
    { name: 'opex', fullName: 'Operating Expenses', description: 'Total operating expenses.', formula: '' },
    { name: 'opinc', fullName: 'Operating Income', description: 'Income from operations.', formula: '' },
    { name: 'payables', fullName: 'Payables', description: 'Amounts owed to suppliers.', formula: '' },
    { name: 'payoutratio', fullName: 'Payout Ratio', description: 'Proportion of earnings paid out as dividends.', formula: 'dps / eps' },
    { name: 'pb', fullName: 'Price to Book Ratio', description: 'Market price per share divided by book value per share.', formula: 'price / bvps' },
    { name: 'pe', fullName: 'Price to Earnings Ratio', description: 'Market price per share divided by earnings per share.', formula: 'price / eps' },
    { name: 'pe1', fullName: 'Forward Price to Earnings Ratio', description: 'Forward-looking price to earnings ratio.', formula: '' },
    { name: 'ppnenet', fullName: 'Property, Plant & Equipment Net', description: 'Net value of property, plant, and equipment.', formula: '' },
    { name: 'prefdivis', fullName: 'Preferred Dividends', description: 'Dividends paid to preferred shareholders.', formula: '' },
    { name: 'price', fullName: 'Share Price', description: 'Market price per share.', formula: '' },
    { name: 'ps', fullName: 'Price to Sales Ratio', description: 'Market price per share divided by sales per share.', formula: 'price / sps' },
    { name: 'ps1', fullName: 'Forward Price to Sales Ratio', description: 'Forward-looking price to sales ratio.', formula: '' },
    { name: 'receivables', fullName: 'Receivables', description: 'Amounts owed to the company.', formula: '' },
    { name: 'retearn', fullName: 'Retained Earnings', description: 'Cumulative net income retained by the company.', formula: '' },
    { name: 'revenue', fullName: 'Revenue', description: 'Total revenue for the period.', formula: '' },
    { name: 'revenueusd', fullName: 'Revenue (USD)', description: 'Revenue in USD.', formula: '' },
    { name: 'rnd', fullName: 'Research & Development Expense', description: 'Expenses for research and development.', formula: '' },
    { name: 'roa', fullName: 'Return on Assets', description: 'Net income divided by average assets.', formula: 'netinc / assetsavg' },
    { name: 'roe', fullName: 'Return on Equity', description: 'Net income divided by average equity.', formula: 'netinc / equityavg' },
    { name: 'roic', fullName: 'Return on Invested Capital', description: 'Net income divided by invested capital.', formula: 'netinc / invcap' },
    { name: 'ros', fullName: 'Return on Sales', description: 'Net income divided by revenue.', formula: 'netinc / revenue' },
    { name: 'sbcomp', fullName: 'Stock-Based Compensation', description: 'Compensation paid in stock.', formula: '' },
    { name: 'sgna', fullName: 'Selling, General & Admin Expense', description: 'SG&A expenses.', formula: '' },
    { name: 'sharefactor', fullName: 'Share Factor', description: 'Adjustment factor for shares.', formula: '' },
    { name: 'sharesbas', fullName: 'Basic Shares Outstanding', description: 'Number of basic shares outstanding.', formula: '' },
    { name: 'shareswa', fullName: 'Weighted Average Shares', description: 'Weighted average shares outstanding.', formula: '' },
    { name: 'shareswadil', fullName: 'Weighted Average Diluted Shares', description: 'Weighted average diluted shares outstanding.', formula: '' },
    { name: 'sps', fullName: 'Sales Per Share', description: 'Revenue per share.', formula: 'revenue / sharesbas' },
    { name: 'tangibles', fullName: 'Tangible Assets', description: 'Physical assets owned by the company.', formula: '' },
    { name: 'taxassets', fullName: 'Tax Assets', description: 'Assets related to taxes.', formula: '' },
    { name: 'taxexp', fullName: 'Tax Expense', description: 'Total tax expense for the period.', formula: '' },
    { name: 'taxliabilities', fullName: 'Tax Liabilities', description: 'Liabilities related to taxes.', formula: '' },
    { name: 'tbvps', fullName: 'Tangible Book Value Per Share', description: 'Tangible book value per share.', formula: '' },
    { name: 'workingcapital', fullName: 'Working Capital', description: 'Current assets minus current liabilities.', formula: 'assetsc - liabilitiesc' }
];


function NasdaqColumnsGrid() {
    const [examples, setExamples] = useState({});

    // Helper to format example values based on column name/type
    function formatExample(name, value) {
        if (value === null || value === undefined) return '';
        // Currency fields
        const usdFields = [
            'accoci', 'assets', 'assetsavg', 'assetsc', 'assetsnc', 'cashneq', 'cashnequsd', 'debt', 'debtc', 'debtnc', 'debtusd', 'deferredrev',
            'equity', 'equityavg', 'equityusd', 'ev', 'fcf', 'gp', 'intangibles', 'inventory', 'investments', 'investmentsc', 'investmentsnc',
            'liabilities', 'liabilitiesc', 'liabilitiesnc', 'marketcap', 'ncf', 'ncfbus', 'ncfcommon', 'ncfdebt', 'ncfdiv', 'ncff', 'ncfi', 'ncfinv', 'ncfo',
            'netinc', 'netinccmn', 'netinccmnusd', 'netincdis', 'netincnci', 'opex', 'opinc', 'payables', 'ppnenet', 'prefdivis',
            'receivables', 'retearn', 'revenue', 'revenueusd', 'rnd', 'sbcomp', 'sgna', 'tangibles', 'taxassets', 'taxexp',
            'taxliabilities', 'workingcapital', 'capex', 'depamor', 'deposits', 'intexp', 'invcap', 'invcapavg', 'cor', 'consolinc', 'ebit', 'ebitda', 'ebitdausd', 'ebitusd', 'ebt'
        ];
        // Shares fields
        const sharesFields = ['sharesbas', 'shareswa', 'shareswadil'];
    if (sharesFields.includes(name)) return formatShares(value);
        // Percent fields
        const percentFields = [
            'assetturnover', 'currentratio', 'de', 'divyield', 'ebitdamargin', 'fcfps', 'grossmargin', 'netmargin', 'payoutratio', 'pb', 'pe', 'pe1', 'ps', 'ps1', 'roa', 'roe', 'roic', 'ros', 'sharefactor', 'evebitda', 'tbvps'
        ];
        // Decimal fields
        const decimalFields = [
            'bvps', 'eps', 'epsdil', 'epsusd', 'price', 'sps', 'evebit', 'evebitda', 'fcfps', 'pb', 'pe', 'pe1', 'ps', 'ps1', 'tbvps', 'fxusd'
        ];

        if (usdFields.includes(name)) return formatUsd(value, 0);
        if (percentFields.includes(name)) return formatPercent(value);
        if (decimalFields.includes(name)) return formatDecimal(value);
        // Dates
        if (name.toLowerCase().includes('date')) return String(value);
        // Text fields
        if (typeof value === 'string') return value;
        // Fallback
        return String(value);
    }

    useEffect(() => {
        async function fetchExamples() {
            try {
                const resp = await axios.get(`${API_ENDPOINTS.FINANCIALS}?ticker=AAPL&domain=ARY&mostRecent=true`);
                // If response is in datatable format, map columns to values
                if (resp.data?.raw?.datatable?.columns && resp.data?.raw?.datatable?.data?.length > 0) {
                    const meta = resp.data.raw.datatable.columns;
                    const dataRow = resp.data.raw.datatable.data[0];
                    const mapped = {};
                    meta.forEach((col, idx) => {
                        mapped[col.name] = dataRow[idx];
                    });
                    setExamples(mapped);
                } else if (Array.isArray(resp.data) && resp.data.length > 0) {
                    setExamples(resp.data[0]);
                } else if (resp.data && typeof resp.data === 'object') {
                    setExamples(resp.data);
                }
            } catch (err) {
                setExamples({ error: 'Failed to fetch example data' });
            }
        }
        fetchExamples();
    }, []);

    return (
        <div className="container mt-4">
            <h2>NASDAQ Financials API Columns Reference</h2>
            <Table bordered responsive striped>
                <thead>
                    <tr>
                        <th>Field Name</th>
                        <th>Full Name</th>
                        <th>Description</th>
                        <th>Formula</th>
                        <th>Example</th>
                    </tr>
                </thead>
                <tbody>
                    {columns.map(col => (
                        <tr key={col.name}>
                            <td><code>{col.name}</code></td>
                            <td>{col.fullName}</td>
                            <td>{col.description}</td>
                            <td><code>{col.formula}</code></td>
                            <td>{examples && examples[col.name] !== undefined ? formatExample(col.name, examples[col.name]) : ''}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            {examples.error && (
                <div className="text-danger mt-2">{examples.error}</div>
            )}
        </div>
    );
}

export default NasdaqColumnsGrid;
