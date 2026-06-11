/** Built-in composable screen presets — filter specs for POST /api/research/screen. */

export const DEFAULT_SCREEN_PRESET_ID = 'deep_value';

export const SCREEN_UNIVERSE_OPTIONS = [
  { id: 'sp500', label: 'S&P 500' },
];

export const SCREEN_PRESETS = [
  {
    id: 'deep_value',
    label: 'Deep Value',
    description: 'Low P/B and P/E, positive FCF margin, survivability floor.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'pb', op: 'lt', value: 0.7 },
        { metric: 'pe', op: 'lt', value: 10 },
        { metric: 'fcf_margin', op: 'gte', value: 0 },
        { metric: 'survivability', op: 'gte', value: 40 },
      ],
      sort: { metric: 'pb', dir: 'asc' },
      limit: 100,
    },
  },
  {
    id: 'turnaround',
    label: 'Turnaround Candidates',
    description: 'Higher distress scores improving, insider buying, margin recovery.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'altman_z', op: 'gte', value: 1.8 },
        { metric: 'piotroski', op: 'gte', value: 5 },
        { metric: 'buy6m', op: 'gte', value: 50000 },
        { metric: 'gross_margin_trend', op: 'gte', value: 0 },
      ],
      sort: { metric: 'survivability', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'rerating_candidates',
    label: 'Rerating Candidates',
    description:
      'Improving Piotroski, positive gross margin trend, narrative divergence, insider cluster.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'piotroski', op: 'gte', value: 5 },
        { metric: 'gross_margin_trend', op: 'gte', value: 0 },
        { metric: 'divergence_score', op: 'gte', value: 0.7 },
        { metric: 'cluster_count', op: 'gte', value: 3 },
      ],
      sort: { metric: 'divergence_score', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'distressed_survivable',
    label: 'Distressed but Survivable',
    description: 'Altman distress zone with survivability cushion and positive FCF margin.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'altman_z', op: 'lt', value: 1.8 },
        { metric: 'survivability', op: 'gte', value: 35 },
        { metric: 'fcf_margin', op: 'gte', value: 0 },
      ],
      sort: { metric: 'survivability', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'insider_accumulation',
    label: 'Insider Accumulation',
    description: 'Material open-market insider buying with multiple clusters.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'buy6m', op: 'gte', value: 500000 },
        { metric: 'cluster_count', op: 'gte', value: 2 },
      ],
      sort: { metric: 'buy6m', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'margin_recovery',
    label: 'Margin Recovery',
    description: 'Positive multi-year gross margin trend.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'gross_margin_trend', op: 'gte', value: 0 },
        { metric: 'gross_margin', op: 'gte', value: 0.15 },
      ],
      sort: { metric: 'gross_margin_trend', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'high_fcf_yield',
    label: 'High FCF Yield',
    description: 'FCF yield above 8% with positive FCF margin.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'fcf_yield', op: 'gte', value: 0.08 },
        { metric: 'fcf_margin', op: 'gte', value: 0 },
      ],
      sort: { metric: 'fcf_yield', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'net_net',
    label: 'Net-Net / NCAV',
    description: 'Deep asset coverage — proxy via low P/B and strong liquidity.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'pb', op: 'lt', value: 0.6 },
        { metric: 'current_ratio', op: 'gte', value: 1.5 },
        { metric: 'survivability', op: 'gte', value: 30 },
      ],
      sort: { metric: 'pb', dir: 'asc' },
      limit: 100,
    },
  },
  {
    id: 'compounders_discount',
    label: 'Compounders at Discount',
    description: 'High ROE, modest P/B, low dilution, improving margins.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'roe', op: 'gte', value: 0.12 },
        { metric: 'pb', op: 'lt', value: 1.5 },
        { metric: 'dilution_rate', op: 'lte', value: 0.03 },
        { metric: 'gross_margin_trend', op: 'gte', value: 0 },
      ],
      sort: { metric: 'roe', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'cyclical_recovery',
    label: 'Cyclical Recovery',
    description: 'Reasonable valuation with positive margin trend.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'pe', op: 'gt', value: 0 },
        { metric: 'pe', op: 'lt', value: 25 },
        { metric: 'gross_margin_trend', op: 'gte', value: 0 },
      ],
      sort: { metric: 'gross_margin_trend', dir: 'desc' },
      limit: 100,
    },
  },
  {
    id: 'capital_efficient_small',
    label: 'Capital Efficient Small Caps',
    description: 'Sub-$2B market cap, ROE > 10%, positive FCF, moderate leverage.',
    spec: {
      universe: 'sp500',
      filters: [
        { metric: 'market_cap', op: 'lt', value: 2_000_000_000 },
        { metric: 'roe', op: 'gte', value: 0.10 },
        { metric: 'fcf_margin', op: 'gte', value: 0 },
        { metric: 'debt_equity', op: 'lt', value: 1 },
      ],
      sort: { metric: 'roe', dir: 'desc' },
      limit: 100,
    },
  },
];

export function getScreenPreset(id) {
  return SCREEN_PRESETS.find((preset) => preset.id === id) || SCREEN_PRESETS[0];
}

export const SCREEN_FILTER_OPS = [
  { id: 'lt', label: '<' },
  { id: 'lte', label: '≤' },
  { id: 'gt', label: '>' },
  { id: 'gte', label: '≥' },
  { id: 'eq', label: '=' },
];

function cloneFilter(filter) {
  return {
    metric: filter?.metric || '',
    op: filter?.op || 'gte',
    value: filter?.value ?? 0,
  };
}

function cloneGroup(group) {
  return {
    op: group?.op === 'OR' ? 'OR' : 'AND',
    filters: (group?.filters || []).map(cloneFilter),
  };
}

/** Convert legacy flat filters or filter_groups into editable group state. */
export function groupsFromSpec(spec = {}) {
  if (spec.filter_groups?.length) {
    return spec.filter_groups.map(cloneGroup);
  }
  if (spec.filters?.length) {
    return [{ op: 'AND', filters: spec.filters.map(cloneFilter) }];
  }
  return [{ op: 'AND', filters: [] }];
}

export function createEmptyFilter() {
  return { metric: '', op: 'gte', value: 0 };
}

export function createEmptyGroup(op = 'AND') {
  return { op: op === 'OR' ? 'OR' : 'AND', filters: [createEmptyFilter()] };
}

/** Build POST body for /api/research/screen using filter groups. */
export function buildScreenRequestSpec({ universe, filterGroups, sort, limit }) {
  const normalizedGroups = (filterGroups || [])
    .map((group) => ({
      op: group.op === 'OR' ? 'OR' : 'AND',
      filters: (group.filters || [])
        .filter((filter) => String(filter.metric || '').trim())
        .map((filter) => ({
          metric: String(filter.metric).trim(),
          op: filter.op || 'gte',
          value: filter.value,
        })),
    }))
    .filter((group) => group.filters.length > 0);

  return {
    universe,
    filter_groups: normalizedGroups,
    ...(sort ? { sort } : {}),
    ...(limit != null ? { limit } : {}),
  };
}

export function formatScreenFilter(filter) {
  if (!filter) return '';
  const { metric, op, value } = filter;
  const opLabel = {
    lt: '<',
    lte: '≤',
    gt: '>',
    gte: '≥',
    eq: '=',
    in: 'in',
    percentile_lt: 'p<',
    percentile_gt: 'p>',
  }[op] || op;
  const rendered = Array.isArray(value) ? value.join(', ') : value;
  return `${metric} ${opLabel} ${rendered}`;
}
