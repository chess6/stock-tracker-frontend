import axios from 'axios';
import API_ENDPOINTS from '../apiConfig';

const STORAGE_KEY = 'stock-tracker-signal-state-cache';

export function readLocalSignalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { lastVisitedAt: null, items: {} };
  } catch {
    return { lastVisitedAt: null, items: {} };
  }
}

export function writeLocalSignalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function fetchSignalState() {
  const res = await axios.get(`${API_ENDPOINTS.SIGNALS}/state`);
  const state = res.data?.lastVisitedAt != null || res.data?.items
    ? res.data
    : res.data?.state || res.data;
  writeLocalSignalState(state);
  return state;
}

export async function touchSignalLastVisited() {
  const res = await axios.put(`${API_ENDPOINTS.SIGNALS}/state`, { touchLastVisited: true });
  const state = res.data?.state || res.data;
  writeLocalSignalState(state);
  return state;
}

export async function markSignalRead(dedupKey, read = true) {
  await axios.put(`${API_ENDPOINTS.SIGNALS}/state`, { dedupKey, read });
}

export async function snoozeSignal(dedupKey, snoozeDays = 7) {
  await axios.put(`${API_ENDPOINTS.SIGNALS}/state`, { dedupKey, snoozeDays });
}

export async function dismissSignal({ dedupKey, ticker, eventType, eventDate }) {
  await axios.post(`${API_ENDPOINTS.SIGNALS}/dismiss`, {
    dedupKey,
    ticker,
    eventType,
    eventDate,
  });
}

export function formatImportancePct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 100)}`;
}

export function importanceHeatStyle(value) {
  const pct = Number(value);
  if (Number.isNaN(pct)) return {};
  const scaled = Math.max(0, Math.min(100, pct * 100));
  const alpha = 0.12 + (scaled / 100) * 0.35;
  if (scaled >= 70) {
    return { backgroundColor: `rgba(40, 167, 69, ${alpha})`, borderRadius: '4px' };
  }
  if (scaled >= 45) {
    return { backgroundColor: `rgba(0, 123, 255, ${alpha})`, borderRadius: '4px' };
  }
  return { backgroundColor: `rgba(108, 117, 125, ${alpha})`, borderRadius: '4px' };
}
