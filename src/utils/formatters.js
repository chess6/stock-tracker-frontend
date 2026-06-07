// Format large share numbers with commas
export function formatShares(value) {
    const num = Number(value);
    if (!isFinite(num)) return '';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function isMissing(value) {
    return value === null || value === undefined || value === '';
}

// Common formatting utilities for currency, decimals, and percent
export const formatUsd = (value, fractionDigits = 2) => {
    if (isMissing(value)) return '-';
    const num = Number(value);
    if (!isFinite(num)) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(num);
};

export const formatDecimal = (value, fractionDigits = 2) => {
    if (isMissing(value)) return '-';
    const num = Number(value);
    if (!isFinite(num)) return '-';
    return num.toFixed(fractionDigits);
};

export const formatPercent = (value, fractionDigits = 2) => {
    if (isMissing(value)) return '-';
    const num = Number(value);
    if (!isFinite(num)) return '-';
    return num.toFixed(fractionDigits) + '%';
};

function isDarkTheme() {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-bs-theme') === 'dark';
}

/** Green/red background intensity scaled by |percent change|. */
export function changePercentStyle(value) {
    if (isMissing(value)) return {};
    const num = Number(value);
    if (!isFinite(num) || num === 0) return {};
    const magnitude = Math.min(Math.abs(num) / 5, 1);
    const alpha = 0.12 + magnitude * 0.28;
    const dark = isDarkTheme();
    if (num > 0) {
        return {
            backgroundColor: `rgba(40, 167, 69, ${alpha})`,
            color: dark ? '#9ee0b8' : '#155724',
        };
    }
    return {
        backgroundColor: `rgba(220, 53, 69, ${alpha})`,
        color: dark ? '#f5b5bb' : '#721c24',
    };
}
