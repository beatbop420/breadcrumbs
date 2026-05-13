const PINS_CACHE_STORAGE_KEY = 'breadcrumbs_cached_pins';
const SEEN_PINS_CACHE_KEY_PREFIX = 'breadcrumbs_seen_pins:';

function readStorageValue(storageKey) {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(storageKey);
}

function writeStorageValue(storageKey, storageValue) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(storageKey, storageValue);
}

function parseCachedJson(rawValue, fallbackValue) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) return fallbackValue;

  try {
    return JSON.parse(rawValue);
  } catch (err) {
    console.error('[Breadcrumbs] parseCachedJson failed:', err);
    return fallbackValue;
  }
}

function readCachedPins() {
  const cachedPins = parseCachedJson(readStorageValue(PINS_CACHE_STORAGE_KEY), []);
  return Array.isArray(cachedPins) ? cachedPins : [];
}

function saveCachedPins(pinRows) {
  if (!Array.isArray(pinRows)) return;
  writeStorageValue(PINS_CACHE_STORAGE_KEY, JSON.stringify(pinRows));
}

function upsertCachedPin(pinRow) {
  if (!pinRow || typeof pinRow.id !== 'string') return;

  const cachedPins = readCachedPins();
  const existingPinIndex = cachedPins.findIndex((cachedPin) => cachedPin.id === pinRow.id);

  if (existingPinIndex >= 0) {
    cachedPins[existingPinIndex] = pinRow;
  } else {
    cachedPins.push(pinRow);
  }

  saveCachedPins(cachedPins);
}

function removeCachedPin(pinId) {
  if (typeof pinId !== 'string' || pinId.length === 0) return;
  const filteredPins = readCachedPins().filter((cachedPin) => cachedPin.id !== pinId);
  saveCachedPins(filteredPins);
}

function buildSeenPinsCacheKey(username) {
  if (typeof username !== 'string') return '';
  const normalizedUsername = username.trim();
  return normalizedUsername.length > 0 ? `${SEEN_PINS_CACHE_KEY_PREFIX}${normalizedUsername}` : '';
}

function readCachedSeenPinIds(username) {
  const cacheKey = buildSeenPinsCacheKey(username);
  if (!cacheKey) return new Set();

  const cachedPinIds = parseCachedJson(readStorageValue(cacheKey), []);
  return Array.isArray(cachedPinIds) ? new Set(cachedPinIds) : new Set();
}

function saveCachedSeenPinIds(username, pinIds) {
  const cacheKey = buildSeenPinsCacheKey(username);
  if (!cacheKey) return;

  const normalizedPinIds = pinIds instanceof Set
    ? Array.from(pinIds)
    : Array.isArray(pinIds)
      ? pinIds
      : [];

  writeStorageValue(cacheKey, JSON.stringify(normalizedPinIds));
}

export {
  PINS_CACHE_STORAGE_KEY,
  SEEN_PINS_CACHE_KEY_PREFIX,
  parseCachedJson,
  readCachedPins,
  saveCachedPins,
  upsertCachedPin,
  removeCachedPin,
  buildSeenPinsCacheKey,
  readCachedSeenPinIds,
  saveCachedSeenPinIds,
};
