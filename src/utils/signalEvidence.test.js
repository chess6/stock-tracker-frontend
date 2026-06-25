import { formatSignalEvidenceItem, formatSignalEvidenceList } from './signalEvidence';

describe('signalEvidence', () => {
  it('formats insider cluster evidence with window and buyers', () => {
    expect(formatSignalEvidenceItem({
      type: 'insider_cluster',
      windowStart: '2026-03-01',
      windowEnd: '2026-03-30',
      uniqueBuyers: 3,
    })).toBe('3 insiders bought in cluster (2026-03-01 → 2026-03-30)');
  });

  it('formats SEC filing evidence with summary', () => {
    expect(formatSignalEvidenceItem({
      type: 'filing',
      formType: '8-K',
      itemNumber: '4.02',
      summary: 'Financial restatement',
    })).toBe('8-K · item 4.02 — Financial restatement');
  });

  it('formats article and volume evidence', () => {
    expect(formatSignalEvidenceItem({
      type: 'article',
      title: 'Company beats estimates',
    })).toBe('News: Company beats estimates');
    expect(formatSignalEvidenceItem({
      type: 'price',
      volumeRatio: 2.35,
    })).toBe('Volume 2.4× vs trailing average');
  });

  it('maps evidence arrays to readable strings', () => {
    expect(formatSignalEvidenceList([
      { type: 'narrative_snapshot', snapshotDate: '2026-06-01' },
    ])).toEqual(['Narrative snapshot on 2026-06-01']);
  });
});
