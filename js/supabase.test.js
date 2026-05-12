import { expect, summarizeResults } from './test-runner.js';
import {
  createSupabaseClient,
  getClient,
  setClientForTesting,
  signInAnonymously,
  fetchAllPins,
  fetchAccountByName,
  createAccount,
  ensureAccount,
  insertPin,
  fetchSeenPinIds,
  insertView,
  uploadPhoto,
  deletePhoto,
  deletePin,
} from './supabase.js';

// ─── MOCK HELPERS ─────────────────────────────────────────────────────────────

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
  removeError = null,
  deletePinError = null,
  deletedPinsData = [{ id: 'pin-1', owner_name: 'Sofia', image_path: 'abc.jpg' }],
  authError = null,
} = {}) {
  return {
    auth: {
      signInAnonymously: () => Promise.resolve(
        authError
          ? { data: null, error: { message: authError } }
          : { data: { session: { access_token: 'test-token' } }, error: null }
      ),
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
        eq: () => ({
          eq: () => ({
            select: () => Promise.resolve(
              deletePinError
                ? { data: null, error: { message: deletePinError } }
                : { data: deletedPinsData, error: null }
            ),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve(
          uploadError
            ? { error: { message: uploadError } }
            : { error: null }
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

setClientForTesting(buildMockClient({ accountsData: [{ name: 'Sofia' }] }));
const account = await fetchAccountByName('Sofia');
expect('fetchAccountByName returns account data', account.name, 'Sofia');

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
expect('insertPin succeeds without returning a row', newPin, null);

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
const storagePath = await uploadPhoto({ name: 'photo.jpg' }, 'pins/test.jpg');
expect('uploadPhoto returns normalized storage path on success', storagePath, 'test.jpg');

setClientForTesting(buildMockClient({ uploadError: 'Upload failed' }));
let uploadErr = null;
try { await uploadPhoto({ name: 'photo.jpg' }, 'pins/test.jpg'); } catch (err) { uploadErr = err.message; }
expect('uploadPhoto throws on storage error', uploadErr !== null, true);

// ─── deletePhoto ──────────────────────────────────────────────────────────────

setClientForTesting(buildMockClient());
let deleteErr = null;
try { await deletePhoto('pins/test.jpg'); } catch (err) { deleteErr = err.message; }
expect('deletePhoto succeeds silently on success', deleteErr, null);

setClientForTesting(buildMockClient({ removeError: 'Remove failed' }));
let removeErr = null;
try { await deletePhoto('pins/test.jpg'); } catch (err) { removeErr = err.message; }
expect('deletePhoto throws on storage remove error', removeErr !== null, true);

// ─── deletePin ────────────────────────────────────────────────────────────────

setClientForTesting(buildMockClient());
const deletedPin = await deletePin('pin-1', 'Sofia');
expect('deletePin returns the deleted pin record', deletedPin.id, 'pin-1');

setClientForTesting(buildMockClient({ deletedPinsData: [] }));
let missingDeleteErr = null;
try { await deletePin('pin-1', 'Sofia'); } catch (err) { missingDeleteErr = err.message; }
expect('deletePin throws when no pin is deleted for the owner', missingDeleteErr !== null, true);

setClientForTesting(buildMockClient({ deletePinError: 'Delete failed' }));
let deletePinErr = null;
try { await deletePin('pin-1', 'Sofia'); } catch (err) { deletePinErr = err.message; }
expect('deletePin throws on delete error', deletePinErr !== null, true);

summarizeResults();
