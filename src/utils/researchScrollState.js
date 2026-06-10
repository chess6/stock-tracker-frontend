const PREFIX = 'research-scroll:';
const PEAK_SUFFIX = ':peak';

function peakKey(key) {
  return `${PREFIX}${key}${PEAK_SUFFIX}`;
}

export function saveResearchScroll(key, scrollTop) {
  if (!key || scrollTop == null || Number.isNaN(Number(scrollTop))) return;
  try {
    sessionStorage.setItem(`${PREFIX}${key}`, String(Math.max(0, Number(scrollTop))));
  } catch {
    // ignore quota / private mode
  }
}

export function readResearchScroll(key) {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${key}`);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function touchResearchScroll(key, scrollTop) {
  if (!key || scrollTop == null || Number.isNaN(Number(scrollTop))) return;
  const y = Math.max(0, Number(scrollTop));
  saveResearchScroll(key, y);
  try {
    const prevPeak = Number(sessionStorage.getItem(peakKey(key)) ?? 0);
    const nextPeak = Math.max(Number.isFinite(prevPeak) ? prevPeak : 0, y);
    sessionStorage.setItem(peakKey(key), String(nextPeak));
  } catch {
    // ignore quota / private mode
  }
}

export function commitResearchScroll(key) {
  if (!key) return;
  const prior = readResearchScroll(key) ?? 0;
  if (typeof window !== 'undefined' && window.scrollY != null) {
    touchResearchScroll(key, window.scrollY);
  }
  let peak = Math.max(prior, readResearchScroll(key) ?? 0);
  try {
    const rawPeak = sessionStorage.getItem(peakKey(key));
    if (rawPeak != null) {
      const parsed = Number(rawPeak);
      if (Number.isFinite(parsed)) peak = Math.max(peak, parsed);
    }
  } catch {
    // ignore
  }
  saveResearchScroll(key, peak);
  clearResearchScrollPeak(key);
}

export function clearResearchScrollPeak(key) {
  if (!key) return;
  try {
    sessionStorage.removeItem(peakKey(key));
  } catch {
    // ignore
  }
}

export function clearResearchScroll(key) {
  if (!key) return;
  try {
    sessionStorage.removeItem(`${PREFIX}${key}`);
    clearResearchScrollPeak(key);
  } catch {
    // ignore
  }
}
