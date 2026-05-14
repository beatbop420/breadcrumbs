import { expect, summarizeResults } from './test-runner.js';

const originalDocument = globalThis.document;
globalThis.document = {
  addEventListener: () => {},
};

const { updatePinWithOptionalPhotoReplacement } = await import('./app.js');

// ─── updatePinWithOptionalPhotoReplacement ──────────────────────────────────

const successSequence = [];
const successUpdateCalls = [];

const updatedPin = await updatePinWithOptionalPhotoReplacement({
  pin: { id: 'pin-1', image_path: 'old-photo.jpg' },
  cleanData: {
    placeName: 'Paris',
    note: 'Spring trip',
    photo: { name: 'new-photo.webp' },
  },
  currentUsername: 'Petra',
  ensureAnonymousSessionFn: async () => {
    successSequence.push('ensure');
  },
  buildStoragePathFn: (file) => {
    successSequence.push(`build:${file.name}`);
    return 'new-photo.webp';
  },
  uploadPhotoFn: async (_file, storagePath) => {
    successSequence.push(`upload:${storagePath}`);
    return storagePath;
  },
  updatePinFn: async (pinId, updates, ownerName) => {
    successSequence.push(`update:${pinId}`);
    successUpdateCalls.push({ pinId, updates, ownerName });
    return { id: pinId, ...updates, owner_name: ownerName };
  },
  deletePhotoFn: async (storagePath) => {
    successSequence.push(`delete:${storagePath}`);
  },
});

expect('updatePinWithOptionalPhotoReplacement returns the updated pin', updatedPin.image_path, 'new-photo.webp');
expect('updatePinWithOptionalPhotoReplacement updates the place name', successUpdateCalls[0].updates.place_name, 'Paris');
expect('updatePinWithOptionalPhotoReplacement keeps the owner context', successUpdateCalls[0].ownerName, 'Petra');
expect(
  'updatePinWithOptionalPhotoReplacement deletes the previous photo only after a successful update',
  successSequence,
  ['ensure', 'build:new-photo.webp', 'upload:new-photo.webp', 'update:pin-1', 'delete:old-photo.jpg']
);

const failureSequence = [];
let failureMessage = null;

try {
  await updatePinWithOptionalPhotoReplacement({
    pin: { id: 'pin-2', image_path: 'existing-photo.jpg' },
    cleanData: {
      placeName: 'Berlin',
      note: 'Night market',
      photo: { name: 'replacement.jpg' },
    },
    currentUsername: 'Petra',
    ensureAnonymousSessionFn: async () => {
      failureSequence.push('ensure');
    },
    buildStoragePathFn: (file) => {
      failureSequence.push(`build:${file.name}`);
      return 'replacement.jpg';
    },
    uploadPhotoFn: async (_file, storagePath) => {
      failureSequence.push(`upload:${storagePath}`);
      return storagePath;
    },
    updatePinFn: async () => {
      failureSequence.push('update');
      throw new Error('Update failed');
    },
    deletePhotoFn: async (storagePath) => {
      failureSequence.push(`delete:${storagePath}`);
    },
  });
} catch (err) {
  failureMessage = err.message;
}

expect('updatePinWithOptionalPhotoReplacement rethrows update failures', failureMessage, 'Update failed');
expect(
  'updatePinWithOptionalPhotoReplacement cleans up the newly uploaded photo when the update fails',
  failureSequence.includes('delete:replacement.jpg'),
  true
);
expect(
  'updatePinWithOptionalPhotoReplacement leaves the previous photo untouched when the update fails',
  failureSequence.includes('delete:existing-photo.jpg'),
  false
);

globalThis.document = originalDocument;

summarizeResults();
