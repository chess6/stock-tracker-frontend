import {
  describeQueueItem,
  dedupeAlertsByTicker,
  dedupeQueueItems,
  filterQueueItems,
  formatEventType,
  formatPriority,
  priorityLabel,
  sortQueueItems,
} from './researchQueueFormat';

describe('researchQueueFormat', () => {
  it('formats event type labels', () => {
    expect(formatEventType('new_insider_cluster')).toBe('new insider cluster');
  });

  it('describes rank_up items', () => {
    expect(describeQueueItem({
      eventType: 'rank_up',
      details: { rankDelta: 8, priorRank: 120, currentRank: 112 },
    })).toContain('improved by 8');
  });

  it('describes insider cluster items', () => {
    expect(describeQueueItem({
      eventType: 'new_insider_cluster',
      details: { uniqueBuyers: 4, intensityScore: 0.72 },
    })).toContain('4 insiders');
  });

  it('maps priority bands', () => {
    expect(priorityLabel(15)).toBe('top');
    expect(priorityLabel(35)).toBe('mid');
    expect(priorityLabel(55)).toBe('lower');
  });

  it('formats priority labels', () => {
    expect(formatPriority(10)?.label).toBe('P10');
    expect(formatPriority(10)?.band).toBe('top');
  });

  it('dedupes queue items by ticker for singleton event types', () => {
    const deduped = dedupeQueueItems([
      { ticker: 'ADSK', eventType: 'new_insider_cluster', eventDate: '2026-06-22', priority: 10 },
      { ticker: 'ADSK', eventType: 'new_insider_cluster', eventDate: '2026-06-23', priority: 12 },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].priority).toBe(10);
  });

  it('dedupes alerts by ticker keeping latest date', () => {
    const deduped = dedupeAlertsByTicker([
      { ticker: 'NCLH', clusterDetectedAt: '2026-06-01' },
      { ticker: 'NCLH', clusterDetectedAt: '2026-06-15' },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].clusterDetectedAt).toBe('2026-06-15');
  });

  it('sorts by priority ascending', () => {
    const sorted = sortQueueItems([
      { priority: 40, eventDate: '2026-06-01' },
      { priority: 20, eventDate: '2026-06-02' },
    ], 'priority');
    expect(sorted[0].priority).toBe(20);
  });

  it('filters portfolio-only items', () => {
    const filtered = filterQueueItems(
      [{ ticker: 'AAPL' }, { ticker: 'MSFT' }],
      { portfolioOnly: true, portfolioTickers: ['AAPL'] },
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ticker).toBe('AAPL');
  });
});
