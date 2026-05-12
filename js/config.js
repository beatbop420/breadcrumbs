const CONFIG_STORAGE_KEY = 'breadcrumbs_runtime_config';

function isNonEmptyString(rawValue) {
  return typeof rawValue === 'string' && rawValue.trim().length > 0;
}

function normalizeConfigValue(rawValue) {
  return isNonEmptyString(rawValue) ? rawValue.trim() : '';
}

function isPlaceholderValue(configValue) {
  return configValue === 'YOUR_SUPABASE_URL' || configValue === 'YOUR_SUPABASE_ANON_KEY';
}

function parseStoredConfig(rawValue) {
  if (!isNonEmptyString(rawValue)) return {};

  try {
    const parsedValue = JSON.parse(rawValue);
    return typeof parsedValue === 'object' && parsedValue !== null ? parsedValue : {};
  } catch (err) {
    console.error('[Breadcrumbs] parseStoredConfig failed:', err);
    return {};
  }
}

function readWindowConfig() {
  if (typeof window === 'undefined') return {};
  return typeof window.BREADCRUMBS_CONFIG === 'object' && window.BREADCRUMBS_CONFIG !== null
    ? window.BREADCRUMBS_CONFIG
    : {};
}

function readStoredConfig() {
  if (typeof localStorage === 'undefined') return {};
  return parseStoredConfig(localStorage.getItem(CONFIG_STORAGE_KEY));
}

function resolveSupabaseConfig() {
  const windowConfig = readWindowConfig();
  const storedConfig = readStoredConfig();

  const supabaseUrl = normalizeConfigValue(windowConfig.supabaseUrl || storedConfig.supabaseUrl);
  const supabaseAnonKey = normalizeConfigValue(windowConfig.supabaseAnonKey || storedConfig.supabaseAnonKey);

  if (!isNonEmptyString(supabaseUrl) || !isNonEmptyString(supabaseAnonKey)) {
    throw new Error(
      '[Breadcrumbs] Missing runtime Supabase config. Set window.BREADCRUMBS_CONFIG or localStorage key "breadcrumbs_runtime_config".'
    );
  }

  if (isPlaceholderValue(supabaseUrl) || isPlaceholderValue(supabaseAnonKey)) {
    throw new Error('[Breadcrumbs] Runtime Supabase config still contains placeholder values.');
  }

  return { supabaseUrl, supabaseAnonKey };
}

function saveRuntimeConfigForTesting(supabaseUrl, supabaseAnonKey) {
  if (typeof localStorage === 'undefined') {
    throw new Error('[Breadcrumbs] localStorage is unavailable in this environment.');
  }

  const normalizedSupabaseUrl = normalizeConfigValue(supabaseUrl);
  const normalizedSupabaseAnonKey = normalizeConfigValue(supabaseAnonKey);

  if (!isNonEmptyString(normalizedSupabaseUrl) || !isNonEmptyString(normalizedSupabaseAnonKey)) {
    throw new Error('[Breadcrumbs] saveRuntimeConfigForTesting requires non-empty Supabase values.');
  }

  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({
      supabaseUrl: normalizedSupabaseUrl,
      supabaseAnonKey: normalizedSupabaseAnonKey,
    })
  );
}

function clearRuntimeConfigForTesting() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

export {
  CONFIG_STORAGE_KEY,
  parseStoredConfig,
  resolveSupabaseConfig,
  saveRuntimeConfigForTesting,
  clearRuntimeConfigForTesting,
};
