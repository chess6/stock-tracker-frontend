import { buildScreenRequestSpec, getScreenPreset, groupsFromSpec } from '../config/screenPresets';

const STORAGE_KEY = 'stock-tracker-saved-screens';
const MAX_SAVED = 30;

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

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { screens: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.screens)) return { screens: [] };
    return {
      screens: parsed.screens.map((screen) => ({
        id: String(screen.id || ''),
        name: String(screen.name || 'Untitled').trim() || 'Untitled',
        universe: screen.universe || 'sp500',
        filterGroups: (screen.filterGroups || []).map(cloneGroup),
        sort: screen.sort || null,
        limit: screen.limit ?? 100,
        sourcePresetId: screen.sourcePresetId || null,
        savedAt: screen.savedAt || null,
      })).filter((screen) => screen.id),
    };
  } catch {
    return { screens: [] };
  }
}

function writeStore(screens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ screens }));
}

export function getSavedScreens() {
  return readStore().screens;
}

export function saveScreen({
  name,
  universe,
  filterGroups,
  sort,
  limit,
  sourcePresetId = null,
}) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Enter a name for this screen.');
  }
  const normalizedGroups = (filterGroups || [])
    .map(cloneGroup)
    .filter((group) => (group.filters || []).some((filter) => String(filter.metric || '').trim()));

  if (!normalizedGroups.length) {
    throw new Error('Add at least one filter before saving.');
  }

  const store = readStore();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    name: trimmedName,
    universe: universe || 'sp500',
    filterGroups: normalizedGroups,
    sort: sort || null,
    limit: limit ?? 100,
    sourcePresetId,
    savedAt: new Date().toISOString(),
  };

  const next = [
    entry,
    ...store.screens.filter((screen) => screen.name.toLowerCase() !== trimmedName.toLowerCase()),
  ];
  writeStore(next.slice(0, MAX_SAVED));
  return entry;
}

export function deleteSavedScreen(id) {
  const store = readStore();
  writeStore(store.screens.filter((screen) => screen.id !== id));
}

export function clonePreset(preset) {
  if (!preset) return null;
  return {
    universe: preset.spec?.universe || 'sp500',
    filterGroups: groupsFromSpec(preset.spec),
    sort: preset.spec?.sort || null,
    limit: preset.spec?.limit ?? 100,
    sourcePresetId: preset.id,
  };
}

export function screenToRequestSpec(screen) {
  if (!screen) return null;
  return buildScreenRequestSpec({
    universe: screen.universe,
    filterGroups: screen.filterGroups,
    sort: screen.sort,
    limit: screen.limit,
  });
}

/** @internal test helper */
export function resetSavedScreensForTests() {
  localStorage.removeItem(STORAGE_KEY);
}
