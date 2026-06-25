import { SIGNAL_RADAR_PRESETS } from '../config/signalRadarPresets';

const STORAGE_KEY = 'stock-tracker-saved-radar-scans';
const MAX_SAVED = 20;

function normalizeScan(scan) {
  if (!scan?.id || !scan?.lens) return null;
  return {
    id: String(scan.id),
    name: String(scan.name || 'Untitled').trim() || 'Untitled',
    lens: String(scan.lens),
    sourcePresetId: scan.sourcePresetId || null,
    savedAt: scan.savedAt || null,
  };
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { scans: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.scans)) return { scans: [] };
    return {
      scans: parsed.scans.map(normalizeScan).filter(Boolean),
    };
  } catch {
    return { scans: [] };
  }
}

function writeStore(scans) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ scans }));
}

export function getSavedRadarScans() {
  return readStore().scans;
}

export function saveRadarScan({ name, lens, sourcePresetId = null }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('Enter a name for this radar scan.');
  }
  if (!lens) {
    throw new Error('Select a radar lens before saving.');
  }

  const store = readStore();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    name: trimmedName,
    lens,
    sourcePresetId,
    savedAt: new Date().toISOString(),
  };

  const next = [
    entry,
    ...store.scans.filter((scan) => scan.name.toLowerCase() !== trimmedName.toLowerCase()),
  ].slice(0, MAX_SAVED);
  writeStore(next);
  return entry;
}

export function deleteSavedRadarScan(id) {
  const store = readStore();
  writeStore(store.scans.filter((scan) => scan.id !== id));
}

export function resolveRadarSelection(selectionId) {
  const preset = SIGNAL_RADAR_PRESETS.find((item) => item.id === selectionId);
  if (preset) {
    return { id: preset.id, label: preset.label, lens: preset.lens, description: preset.description, saved: false };
  }
  const saved = getSavedRadarScans().find((item) => item.id === selectionId);
  if (!saved) return null;
  const base = SIGNAL_RADAR_PRESETS.find((item) => item.lens === saved.lens);
  return {
    id: saved.id,
    label: saved.name,
    lens: saved.lens,
    description: base?.description || 'Saved radar scan',
    saved: true,
  };
}

export function listRadarScanOptions() {
  const saved = getSavedRadarScans().map((scan) => ({
    id: scan.id,
    label: scan.name,
    lens: scan.lens,
    group: 'saved',
  }));
  const presets = SIGNAL_RADAR_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    lens: preset.lens,
    group: 'preset',
  }));
  return { saved, presets };
}

/** @internal test helper */
export function resetSavedRadarScansForTests() {
  localStorage.removeItem(STORAGE_KEY);
}
