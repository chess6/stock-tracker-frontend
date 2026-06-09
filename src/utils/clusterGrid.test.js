import { computeClusterColumns, splitEvenly } from './clusterGrid';

describe('splitEvenly', () => {
  test('returns single group for one column', () => {
    expect(splitEvenly(['a', 'b', 'c'], 1)).toEqual([['a', 'b', 'c']]);
  });

  test('distributes remainder to earlier groups', () => {
    expect(splitEvenly([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5], [6, 7]]);
  });

  test('caps column count at item count', () => {
    expect(splitEvenly(['a', 'b'], 4)).toEqual([['a'], ['b']]);
  });
});

describe('computeClusterColumns', () => {
  test('keeps tiny lists in one column', () => {
    expect(computeClusterColumns(1200, 3)).toBe(1);
  });

  test('uses width and row count', () => {
    expect(computeClusterColumns(900, 12)).toBe(3);
    expect(computeClusterColumns(500, 12)).toBe(2);
    expect(computeClusterColumns(400, 12)).toBe(1);
  });
});
