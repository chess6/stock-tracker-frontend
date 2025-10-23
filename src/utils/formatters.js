// Format large share numbers with commas
export function formatShares(value) {
    if (value === null || value === undefined || isNaN(value)) return '';
    return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
// Common formatting utilities for currency, decimals, and percent
export const formatUsd = (value, fractionDigits = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    const num = Number(value);
    const digits = Math.abs(num) < 1000 ? 2 : 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(num);
};

export const formatDecimal = (value, fractionDigits = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return Number(value).toFixed(fractionDigits);
};

export const formatPercent = (value, fractionDigits = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
    return Number(value).toFixed(fractionDigits) + '%';
};
