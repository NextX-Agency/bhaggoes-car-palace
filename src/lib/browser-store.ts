export const FAVORITES_KEY = "bhaggoes:favorites:v1";
export const COMPARE_KEY = "bhaggoes:compare:v1";
const STORE_EVENT = "bhaggoes:browser-store";
const inMemoryStore = new Map<string, string>();

export function subscribeToBrowserStore(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORE_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(STORE_EVENT, callback); };
}

export function readBrowserSnapshot(key: string) {
  try { return localStorage.getItem(key) ?? inMemoryStore.get(key) ?? "[]"; }
  catch { return inMemoryStore.get(key) ?? "[]"; }
}
export function emptyBrowserSnapshot() { return "[]"; }

export function parseStoredIds(snapshot: string, limit: number) {
  try {
    const value: unknown = JSON.parse(snapshot);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, limit) : [];
  } catch { return []; }
}

export function writeStoredIds(key: string, ids: string[]) {
  const value = JSON.stringify(ids);
  inMemoryStore.set(key, value);
  try { localStorage.setItem(key, value); } catch { /* Keep saved cars usable for this tab when storage is blocked. */ }
  window.dispatchEvent(new Event(STORE_EVENT));
}
