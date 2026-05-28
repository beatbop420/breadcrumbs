import { expect, summarizeResults } from './test-runner.js';
import {
  normalizePhotoMimeType,
  requiresPhotoNormalization,
  buildNormalizedPhotoName,
  normalizePhotoForUpload,
  PHOTO_NORMALIZATION_INPUT_TYPES,
  PHOTO_NORMALIZATION_OUTPUT_TYPE,
} from './photoProcessing.js';

expect('normalizePhotoMimeType lowercases and trims values', normalizePhotoMimeType(' Image/HEIC '), 'image/heic');
expect('normalizePhotoMimeType returns empty string for invalid input', normalizePhotoMimeType(null), '');

expect('requiresPhotoNormalization detects HEIC by MIME type', requiresPhotoNormalization({ type: 'image/heic', name: 'IMG_1.HEIC' }), true);
expect('requiresPhotoNormalization detects HEIF by extension', requiresPhotoNormalization({ type: '', name: 'IMG_2.HEIF' }), true);
expect('requiresPhotoNormalization skips jpeg files', requiresPhotoNormalization({ type: 'image/jpeg', name: 'IMG_3.JPG' }), false);
expect('PHOTO_NORMALIZATION_INPUT_TYPES includes HEIC', PHOTO_NORMALIZATION_INPUT_TYPES.includes('image/heic'), true);

expect('buildNormalizedPhotoName preserves the base filename', buildNormalizedPhotoName({ name: 'IMG_0001.HEIC' }), 'IMG_0001.jpg');
expect('buildNormalizedPhotoName falls back to a generic filename', buildNormalizedPhotoName({ name: '' }), 'photo.jpg');

class MockFile {
  constructor(parts, name, options = {}) {
    this.parts = parts;
    this.name = name;
    this.type = options.type || '';
    this.lastModified = options.lastModified || 0;
    this.size = parts.reduce((total, part) => total + (part.size || 0), 0);
  }
}

const revokeCalls = [];
const imageBitmap = {
  width: 320,
  height: 180,
  closeCalled: false,
  close() {
    this.closeCalled = true;
  },
};

const normalizedFile = await normalizePhotoForUpload(
  { type: 'image/heic', name: 'vacation.HEIC' },
  {
    createObjectUrl: () => 'blob:vacation',
    revokeObjectUrl: (objectUrl) => revokeCalls.push(objectUrl),
    createImageBitmapFn: async () => imageBitmap,
    createCanvasFn: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (...args) => {
          globalThis.__drawImageArgs = args;
        },
      }),
    }),
    canvasToBlobFn: async (canvas, type, quality) => ({
      size: canvas.width * canvas.height,
      type,
      quality,
    }),
    FileCtor: MockFile,
  }
);

expect('normalizePhotoForUpload converts HEIC photos to JPEG files', normalizedFile.type, PHOTO_NORMALIZATION_OUTPUT_TYPE);
expect('normalizePhotoForUpload renames the output file to .jpg', normalizedFile.name, 'vacation.jpg');
expect('normalizePhotoForUpload revokes the temporary object URL', revokeCalls, ['blob:vacation']);
expect('normalizePhotoForUpload releases ImageBitmap resources', imageBitmap.closeCalled, true);
expect('normalizePhotoForUpload draws the decoded image onto a canvas', globalThis.__drawImageArgs.length, 5);

const untouchedFile = { type: 'image/jpeg', name: 'already-good.jpg' };
expect('normalizePhotoForUpload returns already-supported files unchanged', await normalizePhotoForUpload(untouchedFile, { FileCtor: MockFile }), untouchedFile);

let normalizeError = null;
try {
  await normalizePhotoForUpload(
    { type: 'image/heif', name: 'broken.heif' },
    {
      createObjectUrl: () => 'blob:broken',
      revokeObjectUrl: () => {},
      createImageBitmapFn: async () => ({ width: 0, height: 0 }),
      createCanvasFn: () => ({
        getContext: () => ({ drawImage: () => {} }),
      }),
      FileCtor: MockFile,
    }
  );
} catch (err) {
  normalizeError = err.message;
}

expect('normalizePhotoForUpload throws on undecodable images', Boolean(normalizeError?.includes('dimensions')), true);

let timeoutCleared = false;
let timeoutError = null;
try {
  await normalizePhotoForUpload(
    { type: 'image/heic', name: 'stuck.HEIC' },
    {
      createObjectUrl: () => 'blob:stuck',
      revokeObjectUrl: () => {},
      createImageBitmapFn: () => new Promise(() => {}),
      FileCtor: MockFile,
      normalizationTimeoutMs: 50,
      setTimeoutFn: (handler) => {
        queueMicrotask(handler);
        return 'timer-1';
      },
      clearTimeoutFn: (timerId) => {
        timeoutCleared = timerId === 'timer-1';
      },
    }
  );
} catch (err) {
  timeoutError = err.message;
}
expect('normalizePhotoForUpload times out stuck HEIC decoding', Boolean(timeoutError?.includes('timed out')), true);
expect('normalizePhotoForUpload clears the normalization timeout', timeoutCleared, true);

delete globalThis.__drawImageArgs;

summarizeResults();
