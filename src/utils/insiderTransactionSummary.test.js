import {
  describeInsiderTransaction,
  getInsiderTransactionSide,
} from './insiderTransactionSummary';

describe('insiderTransactionSummary', () => {
  test('describes an open-market purchase with shares and value', () => {
    const text = describeInsiderTransaction({
      ownername: 'Jane Doe',
      transactioncode: 'P',
      shares: 10000,
      transactionvalue: 150000,
      securitytitle: 'Common Stock',
    });
    expect(text).toContain('Jane Doe bought');
    expect(text).toContain('10,000 shares');
    expect(text).toContain('Common Stock');
    expect(getInsiderTransactionSide({ transactioncode: 'P' })).toBe('buy');
  });

  test('describes an open-market sale', () => {
    const text = describeInsiderTransaction({
      ownername: 'John Smith',
      transactioncode: 'S',
      shares: 5000,
      transactionvalue: 75000,
      securitytitle: 'Common Stock',
    });
    expect(text).toContain('John Smith sold');
    expect(text).toContain('5,000 shares');
    expect(getInsiderTransactionSide({ transactioncode: 'S' })).toBe('sell');
  });

  test('describes a stock award without dollar value', () => {
    const text = describeInsiderTransaction({
      ownername: 'Bob Wilson',
      transactioncode: 'A',
      securitytitle: 'Restricted Stock Units',
    });
    expect(text).toContain('Bob Wilson received');
    expect(text).toContain('Restricted Stock Units');
    expect(getInsiderTransactionSide({ transactioncode: 'A' })).toBe('buy');
  });
});
