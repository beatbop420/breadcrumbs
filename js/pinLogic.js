import { escapeHtml } from './data.js';

const PIN_COLOR_UNSEEN = '#E8534A';
const PIN_COLOR_SEEN = '#A8897A';
const STORAGE_BUCKET_NAME = 'pins';
const PLACEHOLDER_IMAGE_PATH = 'assets/pin-placeholder.svg';

function isUnseenPin(pinId, seenPinSet) {
  return !seenPinSet.has(pinId);
}

function getPinColor(pinId, seenPinSet) {
  return isUnseenPin(pinId, seenPinSet) ? PIN_COLOR_UNSEEN : PIN_COLOR_SEEN;
}

function normalizeUsername(rawUsername) {
  if (typeof rawUsername !== 'string') return '';
  return rawUsername.trim();
}

function normalizeUsernameIdentity(rawUsername) {
  return normalizeUsername(rawUsername).toLowerCase();
}

function normalizeStoragePath(rawPath) {
  if (typeof rawPath !== 'string') return '';
  return rawPath.trim().replace(/^\/?pins\//, '');
}

function buildStoragePath(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  const uniqueId = crypto.randomUUID();
  return `${uniqueId}.${extension}`;
}

function buildPhotoUrl(supabaseUrl, imagePath) {
  const normalizedPath = normalizeStoragePath(imagePath);
  if (!normalizedPath) return PLACEHOLDER_IMAGE_PATH;
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET_NAME}/${normalizedPath}`;
}

function formatPinDate(isoTimestamp) {
  const date = new Date(isoTimestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function resolvePinOwnerName(pin) {
  const ownerName = normalizeUsername(pin?.owner_name);
  if (ownerName) return ownerName;
  return normalizeUsername(pin?.submitted_by);
}

function isPinOwner(pin, currentUsername) {
  const ownerName = normalizeUsernameIdentity(resolvePinOwnerName(pin));
  const currentIdentity = normalizeUsernameIdentity(currentUsername);
  return ownerName.length > 0 && ownerName === currentIdentity;
}

function buildPinInsertPayload(cleanData, imagePath, ownerName) {
  const normalizedOwnerName = normalizeUsername(ownerName);
  return {
    place_name: cleanData.placeName,
    note: cleanData.note || null,
    submitted_by: normalizedOwnerName || cleanData.submittedBy || null,
    owner_name: normalizedOwnerName,
    lat: cleanData.lat,
    lng: cleanData.lng,
    image_path: imagePath || null,
    is_legacy: false,
  };
}

function buildSafePinHtml(pin, supabaseUrl) {
  const photoUrl = buildPhotoUrl(supabaseUrl, pin.image_path);
  return {
    placeName: escapeHtml(pin.place_name),
    note: escapeHtml(pin.note || ''),
    submittedBy: escapeHtml(pin.submitted_by || 'Anonymous'),
    date: formatPinDate(pin.created_at),
    photoUrl,
    hasPhoto: photoUrl !== PLACEHOLDER_IMAGE_PATH,
  };
}

export {
  isUnseenPin,
  getPinColor,
  normalizeUsername,
  normalizeUsernameIdentity,
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
  STORAGE_BUCKET_NAME,
  PLACEHOLDER_IMAGE_PATH,
};
