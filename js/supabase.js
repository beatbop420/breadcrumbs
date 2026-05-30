import {
  normalizeStoragePath,
  STORAGE_BUCKET_NAME,
  buildCloudinaryImageReference,
  parseStoredImageReference,
  isCloudinaryImageReference,
} from './pinLogic.js';

let supabaseClient = null;
let photoServiceConfig = {
  cloudinaryCloudName: '',
  cloudinaryUploadPreset: '',
};
const CLOUDINARY_UPLOAD_FOLDER = 'breadcrumbs';

function normalizeOptionalConfigValue(rawValue) {
  return typeof rawValue === 'string' ? rawValue.trim() : '';
}

function isConfiguredCloudinaryValue(configValue) {
  return configValue.length > 0
    && configValue !== 'YOUR_CLOUDINARY_CLOUD_NAME'
    && configValue !== 'YOUR_CLOUDINARY_UPLOAD_PRESET';
}

function createSupabaseClient(supabaseUrl, anonKey, runtimeConfig = {}) {
  if (!supabaseUrl || !anonKey) throw new Error('[Breadcrumbs] Supabase URL and anon key are required.');
  supabaseClient = window.supabase.createClient(supabaseUrl, anonKey);
  photoServiceConfig = {
    cloudinaryCloudName: normalizeOptionalConfigValue(runtimeConfig.cloudinaryCloudName),
    cloudinaryUploadPreset: normalizeOptionalConfigValue(runtimeConfig.cloudinaryUploadPreset),
  };
}

function getClient() {
  if (!supabaseClient) throw new Error('[Breadcrumbs] Supabase client not initialized. Call createSupabaseClient first.');
  return supabaseClient;
}

function setPhotoServiceConfigForTesting(runtimeConfig = {}) {
  photoServiceConfig = {
    cloudinaryCloudName: normalizeOptionalConfigValue(runtimeConfig.cloudinaryCloudName),
    cloudinaryUploadPreset: normalizeOptionalConfigValue(runtimeConfig.cloudinaryUploadPreset),
  };
}

function resolveUploadFileName(file, normalizedPath) {
  if (typeof file?.name === 'string' && file.name.trim().length > 0) {
    return file.name.trim();
  }

  const fallbackFileName = normalizedPath.split('/').pop();
  if (typeof fallbackFileName === 'string' && fallbackFileName.trim().length > 0) {
    return fallbackFileName.trim();
  }

  return 'photo-upload';
}

function buildCloudinaryPublicId(normalizedPath) {
  const normalizedBasePath = normalizedPath.replace(/\.[^.]+$/, '');
  return `${CLOUDINARY_UPLOAD_FOLDER}/${normalizedBasePath}`;
}

function buildSupabaseStorageUploadOptions(file, upsert) {
  const uploadOptions = { upsert };
  if (file && typeof file.type === 'string' && file.type.trim().length > 0) {
    uploadOptions.contentType = file.type.trim();
  }
  return uploadOptions;
}

function buildCloudinaryUploadFormData(file, normalizedPath, actionName) {
  if (!(file instanceof Blob)) {
    throw new Error(`[Breadcrumbs] ${actionName} requires a Blob/File photo payload.`);
  }
  if (typeof FormData !== 'function') {
    throw new Error(`[Breadcrumbs] ${actionName} requires FormData support.`);
  }
  if (
    !isConfiguredCloudinaryValue(photoServiceConfig.cloudinaryCloudName)
    || !isConfiguredCloudinaryValue(photoServiceConfig.cloudinaryUploadPreset)
  ) {
    throw new Error(
      '[Breadcrumbs] Cloudinary upload is not configured. Set cloudinaryCloudName and cloudinaryUploadPreset in BREADCRUMBS_CONFIG.'
    );
  }

  const formData = new FormData();
  formData.append('file', file, resolveUploadFileName(file, normalizedPath));
  formData.append('upload_preset', photoServiceConfig.cloudinaryUploadPreset);
  formData.append('public_id', buildCloudinaryPublicId(normalizedPath));
  return formData;
}

async function uploadToCloudinary(file, storagePath, actionName) {
  getClient();
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) throw new Error(`[Breadcrumbs] ${actionName} requires a valid storage path.`);
  const formData = buildCloudinaryUploadFormData(file, normalizedPath, actionName);
  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${photoServiceConfig.cloudinaryCloudName}/image/upload`;
  const response = await fetch(uploadEndpoint, {
    method: 'POST',
    body: formData,
  });
  const uploadResult = await response.json().catch(() => null);

  if (!response.ok) {
    const cloudinaryErrorMessage = uploadResult?.error?.message || `HTTP ${response.status}`;
    throw new Error(`[Breadcrumbs] ${actionName} failed: ${cloudinaryErrorMessage}`);
  }

  if (!uploadResult || typeof uploadResult.public_id !== 'string' || typeof uploadResult.secure_url !== 'string') {
    throw new Error(`[Breadcrumbs] ${actionName} failed: Cloudinary returned an invalid upload response.`);
  }

  return buildCloudinaryImageReference({
    publicId: uploadResult.public_id,
    version: uploadResult.version,
    resourceType: uploadResult.resource_type || 'image',
    secureUrl: uploadResult.secure_url,
  });
}

async function restoreToSupabaseStorage(file, storagePath) {
  const client = getClient();
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) throw new Error('[Breadcrumbs] restorePhoto requires a valid storage path.');
  const { error } = await client.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(normalizedPath, file, buildSupabaseStorageUploadOptions(file, true));
  if (error) throw new Error(`[Breadcrumbs] restorePhoto failed: ${error.message}`);
  return normalizedPath;
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
  // Return the inserted row so the UI can draw the pin immediately instead of
  // waiting on the realtime push (which does not reliably arrive on mobile).
  const { data, error } = await client.from('pins').insert(pinPayload).select().single();
  if (error) throw new Error(`[Breadcrumbs] insertPin failed: ${error.message}`);
  return data;
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
  return uploadToCloudinary(file, storagePath, 'uploadPhoto');
}

async function downloadPhoto(storagePath) {
  if (isCloudinaryImageReference(storagePath) || /^https?:\/\//i.test(String(storagePath || '').trim())) {
    return null;
  }
  const client = getClient();
  const normalizedPath = normalizeStoragePath(storagePath);
  if (!normalizedPath) throw new Error('[Breadcrumbs] downloadPhoto requires a valid storage path.');
  const { data, error } = await client.storage.from(STORAGE_BUCKET_NAME).download(normalizedPath);
  if (error) throw new Error(`[Breadcrumbs] downloadPhoto failed: ${error.message}`);
  return data;
}

async function restorePhoto(file, storagePath) {
  const structuredReference = parseStoredImageReference(storagePath);
  if (structuredReference?.provider === 'cloudinary' || /^https?:\/\//i.test(String(storagePath || '').trim())) {
    return storagePath;
  }

  return restoreToSupabaseStorage(file, storagePath);
}

async function deletePhoto(storagePath) {
  if (isCloudinaryImageReference(storagePath) || /^https?:\/\//i.test(String(storagePath || '').trim())) {
    return null;
  }
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
  setPhotoServiceConfigForTesting,
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
