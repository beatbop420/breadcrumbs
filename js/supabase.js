import { normalizeStoragePath, STORAGE_BUCKET_NAME } from './pinLogic.js';

let supabaseClient = null;

function createSupabaseClient(supabaseUrl, anonKey) {
  if (!supabaseUrl || !anonKey) throw new Error('[Breadcrumbs] Supabase URL and anon key are required.');
  supabaseClient = window.supabase.createClient(supabaseUrl, anonKey);
}

function getClient() {
  if (!supabaseClient) throw new Error('[Breadcrumbs] Supabase client not initialized. Call createSupabaseClient first.');
  return supabaseClient;
}

function setClientForTesting(mockClient) {
  supabaseClient = mockClient;
}

async function signInAnonymously() {
  const client = getClient();
  const { data: sessionData, error } = await client.auth.signInAnonymously();
  if (error) throw new Error(`[Breadcrumbs] signInAnonymously failed: ${error.message}`);
  return sessionData.session;
}

async function ensureAnonymousSession() {
  const client = getClient();

  if (typeof client.auth?.getSession === 'function') {
    const { data: sessionData, error } = await client.auth.getSession();
    if (error) throw new Error(`[Breadcrumbs] getSession failed: ${error.message}`);
    if (sessionData?.session) return sessionData.session;
  }

  return signInAnonymously();
}

async function fetchAllPins() {
  const client = getClient();
  const { data: pinRows, error } = await client.from('pins').select('*');
  if (error) throw new Error(`[Breadcrumbs] fetchAllPins failed: ${error.message}`);
  return pinRows;
}

async function fetchAccountByName(username) {
  const client = getClient();
  const { data: accountRows, error } = await client.from('accounts').select('name').ilike('name', username);
  if (error) throw new Error(`[Breadcrumbs] fetchAccountByName failed: ${error.message}`);
  return Array.isArray(accountRows) && accountRows.length > 0 ? accountRows[0] : null;
}

async function createAccount(username) {
  const client = getClient();
  const { data: insertedAccount, error } = await client.from('accounts').insert({ name: username }).select().single();
  if (error) throw new Error(`[Breadcrumbs] createAccount failed: ${error.message}`);
  return insertedAccount;
}

async function ensureAccount(username) {
  const existingAccount = await fetchAccountByName(username);
  if (existingAccount) return existingAccount;

  try {
    return await createAccount(username);
  } catch (err) {
    const duplicateDetected = err.message.includes('duplicate') || err.message.includes('unique');
    if (!duplicateDetected) throw err;

    const accountAfterDuplicate = await fetchAccountByName(username);
    if (accountAfterDuplicate) return accountAfterDuplicate;
    throw err;
  }
}

async function insertPin(pinPayload) {
  const client = getClient();
  const { error } = await client.from('pins').insert(pinPayload);
  if (error) throw new Error(`[Breadcrumbs] insertPin failed: ${error.message}`);
  return null;
}

async function fetchSeenPinIds(username) {
  const client = getClient();
  const { data: viewRows, error } = await client.from('views').select('pin_id').eq('username', username);
  if (error) throw new Error(`[Breadcrumbs] fetchSeenPinIds failed: ${error.message}`);
  return new Set(viewRows.map((row) => row.pin_id));
}

async function insertView(username, pinId) {
  const client = getClient();
  const { error } = await client.from('views').insert({ username, pin_id: pinId });
  if (error && error.code !== '23505') throw new Error(`[Breadcrumbs] insertView failed: ${error.message}`);
}

async function uploadPhoto(file, storagePath) {
  const client = getClient();
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) throw new Error('[Breadcrumbs] uploadPhoto requires a valid storage path.');
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).upload(normalizedPath, file, { upsert: false });
  if (error) throw new Error(`[Breadcrumbs] uploadPhoto failed: ${error.message}`);
  return normalizedPath;
}

async function downloadPhoto(storagePath) {
  const client = getClient();
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) throw new Error('[Breadcrumbs] downloadPhoto requires a valid storage path.');
  const { data, error } = await client.storage.from(STORAGE_BUCKET_NAME).download(normalizedPath);
  if (error) throw new Error(`[Breadcrumbs] downloadPhoto failed: ${error.message}`);
  return data;
}

async function restorePhoto(file, storagePath) {
  const client = getClient();
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) throw new Error('[Breadcrumbs] restorePhoto requires a valid storage path.');
  const uploadOptions = { upsert: true };
  if (file && typeof file.type === 'string' && file.type.length > 0) {
    uploadOptions.contentType = file.type;
  }
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).upload(normalizedPath, file, uploadOptions);
  if (error) throw new Error(`[Breadcrumbs] restorePhoto failed: ${error.message}`);
  return normalizedPath;
}

async function deletePhoto(storagePath) {
  const client = getClient();
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) throw new Error('[Breadcrumbs] deletePhoto requires a valid storage path.');
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).remove([normalizedPath]);
  if (error) throw new Error(`[Breadcrumbs] deletePhoto failed: ${error.message}`);
}

async function updatePin(pinId, updates, ownerName) {
  const client = getClient();
  const { data: updatedRows, error } = await client
    .from('pins')
    .update(updates)
    .eq('id', pinId)
    .ilike('owner_name', ownerName)
    .select('*');
  if (error) throw new Error(`[Breadcrumbs] updatePin failed: ${error.message}`);
  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    throw new Error('[Breadcrumbs] updatePin failed: pin not found for this owner.');
  }
  return updatedRows[0];
}

async function deletePin(pinId, ownerName) {
  const client = getClient();
  const { data: deletedPinRows, error } = await client
    .from('pins')
    .delete()
    .eq('id', pinId)
    .ilike('owner_name', ownerName)
    .select('*');

  if (error) throw new Error(`[Breadcrumbs] deletePin failed: ${error.message}`);
  if (!Array.isArray(deletedPinRows) || deletedPinRows.length === 0) {
    throw new Error('[Breadcrumbs] deletePin failed: pin not found for this owner.');
  }

  return deletedPinRows[0];
}

function subscribeToNewPins(onNewPin) {
  const client = getClient();
  client
    .channel('pins-inserts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, (payload) => {
      onNewPin(payload.new);
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') console.error('[Breadcrumbs] Realtime subscription error');
      if (status === 'SUBSCRIBED') console.info('[Breadcrumbs] Realtime subscribed to pins');
    });
}

export {
  createSupabaseClient,
  getClient,
  setClientForTesting,
  signInAnonymously,
  ensureAnonymousSession,
  fetchAllPins,
  fetchAccountByName,
  createAccount,
  ensureAccount,
  insertPin,
  fetchSeenPinIds,
  insertView,
  uploadPhoto,
  downloadPhoto,
  restorePhoto,
  deletePhoto,
  updatePin,
  deletePin,
  subscribeToNewPins,
};
