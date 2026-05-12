import { expect, summarizeResults } from './test-runner.js';
import {
  isUnseenPin,
  getPinColor,
  normalizeUsername,
  normalizeStoragePath,
  buildStoragePath,
  buildPhotoUrl,
  formatPinDate,
  resolvePinOwnerName,
  isPinOwner,
  buildPinInsertPayload,
  buildSafePinHtml,
  PIN_COLOR_UNSEEN,
  PIN_COLOR_SEEN,
  PLACEHOLDER_IMAGE_PATH,
} from './pinLogic.js';

// ─── isUnseenPin ──────────────────────────────────────────────────────────────

const seenSet = new Set(['pin-001', 'pin-002']);

expect('isUnseenPin returns true for unseen pin', isUnseenPin('pin-999', seenSet), true);
expect('isUnseenPin returns false for seen pin', isUnseenPin('pin-001', seenSet), false);
expect('isUnseenPin returns true for empty set', isUnseenPin('pin-001', new Set()), true);

// ─── getPinColor ──────────────────────────────────────────────────────────────

expect('getPinColor returns unseen color for new pin', getPinColor('pin-999', seenSet), PIN_COLOR_UNSEEN);
expect('getPinColor returns seen color for viewed pin', getPinColor('pin-001', seenSet), PIN_COLOR_SEEN);

// ─── normalizeUsername ───────────────────────────────────────────────────────

expect('normalizeUsername trims whitespace', normalizeUsername('  Sofia  '), 'Sofia');
expect('normalizeUsername returns empty string for non-string', normalizeUsername(null), '');

// ─── buildStoragePath ─────────────────────────────────────────────────────────

const jpegPath = buildStoragePath({ name: 'photo.jpg' });
const pngPath = buildStoragePath({ name: 'photo.png' });
const webpPath = buildStoragePath({ name: 'photo.webp' });

expect('buildStoragePath does not prefix the bucket name', jpegPath.startsWith('pins/'), false);
expect('buildStoragePath ends with .jpg', jpegPath.endsWith('.jpg'), true);
expect('buildStoragePath ends with .png', pngPath.endsWith('.png'), true);
expect('buildStoragePath ends with .webp', webpPath.endsWith('.webp'), true);
expect('buildStoragePath generates unique paths', jpegPath !== buildStoragePath({ name: 'photo.jpg' }), true);

// ─── normalizeStoragePath ────────────────────────────────────────────────────

expect('normalizeStoragePath removes bucket prefix', normalizeStoragePath('pins/abc.jpg'), 'abc.jpg');
expect('normalizeStoragePath keeps bucket-relative path unchanged', normalizeStoragePath('abc.jpg'), 'abc.jpg');
expect('normalizeStoragePath trims whitespace', normalizeStoragePath('  pins/abc.jpg  '), 'abc.jpg');
expect('normalizeStoragePath returns empty string for non-string', normalizeStoragePath(null), '');

// ─── buildPhotoUrl ────────────────────────────────────────────────────────────

const supabaseUrl = 'https://test.supabase.co';

expect('buildPhotoUrl returns placeholder for null imagePath', buildPhotoUrl(supabaseUrl, null), PLACEHOLDER_IMAGE_PATH);
expect('buildPhotoUrl returns placeholder for empty imagePath', buildPhotoUrl(supabaseUrl, ''), PLACEHOLDER_IMAGE_PATH);
expect('buildPhotoUrl builds correct URL from bucket-relative path', buildPhotoUrl(supabaseUrl, 'abc.jpg'), 'https://test.supabase.co/storage/v1/object/public/pins/abc.jpg');
expect('buildPhotoUrl normalizes old bucket-prefixed paths', buildPhotoUrl(supabaseUrl, 'pins/abc.jpg'), 'https://test.supabase.co/storage/v1/object/public/pins/abc.jpg');

// ─── ownership helpers ───────────────────────────────────────────────────────

const ownerPin = {
  owner_name: 'Sofia',
  submitted_by: 'Someone Else',
};

expect('resolvePinOwnerName prefers owner_name', resolvePinOwnerName(ownerPin), 'Sofia');
expect('resolvePinOwnerName falls back to submitted_by', resolvePinOwnerName({ submitted_by: 'Rosa' }), 'Rosa');
expect('isPinOwner returns true for matching owner', isPinOwner(ownerPin, 'Sofia'), true);
expect('isPinOwner returns false for non-owner', isPinOwner(ownerPin, 'Mila'), false);

// ─── formatPinDate ────────────────────────────────────────────────────────────

expect('formatPinDate formats ISO timestamp to readable date', typeof formatPinDate('2026-05-10T12:00:00Z'), 'string');
expect('formatPinDate result is non-empty', formatPinDate('2026-05-10T12:00:00Z').length > 0, true);

// ─── buildPinInsertPayload ────────────────────────────────────────────────────

const cleanData = { placeName: 'Paris', note: 'Great trip', submittedBy: 'Sofia', lat: 48.8566, lng: 2.3522, photo: null };
const payload = buildPinInsertPayload(cleanData, 'abc.jpg', 'Sofia');

expect('buildPinInsertPayload sets place_name', payload.place_name, 'Paris');
expect('buildPinInsertPayload sets note', payload.note, 'Great trip');
expect('buildPinInsertPayload sets submitted_by', payload.submitted_by, 'Sofia');
expect('buildPinInsertPayload sets owner_name', payload.owner_name, 'Sofia');
expect('buildPinInsertPayload sets lat', payload.lat, 48.8566);
expect('buildPinInsertPayload sets lng', payload.lng, 2.3522);
expect('buildPinInsertPayload sets image_path', payload.image_path, 'abc.jpg');
expect('buildPinInsertPayload always sets is_legacy false', payload.is_legacy, false);

const payloadNoNote = buildPinInsertPayload({ ...cleanData, note: '' }, null, 'Sofia');
expect('buildPinInsertPayload sets empty note to null', payloadNoNote.note, null);
expect('buildPinInsertPayload sets missing image_path to null', payloadNoNote.image_path, null);

const payloadUsesOwnerName = buildPinInsertPayload({ ...cleanData, submittedBy: 'Someone Else' }, null, 'Sofia');
expect('buildPinInsertPayload keeps submitted_by aligned to owner_name for new pins', payloadUsesOwnerName.submitted_by, 'Sofia');

// ─── buildSafePinHtml ─────────────────────────────────────────────────────────

const pin = {
  place_name: '<script>Paris</script>',
  note: 'Great & wonderful',
  submitted_by: null,
  created_at: '2026-05-10T12:00:00Z',
  image_path: null,
};

const safePin = buildSafePinHtml(pin, supabaseUrl);

expect('buildSafePinHtml escapes XSS in place_name', safePin.placeName, '&lt;script&gt;Paris&lt;/script&gt;');
expect('buildSafePinHtml escapes ampersand in note', safePin.note, 'Great &amp; wonderful');
expect('buildSafePinHtml uses Anonymous for null submitted_by', safePin.submittedBy, 'Anonymous');
expect('buildSafePinHtml uses placeholder for null image_path', safePin.photoUrl, PLACEHOLDER_IMAGE_PATH);
expect('buildSafePinHtml marks placeholder images as not real photos', safePin.hasPhoto, false);

const safePinWithPhoto = buildSafePinHtml({ ...pin, image_path: 'trip.webp' }, supabaseUrl);
expect('buildSafePinHtml marks stored images as real photos', safePinWithPhoto.hasPhoto, true);

summarizeResults();
