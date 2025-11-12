// Format large share numbers with commas
export function formatShares(value) {
    const num = Number(value);
    if (!isFinite(num)) return '';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

// Common formatting utilities for currency, decimals, and percent
export const formatUsd = (value, fractionDigits = 2) => {
    const num = Number(value);
    if (!isFinite(num)) return '-';
    const digits = Math.abs(num) < 1000 ? 2 : 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(num);
};

export const formatDecimal = (value, fractionDigits = 2) => {
    const num = Number(value);
    if (!isFinite(num)) return '-';
    return num.toFixed(fractionDigits);
};

export const formatPercent = (value, fractionDigits = 2) => {
    const num = Number(value);
    if (!isFinite(num)) return '-';
    return num.toFixed(fractionDigits) + '%';
};
