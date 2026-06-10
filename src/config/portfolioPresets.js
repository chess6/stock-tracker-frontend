import { PORTFOLIO_DEFAULT_VISIBLE_COLUMNS } from './portfolioColumns';

export const PORTFOLIO_PRESET_STORAGE_KEY = 'portfolio-research-presets';

export const DEFAULT_PORTFOLIO_PRESET_ID = 'default';

/** Bundles visible columns + default sort (+ optional research heatmap mode label). */
export const PORTFOLIO_RESEARCH_PRESETS = [
  {
    id: 'default',
    label: 'Standard',
    visibleColumns: PORTFOLIO_DEFAULT_VISIBLE_COLUMNS,
    defaultSort: { id: 'ticker', desc: false },
    heatmapMode: 'deep_value',
  },
  {
    id: 'deep_value',
    label: 'Deep Value',
    visibleColumns: [
      'select',
      'ticker',
      'price',
      'pe',
      'bp',
      'ep',
      'sfcfp',
      'de',
    ],
    defaultSort: { id: 'bp', desc: true },
    heatmapMode: 'deep_value',
  },
  {
    id: 'distressed',
    label: 'Distressed',
    visibleColumns: [
      'select',
      'ticker',
      'price',
      'de',
      'currentRatio',
      'sfcfp',
      'ncfp',
      'cashp',
    ],
    defaultSort: { id: 'de', desc: true },
    heatmapMode: 'deep_value',
  },
  {
    id: 'insider_activity',
    label: 'Insider Activity',
    visibleColumns: [
      'select',
      'ticker',
      'price',
      'change',
      'insiderBuy6m',
      'insiderBuy3m',
      'insiderBuy1m',
    ],
    defaultSort: { id: 'insiderBuy6m', desc: true },
    heatmapMode: 'deep_value',
  },
  {
    id: 'margin_stability',
    label: 'Margin Stability',
    visibleColumns: [
      'select',
      'ticker',
      'price',
      'grossMargin',
      'netMargin',
      'roe',
      'roa',
      'cfop',
    ],
    defaultSort: { id: 'grossMargin', desc: true },
    heatmapMode: 'deep_value',
  },
];

const PRESET_BY_ID = Object.fromEntries(
  PORTFOLIO_RESEARCH_PRESETS.map((preset) => [preset.id, preset]),
);

export function getPortfolioPresetById(presetId) {
  return PRESET_BY_ID[presetId] || PRESET_BY_ID[DEFAULT_PORTFOLIO_PRESET_ID];
}

export function buildVisibleColumnsForPreset(preset, allColumnIds = []) {
  const allowed = new Set(allColumnIds);
  const required = ['select', 'ticker'];
  const requested = (preset?.visibleColumns || PORTFOLIO_DEFAULT_VISIBLE_COLUMNS)
    .filter((colId) => allowed.has(colId));
  const merged = [...new Set([...required, ...requested])];
  return merged.filter((colId) => allowed.has(colId));
}

export function getActivePortfolioPresetId() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_PRESET_STORAGE_KEY);
    if (!raw) return DEFAULT_PORTFOLIO_PRESET_ID;
    const parsed = JSON.parse(raw);
    const id = parsed?.activePresetId;
    return PRESET_BY_ID[id] ? id : DEFAULT_PORTFOLIO_PRESET_ID;
  } catch {
    return DEFAULT_PORTFOLIO_PRESET_ID;
  }
}

export function setActivePortfolioPresetId(presetId) {
  const resolved = PRESET_BY_ID[presetId] ? presetId : DEFAULT_PORTFOLIO_PRESET_ID;
  localStorage.setItem(
    PORTFOLIO_PRESET_STORAGE_KEY,
    JSON.stringify({ activePresetId: resolved }),
  );
  return resolved;
}

/** @internal test helper */
export function resetPortfolioPresetStorageForTests() {
  localStorage.removeItem(PORTFOLIO_PRESET_STORAGE_KEY);
}
