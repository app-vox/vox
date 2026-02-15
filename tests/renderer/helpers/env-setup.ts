/**
 * Vitest setup file for renderer tests.
 *
 * Node >= 22 ships a built-in `localStorage` global that is NOT a standard
 * Web Storage API (e.g. `getItem` is not a function). This conflicts with
 * source modules that call `localStorage.getItem()` at the top level during
 * import. We install a minimal spec-compliant polyfill so those modules load
 * correctly even before the jsdom environment fully patches globals.
 */

if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.getItem !== "function") {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    writable: true,
    configurable: true,
  });
}
