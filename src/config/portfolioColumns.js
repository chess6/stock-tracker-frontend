/** Portfolio grid column metadata (labels, tooltips, formulas). */

export const PORTFOLIO_COLUMN_META = {
    ticker: {
        label: 'Ticker',
        tooltip: 'Stock ticker symbol',
    },
    price: {
        label: 'Price',
        tooltip: 'Latest closing price (USD)',
        formula: 'Latest close from prices cache',
    },
    change: {
        label: 'Change',
        tooltip: 'Percent change from previous close',
        formula: '(todayClose - prevClose) / prevClose × 100',
    },
    marketCap: {
        label: 'Market Cap',
        tooltip: 'Market capitalization (USD)',
        formula: 'shares outstanding × latest close',
    },
    sp: {
        label: 'SP',
        tooltip: 'Sales per share',
        formula: 'revenue / shares outstanding',
    },
    ebitdaEv: {
        label: 'Eb/EV',
        tooltip: 'EBITDA / Enterprise Value',
        formula: 'ebitda / (marketCap + debt - cash)',
    },
    tbp: {
        label: 'TBP',
        tooltip: 'Tangible book value per share',
        formula: 'equity / shares outstanding',
    },
    bp: {
        label: 'BP',
        tooltip: 'Book value per share',
        formula: 'equity / shares outstanding',
    },
    ep: {
        label: 'EP',
        tooltip: 'Earnings per share',
        formula: 'EPS from latest annual filing',
    },
    cfop: {
        label: 'CFOP',
        tooltip: 'Cash flow from operations per share',
        formula: 'operating cash flow / shares outstanding',
    },
    sfcfp: {
        label: 'SFCFP',
        tooltip: 'Free cash flow per share',
        formula: '(operating cash flow - capex) / shares outstanding',
    },
    insiderBuy6m: {
        label: 'Insider Buy 6M',
        tooltip: 'Net insider purchase value (last 6 months)',
        formula: 'Sum of Form 4 purchases minus sales (≥ $100k)',
    },
    insiderBuy3m: {
        label: 'Insider Buy 3M',
        tooltip: 'Net insider purchase value (last 3 months)',
        formula: 'Sum of Form 4 purchases minus sales (≥ $100k)',
    },
    insiderBuy1m: {
        label: 'Insider Buy 1M',
        tooltip: 'Net insider purchase value (last 1 month)',
        formula: 'Sum of Form 4 purchases minus sales (≥ $100k)',
    },
};
