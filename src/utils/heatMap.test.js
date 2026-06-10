import registrySnapshot from '../config/__fixtures__/metric_registry.snapshot.json';
import { applyRegistryRules } from './scoringColors';
import {
  signedHeatStyle,
  insiderDollarStyle,
  columnHeatStyle,
  columnMinMax,
  piotroskiHeatStyle,
  altmanZHeatStyle,
  marginHeatStyle,
} from './heatMap';

describe('heatMap', () => {
  beforeEach(() => {
    applyRegistryRules(registrySnapshot.metrics);
  });
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

  test('piotroskiHeatStyle colors high scores elite', () => {
    expect(piotroskiHeatStyle(8).backgroundColor).toBe('var(--st-heat-elite)');
  });

  test('altmanZHeatStyle colors distress red', () => {
    expect(altmanZHeatStyle(1.2).backgroundColor).toBe('var(--st-heat-red-deep)');
  });

  test('marginHeatStyle colors positive margins', () => {
    expect(marginHeatStyle(0.2).backgroundColor).toBeDefined();
  });

  test('columnHeatStyle interpolates', () => {
    const low = columnHeatStyle(1, 0, 10);
    const high = columnHeatStyle(9, 0, 10);
    expect(low.backgroundColor).not.toEqual(high.backgroundColor);
  });

  test('columnMinMax ignores nulls', () => {
    const rows = [{ ep: 2 }, { ep: 8 }, { ep: null }, { ep: NaN }];
    expect(columnMinMax(rows, 'ep')).toEqual({ min: 2, max: 8 });
  });
});
