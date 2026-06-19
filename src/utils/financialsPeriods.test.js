import { isAnnualHistoryDimension, sliceColumnPeriods } from './financialsPeriods';

describe('financialsPeriods', () => {
  const periods = [
    { periodEnd: '2024-09-28' },
    { periodEnd: '2024-06-29' },
    { periodEnd: '2023-09-30' },
    { periodEnd: '2022-09-24' },
  ];

  test('isAnnualHistoryDimension recognizes annual research dimensions', () => {
    expect(isAnnualHistoryDimension('MRY')).toBe(true);
    expect(isAnnualHistoryDimension('ARY')).toBe(true);
    expect(isAnnualHistoryDimension('MRQ')).toBe(false);
  });

  test('sliceColumnPeriods dedupes fiscal years for annual dimensions', () => {
    expect(sliceColumnPeriods(periods, { years: 5, dimension: 'MRY' })).toEqual([
      { periodEnd: '2024-09-28' },
      { periodEnd: '2023-09-30' },
      { periodEnd: '2022-09-24' },
    ]);
  });

  test('sliceColumnPeriods uses period mode on financials page', () => {
    expect(sliceColumnPeriods(periods, { years: 2, period: 'annual' })).toHaveLength(2);
    expect(sliceColumnPeriods(periods, { years: 2, period: 'quarterly' })).toHaveLength(2);
  });
});
