/**
 * localStorage.setItem that never throws. Writes fail when storage is full or blocked
 * (private mode, disabled site data); callers treat these caches as best-effort, so a
 * failed write must not turn a successful action into an error.
 */
export function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
