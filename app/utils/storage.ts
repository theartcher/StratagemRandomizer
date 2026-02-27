/**
 * Reads and JSON-parses a value from localStorage.
 * Returns `fallback` if the key is absent or the data is malformed.
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // ignore malformed data
  }
  return fallback;
}
