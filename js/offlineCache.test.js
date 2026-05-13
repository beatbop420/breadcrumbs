import { expect, summarizeResults } from './test-runner.js';
import {
  PINS_CACHE_STORAGE_KEY,
  parseCachedJson,
  readCachedPins,
  saveCachedPins,
  upsertCachedPin,
  removeCachedPin,
  buildSeenPinsCacheKey,
  readCachedSeenPinIds,
  saveCachedSeenPinIds,
} from './offlineCache.js';

const originalLocalStorage = globalThis.localStorage;
const originalConsoleError = console.error;

function buildMockStorage() {
  const storageValues = new Map();

  return {
    getItem: (storageKey) => (storageValues.has(storageKey) ? storageValues.get(storageKey) : null),
    setItem: (storageKey, storageValue) => {
      storageValues.set(storageKey, String(storageValue));
    },
    removeItem: (storageKey) => {
      storageValues.delete(storageKey);
    },
  };
}

globalThis.localStorage = buildMockStorage();
console.error = () => {};

expect('parseCachedJson returns fallback for blank input', parseCachedJson('', []), []);
expect('parseCachedJson returns fallback for invalid JSON', parseCachedJson('{', []), []);
expect('readCachedPins returns an empty array by default', readCachedPins().length, 0);

saveCachedPins([{ id: 'pin-1', place_name: 'Paris' }]);
expect('saveCachedPins stores pin rows', readCachedPins()[0].place_name, 'Paris');
expect('saveCachedPins writes to the pins cache key', typeof globalThis.localStorage.getItem(PINS_CACHE_STORAGE_KEY), 'string');

upsertCachedPin({ id: 'pin-1', place_name: 'Rome' });
expect('upsertCachedPin replaces an existing pin by id', readCachedPins()[0].place_name, 'Rome');

upsertCachedPin({ id: 'pin-2', place_name: 'Madrid' });
expect('upsertCachedPin appends a missing pin', readCachedPins().length, 2);

removeCachedPin('pin-1');
expect('removeCachedPin removes the matching pin', readCachedPins().length, 1);
expect('removeCachedPin keeps other pins intact', readCachedPins()[0].id, 'pin-2');

expect('buildSeenPinsCacheKey prefixes the username', buildSeenPinsCacheKey('Petra'), 'breadcrumbs_seen_pins:Petra');
expect('readCachedSeenPinIds returns an empty Set by default', readCachedSeenPinIds('Petra').size, 0);

saveCachedSeenPinIds('Petra', new Set(['pin-1', 'pin-2']));
const cachedSeenPinIds = readCachedSeenPinIds('Petra');
expect('saveCachedSeenPinIds stores a Set-compatible list', cachedSeenPinIds.has('pin-1'), true);
expect('readCachedSeenPinIds restores all saved ids', cachedSeenPinIds.size, 2);

console.error = originalConsoleError;
globalThis.localStorage = originalLocalStorage;

summarizeResults();
