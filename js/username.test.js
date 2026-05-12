import { expect, summarizeResults } from './test-runner.js';
import {
  USERNAME_STORAGE_KEY,
  getStoredUsername,
  saveUsername,
  hasStoredUsername,
  clearStoredUsername,
} from './username.js';

const originalLocalStorage = globalThis.localStorage;

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

expect('getStoredUsername returns null when storage is empty', getStoredUsername(), null);
expect('hasStoredUsername returns false when storage is empty', hasStoredUsername(), false);
expect('saveUsername trims and stores the username', saveUsername('  Sofia  '), 'Sofia');
expect('getStoredUsername returns the stored username', getStoredUsername(), 'Sofia');
expect('hasStoredUsername returns true when a username is stored', hasStoredUsername(), true);

clearStoredUsername();
expect('clearStoredUsername removes the stored username', globalThis.localStorage.getItem(USERNAME_STORAGE_KEY), null);
expect('hasStoredUsername returns false after clearing', hasStoredUsername(), false);

let invalidUsernameError = null;
try {
  saveUsername('');
} catch (err) {
  invalidUsernameError = err.message;
}
expect('saveUsername throws on invalid input', typeof invalidUsernameError, 'string');

globalThis.localStorage = originalLocalStorage;

summarizeResults();
