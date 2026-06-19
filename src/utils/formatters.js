import { isDarkTheme } from './themeState';

// Format large share numbers with commas
export function formatShares(value) {
    const num = Number(value);
    if (!isFinite(num)) return '';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Share-count cells: compact scale in grids, full commas elsewhere. */
export function formatSharesCell(value, { compact = false } = {}) {
    if (isMissing(value)) return '-';
    const num = Number(value);
    if (!isFinite(num)) return '-';
    return compact ? formatCompactNumber(num) : formatShares(num);
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

/** Compact scale suffix for large magnitudes (terminal style). */
export function formatCompactNumber(value, significantDigits = 3) {
    if (isMissing(value)) return '-';
    const num = Number(value);
    if (!isFinite(num)) return '-';
    const sign = num < 0 ? '-' : '';
    const absVal = Math.abs(num);
    let suffix = '';
    let divisor = 1;
    if (absVal >= 1e12) {
        suffix = 'T';
        divisor = 1e12;
    } else if (absVal >= 1e9) {
        suffix = 'B';
        divisor = 1e9;
    } else if (absVal >= 1e6) {
        suffix = 'M';
        divisor = 1e6;
    } else if (absVal >= 1e3) {
        suffix = 'K';
        divisor = 1e3;
    }
    if (divisor === 1) {
        if (absVal >= 1) return sign + absVal.toPrecision(significantDigits);
        return sign + absVal.toFixed(Math.min(2, significantDigits - 1));
    }
    return sign + (absVal / divisor).toPrecision(significantDigits) + suffix;
}

export function formatCompactUsd(value, significantDigits = 3) {
    if (isMissing(value)) return '-';
    const num = Number(value);
    if (!isFinite(num)) return '-';
    if (num === 0) return '$0';
    const absVal = Math.abs(num);
    if (absVal < 1000) {
        return (num < 0 ? '-$' : '$') + absVal.toFixed(2);
    }
    const compact = formatCompactNumber(absVal, significantDigits);
    if (compact === '-') return '-';
    return (num < 0 ? '-$' : '$') + compact;
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
