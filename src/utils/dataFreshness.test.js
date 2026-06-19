import {
  formatFreshnessTimestamp,
  isStale,
  parseUtcTimestamp,
} from './dataFreshness';

describe('dataFreshness timestamps', () => {
  test('parseUtcTimestamp treats naive SQLite timestamps as UTC', () => {
    const parsed = parseUtcTimestamp('2026-06-17 06:12:03');
    expect(parsed?.toISOString()).toBe('2026-06-17T06:12:03.000Z');
  });

  test('parseUtcTimestamp accepts explicit Z timestamps', () => {
    const parsed = parseUtcTimestamp('2026-06-17T06:12:03Z');
    expect(parsed?.toISOString()).toBe('2026-06-17T06:12:03.000Z');
  });

  test('formatFreshnessTimestamp converts UTC to local display with timezone label', () => {
    const formatted = formatFreshnessTimestamp('2026-06-17T06:12:03Z');
    expect(formatted).not.toBe('2026-06-17 06:12:03');
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/12:03/);
  });

  test('isStale uses UTC parsing for naive timestamps', () => {
    const recentUtc = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace('.000Z', 'Z');
    expect(isStale(recentUtc, 1)).toBe(false);

    const oldNaive = '2000-01-01 00:00:00';
    expect(isStale(oldNaive, 1)).toBe(true);
  });
});
