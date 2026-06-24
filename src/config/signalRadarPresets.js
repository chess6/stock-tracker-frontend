export const SIGNAL_RADAR_PRESETS = [
  {
    id: 'insider_conviction',
    label: 'Insider conviction',
    description: 'Clusters of open-market insider buying',
    lens: 'radar_insider',
  },
  {
    id: 'rerating_candidates',
    label: 'Rerating candidates',
    description: 'Improving fundamentals with negative narrative divergence',
    lens: 'radar_rerating',
  },
  {
    id: 'distress_survivors',
    label: 'Distress / going concern',
    description: 'SEC going-concern flags and distress signals',
    lens: 'radar_distress',
  },
  {
    id: 'activist_targets',
    label: 'Activist targets',
    description: 'Recent 13D activist filings',
    lens: 'radar_activist',
  },
  {
    id: 'unusual_volume',
    label: 'Unusual volume',
    description: 'Volume spikes vs 20-day average',
    lens: 'radar_unusual',
  },
];

export const SIGNAL_LENS_TABS = [
  { id: 'worklist', label: 'Worklist' },
  { id: 'brief', label: 'Morning Brief' },
  { id: 'radar', label: 'Radar' },
  { id: 'watch', label: 'Portfolio Watch' },
];
