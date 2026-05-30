import { expect, summarizeResults } from './test-runner.js';
import {
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
  deletePin,
} from './supabase.js';

// ─── MOCK HELPERS ─────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

function buildMockClient({
  pinsData = [],
  pinsError = null,
  viewsData = [],
  viewsError = null,
  accountsData = [],
  accountsError = null,
  createAccountError = null,
  insertError = null,
  uploadError = null,
  downloadError = null,
  downloadData = { type: 'image/jpeg', size: 1234 },
  removeError = null,
  deletePinError = null,
  deletedPinsData = [{ id: 'pin-1', owner_name: 'Sofia', image_path: 'abc.jpg' }],
  authError = null,
  existingSession = null,
  getSessionError = null,
  authCallLog = [],
  uploadCalls = [],
  accountFilterCalls = [],
  deleteFilterCalls = [],
} = {}) {
  return {
    auth: {
      signInAnonymously: () => {
        authCallLog.push('signInAnonymously');
        return Promise.resolve(
          authError
            ? { data: null, error: { message: authError } }
            : { data: { session: { access_token: 'test-token' } }, error: null }
        );
      },
      getSession: () => {
        authCallLog.push('getSession');
        return Promise.resolve(
          getSessionError
            ? { data: null, error: { message: getSessionError } }
            : { data: { session: existingSession }, error: null }
        );
      },
    },
    from: (tableName) => ({
      select: (cols) => ({
        then: (resolve) => Promise.resolve(
          tableName === 'pins'
            ? { data: pinsData, error: pinsError ? { message: pinsError } : null }
            : tableName === 'accounts'
              ? { data: accountsData, error: accountsError ? { message: accountsError } : null }
            : { data: viewsData, error: viewsError ? { message: viewsError } : null }
        ).then(resolve),
        eq: () => ({
          then: (resolve) => Promise.resolve(
            tableName === 'accounts'
              ? { data: accountsData, error: accountsError ? { message: accountsError } : null }
              : { data: viewsData, error: viewsError ? { message: viewsError } : null }
          ).then(resolve),
        }),
        ilike: (columnName, filterValue) => {
          if (tableName === 'accounts') {
            accountFilterCalls.push({ columnName, filterValue });
          }
          return Promise.resolve(
            tableName === 'accounts'
              ? { data: accountsData, error: accountsError ? { message: accountsError } : null }
              : { data: [], error: null }
          );
        },
      }),
      insert: (payload) => ({
        select: () => ({
          single: () => Promise.resolve(
            tableName === 'accounts'
              ? (
                createAccountError
                  ? { data: null, error: { message: createAccountError } }
                  : { data: { name: payload.name }, error: null }
              )
            :
            insertError
              ? { data: null, error: { message: insertError } }
              : { data: { id: 'new-pin-id', ...payload }, error: null }
          ),
        }),
        then: (resolve) => Promise.resolve(
          insertError
            ? { data: null, error: { message: insertError, code: '99999' } }
            : { data: null, error: null }
        ).then(resolve),
      }),
      delete: () => ({
        eq: (columnName, filterValue) => ({
          ilike: (innerColumnName, innerFilterValue) => {
            deleteFilterCalls.push(
              { columnName, filterValue },
              { columnName: innerColumnName, filterValue: innerFilterValue }
            );
            return {
            select: () => Promise.resolve(
              deletePinError
                ? { data: null, error: { message: deletePinError } }
                : { data: deletedPinsData, error: null }
            ),
            };
          },
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: (path, file, options) => {
          uploadCalls.push({ path, file, options });
          return Promise.resolve(
            uploadError
              ? { error: { message: uploadError } }
              : { error: null }
          );
        },
        download: () => Promise.resolve(
          downloadError
            ? { data: null, error: { message: downloadError } }
            : { data: downloadData, error: null }
        ),
        remove: () => Promise.resolve(
          removeError
            ? { error: { message: removeError } }
            : { error: null }
        ),
      }),
    },
    channel: () => ({
      on: function() { return this; },
      subscribe: function() { return this; },
    }),
  };
}

function buildMockUploadFile(name = 'photo.jpg', type = 'image/jpeg', body = 'file-body') {
  const blob = new Blob([body], { type });
  Object.defineProperty(blob, 'name', { value: name });
  return blob;
}

// ─── createSupabaseClient ─────────────────────────────────────────────────────

let caughtError = null;
try { createSupabaseClient('', ''); } catch (err) { caughtError = err.message; }
expect('createSupabaseClient throws without URL and key', caughtError !== null, true);

// ─── getClient ────────────────────────────────────────────────────────────────

setClientForTesting(null);
let clientError = null;
try { getClient(); } catch (err) { clientError = err.message; }
expect('getClient throws when client not initialized', clientError !== null, true);

setClientForTesting(buildMockClient());
expect('getClient returns client after setClientForTesting', getClient() !== null, true);

// ─── signInAnonymously ────────────────────────────────────────────────────────

setClientForTesting(buildMockClient());
const session = await signInAnonymously();
expect('signInAnonymously returns session on success', session.access_token, 'test-token');

setClientForTesting(buildMockClient({ authError: 'Auth failed' }));
let authErr = null;
try { await signInAnonymously(); } catch (err) { authErr = err.message; }
expect('signInAnonymously throws on auth error', authErr !== null, true);

const existingSessionCallLog = [];
setClientForTesting(buildMockClient({
  existingSession: { access_token: 'existing-token' },
  authCallLog: existingSessionCallLog,
}));
const existingSession = await ensureAnonymousSession();
expect('ensureAnonymousSession returns an existing session without re-signing', existingSession.access_token, 'existing-token');
expect('ensureAnonymousSession avoids an extra anonymous sign-in when a session exists', existingSessionCallLog.includes('signInAnonymously'), false);

const fallbackSessionCallLog = [];
setClientForTesting(buildMockClient({ authCallLog: fallbackSessionCallLog }));
const fallbackSession = await ensureAnonymousSession();
expect('ensureAnonymousSession signs in when no session exists', fallbackSession.access_token, 'test-token');
expect('ensureAnonymousSession checks session state first', fallbackSessionCallLog[0], 'getSession');

setClientForTesting(buildMockClient({ getSessionError: 'Session lookup failed' }));
let getSessionErr = null;
try { await ensureAnonymousSession(); } catch (err) { getSessionErr = err.message; }
expect('ensureAnonymousSession throws when session lookup fails', getSessionErr !== null, true);

// ─── fetchAllPins ─────────────────────────────────────────────────────────────

setClientForTesting(buildMockClient({ pinsData: [{ id: 'pin-1', place_name: 'Paris' }] }));
const pins = await fetchAllPins();
expect('fetchAllPins returns array of pins', pins.length, 1);
expect('fetchAllPins returns correct pin data', pins[0].place_name, 'Paris');

setClientForTesting(buildMockClient({ pinsError: 'DB error' }));
let fetchErr = null;
try { await fetchAllPins(); } catch (err) { fetchErr = err.message; }
expect('fetchAllPins throws on DB error', fetchErr !== null, true);

// ─── account helpers ──────────────────────────────────────────────────────────

const accountFilterCalls = [];
setClientForTesting(buildMockClient({ accountsData: [{ name: 'Sofia' }], accountFilterCalls }));
const account = await fetchAccountByName('Sofia');
expect('fetchAccountByName returns account data', account.name, 'Sofia');
expect('fetchAccountByName uses case-insensitive matching', accountFilterCalls[0].columnName, 'name');

setClientForTesting(buildMockClient());
const createdAccount = await createAccount('Mila');
expect('createAccount returns inserted account', createdAccount.name, 'Mila');

setClientForTesting(buildMockClient({ accountsData: [{ name: 'Rosa' }] }));
const existingAccount = await ensureAccount('Rosa');
expect('ensureAccount returns existing account when found', existingAccount.name, 'Rosa');

setClientForTesting(buildMockClient());
const ensuredCreatedAccount = await ensureAccount('Sofia');
expect('ensureAccount creates a missing account', ensuredCreatedAccount.name, 'Sofia');

// ─── insertPin ────────────────────────────────────────────────────────────────

setClientForTesting(buildMockClient());
const newPin = await insertPin({ place_name: 'Rome', lat: 41.9, lng: 12.5 });
expect('insertPin returns the inserted row', newPin.id, 'new-pin-id');

setClientForTesting(buildMockClient({ insertError: 'Insert failed' }));
let insertErr = null;
try { await insertPin({ place_name: 'Rome', lat: 41.9, lng: 12.5 }); } catch (err) { insertErr = err.message; }
expect('insertPin throws on DB error', insertErr !== null, true);

// ─── fetchSeenPinIds ──────────────────────────────────────────────────────────

setClientForTesting(buildMockClient({ viewsData: [{ pin_id: 'pin-001' }, { pin_id: 'pin-002' }] }));
const seenSet = await fetchSeenPinIds('Sofia');
expect('fetchSeenPinIds returns a Set', seenSet instanceof Set, true);
expect('fetchSeenPinIds Set contains correct IDs', seenSet.has('pin-001'), true);
expect('fetchSeenPinIds Set size is correct', seenSet.size, 2);

setClientForTesting(buildMockClient({ viewsError: 'Views error' }));
let viewsErr = null;
try { await fetchSeenPinIds('Sofia'); } catch (err) { viewsErr = err.message; }
expect('fetchSeenPinIds throws on DB error', viewsErr !== null, true);

// ─── insertView ───────────────────────────────────────────────────────────────

setClientForTesting(buildMockClient());
let insertViewErr = null;
try { await insertView('Sofia', 'pin-001'); } catch (err) { insertViewErr = err.message; }
expect('insertView succeeds silently on success', insertViewErr, null);

// ─── uploadPhoto ──────────────────────────────────────────────────────────────

setClientForTesting(buildMockClient());
setPhotoServiceConfigForTesting({
  cloudinaryCloudName: 'family-cloud',
  cloudinaryUploadPreset: 'breadcrumbs_unsigned',
});
const uploadFetchCalls = [];
globalThis.fetch = (input, init = {}) => {
  uploadFetchCalls.push({ input, init });
  return Promise.resolve({
    ok: true,
    json: async () => ({
      public_id: 'breadcrumbs/test',
      version: 1778,
      resource_type: 'image',
      secure_url: 'https://res.cloudinary.com/family-cloud/image/upload/v1778/breadcrumbs/test.jpg',
    }),
  });
};
const storagePath = await uploadPhoto(buildMockUploadFile(), 'pins/test.jpg');
expect('uploadPhoto returns a structured Cloudinary reference on success', storagePath.includes('"provider":"cloudinary"'), true);
expect('uploadPhoto targets the Cloudinary unsigned upload endpoint', uploadFetchCalls[0].input, 'https://api.cloudinary.com/v1_1/family-cloud/image/upload');
expect('uploadPhoto sends form data to Cloudinary', uploadFetchCalls[0].init.body instanceof FormData, true);
expect('uploadPhoto sends the Cloudinary upload preset', uploadFetchCalls[0].init.body.get('upload_preset'), 'breadcrumbs_unsigned');
expect('uploadPhoto sets a deterministic public_id for Cloudinary', uploadFetchCalls[0].init.body.get('public_id'), 'breadcrumbs/test');
expect('uploadPhoto preserves content type when present', uploadFetchCalls[0].init.body.get('file').type, 'image/jpeg');

globalThis.fetch = () => Promise.resolve({
  ok: false,
  status: 400,
  json: async () => ({ error: { message: 'Upload failed' } }),
});
let uploadErr = null;
try { await uploadPhoto(buildMockUploadFile(), 'pins/test.jpg'); } catch (err) { uploadErr = err.message; }
expect('uploadPhoto throws on storage error', uploadErr !== null, true);

// ─── downloadPhoto / restorePhoto ───────────────────────────────────────────

setClientForTesting(buildMockClient({ downloadData: { type: 'image/webp', size: 2048 } }));
const downloadedPhoto = await downloadPhoto('pins/test.webp');
expect('downloadPhoto returns storage data on success', downloadedPhoto.size, 2048);
expect('downloadPhoto returns null for Cloudinary image references', await downloadPhoto(storagePath), null);

setClientForTesting(buildMockClient({ downloadError: 'Download failed' }));
let downloadErr = null;
try { await downloadPhoto('pins/test.webp'); } catch (err) { downloadErr = err.message; }
expect('downloadPhoto throws on storage download error', downloadErr !== null, true);

const restoreUploadCalls = [];
setClientForTesting(buildMockClient({ uploadCalls: restoreUploadCalls }));
const restoredPhotoPath = await restorePhoto(new Blob(['restored'], { type: 'image/png' }), 'pins/test.png');
expect('restorePhoto returns normalized storage path on success', restoredPhotoPath, 'test.png');
expect('restorePhoto uploads legacy photos back into Supabase storage', restoreUploadCalls[0].path, 'test.png');
expect('restorePhoto uploads legacy photos with upsert enabled', restoreUploadCalls[0].options.upsert, true);
expect('restorePhoto preserves content type when present', restoreUploadCalls[0].options.contentType, 'image/png');
expect('restorePhoto leaves existing Cloudinary references untouched', await restorePhoto(new Blob(['restored'], { type: 'image/png' }), storagePath), storagePath);

setClientForTesting(buildMockClient({ uploadError: 'Restore failed' }));
let restoreErr = null;
try { await restorePhoto(new Blob(['restored'], { type: 'image/png' }), 'pins/test.png'); } catch (err) { restoreErr = err.message; }
expect('restorePhoto throws on storage upload error', restoreErr !== null, true);

// ─── deletePhoto ──────────────────────────────────────────────────────────────

setClientForTesting(buildMockClient());
let deleteErr = null;
try { await deletePhoto('pins/test.jpg'); } catch (err) { deleteErr = err.message; }
expect('deletePhoto succeeds silently on success', deleteErr, null);
expect('deletePhoto no-ops for Cloudinary image references', await deletePhoto(storagePath), null);

setClientForTesting(buildMockClient({ removeError: 'Remove failed' }));
let removeErr = null;
try { await deletePhoto('pins/test.jpg'); } catch (err) { removeErr = err.message; }
expect('deletePhoto throws on storage remove error', removeErr !== null, true);

// ─── deletePin ────────────────────────────────────────────────────────────────

const deleteFilterCalls = [];
setClientForTesting(buildMockClient({ deleteFilterCalls }));
const deletedPin = await deletePin('pin-1', 'Sofia');
expect('deletePin returns the deleted pin record', deletedPin.id, 'pin-1');
expect('deletePin still filters by pin id first', deleteFilterCalls[0].columnName, 'id');
expect('deletePin matches owner name case-insensitively', deleteFilterCalls[1].columnName, 'owner_name');

setClientForTesting(buildMockClient({ deletedPinsData: [] }));
let missingDeleteErr = null;
try { await deletePin('pin-1', 'Sofia'); } catch (err) { missingDeleteErr = err.message; }
expect('deletePin throws when no pin is deleted for the owner', missingDeleteErr !== null, true);

setClientForTesting(buildMockClient({ deletePinError: 'Delete failed' }));
let deletePinErr = null;
try { await deletePin('pin-1', 'Sofia'); } catch (err) { deletePinErr = err.message; }
expect('deletePin throws on delete error', deletePinErr !== null, true);

globalThis.fetch = originalFetch;

summarizeResults();
