import { formatDecimal, formatUsd, formatPercent, changePercentStyle, formatCompactNumber, formatCompactUsd, formatSharesCell } from './formatters';

describe('formatters', () => {
    test('formatDecimal treats null as missing', () => {
        expect(formatDecimal(null)).toBe('-');
        expect(formatDecimal(undefined)).toBe('-');
        expect(formatDecimal(0)).toBe('0.00');
    });

    test('formatUsd treats null as missing', () => {
        expect(formatUsd(null)).toBe('-');
        expect(formatUsd(0)).toBe('$0.00');
    });

    test('formatPercent treats null as missing', () => {
        expect(formatPercent(null)).toBe('-');
        expect(formatPercent(1.5)).toBe('1.50%');
    });

    test('formatCompactNumber abbreviates large magnitudes', () => {
        expect(formatCompactNumber(416161000000)).toBe('416B');
        expect(formatCompactNumber(391035000000)).toBe('391B');
        expect(formatCompactNumber(852525000)).toBe('853M');
        expect(formatCompactUsd(416161000000)).toBe('$416B');
        expect(formatCompactUsd(198.5)).toBe('$198.50');
    });

    test('formatSharesCell formats share counts for grids', () => {
        expect(formatSharesCell(14776353000, { compact: true })).toBe('14.8B');
        expect(formatSharesCell(14776353000, { compact: false })).toBe('14,776,353,000');
        expect(formatSharesCell(null)).toBe('-');
    });

    test('changePercentStyle scales by magnitude', () => {
        expect(changePercentStyle(null)).toEqual({});
        expect(changePercentStyle(2).backgroundColor).toContain('rgba(40, 167, 69');
        expect(changePercentStyle(-3).backgroundColor).toContain('rgba(220, 53, 69');
    });
});
