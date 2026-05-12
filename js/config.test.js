import { expect, summarizeResults } from './test-runner.js';
import {
  CONFIG_STORAGE_KEY,
  parseStoredConfig,
  resolveSupabaseConfig,
  saveRuntimeConfigForTesting,
  clearRuntimeConfigForTesting,
} from './config.js';

const originalWindow = globalThis.window;
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

globalThis.window = {};
globalThis.localStorage = buildMockStorage();
console.error = () => {};

// ─── parseStoredConfig ───────────────────────────────────────────────────────

expect('parseStoredConfig returns empty object for blank input', parseStoredConfig(''), {});
expect('parseStoredConfig returns empty object for invalid JSON', parseStoredConfig('{'), {});
expect('parseStoredConfig parses valid JSON object', parseStoredConfig('{"supabaseUrl":"https://example.supabase.co"}').supabaseUrl, 'https://example.supabase.co');

// ─── saveRuntimeConfigForTesting / resolveSupabaseConfig ────────────────────

saveRuntimeConfigForTesting(' https://example.supabase.co ', ' test-anon-key ');
const resolvedStoredConfig = resolveSupabaseConfig();
expect('resolveSupabaseConfig reads stored supabaseUrl', resolvedStoredConfig.supabaseUrl, 'https://example.supabase.co');
expect('resolveSupabaseConfig reads stored supabaseAnonKey', resolvedStoredConfig.supabaseAnonKey, 'test-anon-key');

globalThis.window.BREADCRUMBS_CONFIG = {
  supabaseUrl: 'https://window.supabase.co',
  supabaseAnonKey: 'window-anon-key',
};
const resolvedWindowConfig = resolveSupabaseConfig();
expect('resolveSupabaseConfig prefers window config supabaseUrl', resolvedWindowConfig.supabaseUrl, 'https://window.supabase.co');
expect('resolveSupabaseConfig prefers window config supabaseAnonKey', resolvedWindowConfig.supabaseAnonKey, 'window-anon-key');

clearRuntimeConfigForTesting();
globalThis.window.BREADCRUMBS_CONFIG = {};
let missingConfigError = null;
try {
  resolveSupabaseConfig();
} catch (err) {
  missingConfigError = err.message;
}
expect('resolveSupabaseConfig throws when config is missing', typeof missingConfigError, 'string');

let invalidSaveError = null;
try {
  saveRuntimeConfigForTesting('', '');
} catch (err) {
  invalidSaveError = err.message;
}
expect('saveRuntimeConfigForTesting throws on blank values', typeof invalidSaveError, 'string');

saveRuntimeConfigForTesting('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
let placeholderConfigError = null;
try {
  resolveSupabaseConfig();
} catch (err) {
  placeholderConfigError = err.message;
}
expect('resolveSupabaseConfig rejects placeholder values', typeof placeholderConfigError, 'string');

clearRuntimeConfigForTesting();
expect('clearRuntimeConfigForTesting removes stored config', globalThis.localStorage.getItem(CONFIG_STORAGE_KEY), null);

globalThis.window = originalWindow;
globalThis.localStorage = originalLocalStorage;
console.error = originalConsoleError;

summarizeResults();
