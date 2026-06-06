import { signedHeatStyle, insiderDollarStyle, columnHeatStyle } from './heatMap';

describe('heatMap', () => {
  test('signedHeatStyle returns green for positive', () => {
    const style = signedHeatStyle(3);
    expect(style.backgroundColor).toContain('40, 167, 69');
  });

  test('signedHeatStyle returns red for negative', () => {
    const style = signedHeatStyle(-4);
    expect(style.backgroundColor).toContain('220, 53, 69');
  });

  test('signedHeatStyle empty for null', () => {
    expect(signedHeatStyle(null)).toEqual({});
  });

  test('insiderDollarStyle colors large buys', () => {
    const style = insiderDollarStyle(500000);
    expect(style.backgroundColor).toBeDefined();
  });

  test('columnHeatStyle interpolates', () => {
    const low = columnHeatStyle(1, 0, 10);
    const high = columnHeatStyle(9, 0, 10);
    expect(low.backgroundColor).not.toEqual(high.backgroundColor);
  });
});
