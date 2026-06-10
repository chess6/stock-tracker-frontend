import API_ENDPOINTS from '../apiConfig';
import { COLOR_MODES } from './scoringColors';

const DEFAULT_COLOR_MODE = 'deep_value';

export function normalizeColorMode(value) {
  return COLOR_MODES.includes(value) ? value : DEFAULT_COLOR_MODE;
}

export async function saveResearchPreferences({ colorMode, showHeatLegend } = {}) {
  const body = {};
  if (colorMode != null) body.researchColorMode = normalizeColorMode(colorMode);
  if (showHeatLegend != null) body.researchHeatLegend = Boolean(showHeatLegend);
  if (!Object.keys(body).length) return null;
  const res = await fetch(API_ENDPOINTS.PREFERENCES, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to save research preferences');
  return res.json();
}

export function researchPrefsFromUserData(data = {}) {
  return {
    colorMode: normalizeColorMode(data.researchColorMode),
    showHeatLegend: data.researchHeatLegend !== false,
  };
}
