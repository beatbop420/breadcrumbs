import { escapeHtml } from './data.js';

const PIN_COLOR_UNSEEN = '#E8534A';
const PIN_COLOR_SEEN = '#A8897A';
const STORAGE_BUCKET_NAME = 'pins';
const PLACEHOLDER_IMAGE_PATH = 'assets/pin-placeholder.svg';
const CLOUDINARY_IMAGE_PROVIDER = 'cloudinary';
const STORAGE_EXTENSION_BY_MIME_TYPE = {
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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

function isNonEmptyString(rawValue) {
  return typeof rawValue === 'string' && rawValue.trim().length > 0;
}

function parseStoredImageReference(rawImagePath) {
  if (!isNonEmptyString(rawImagePath)) return null;
  const trimmedImagePath = rawImagePath.trim();
  if (!trimmedImagePath.startsWith('{')) return null;

  try {
    const parsedValue = JSON.parse(trimmedImagePath);
    return typeof parsedValue === 'object' && parsedValue !== null ? parsedValue : null;
  } catch (err) {
    return null;
  }
}

function isCloudinaryImageReference(rawImagePath) {
  const parsedReference = parseStoredImageReference(rawImagePath);
  return parsedReference?.provider === CLOUDINARY_IMAGE_PROVIDER;
}

function buildCloudinaryImageReference({ publicId, version, resourceType = 'image', secureUrl }) {
  return JSON.stringify({
    provider: CLOUDINARY_IMAGE_PROVIDER,
    publicId,
    version,
    resourceType,
    secureUrl,
  });
}

function resolveStorageExtension(file) {
  const normalizedType = typeof file?.type === 'string'
    ? file.type.trim().toLowerCase()
    : '';
  if (normalizedType && STORAGE_EXTENSION_BY_MIME_TYPE[normalizedType]) {
    return STORAGE_EXTENSION_BY_MIME_TYPE[normalizedType];
  }

  const normalizedName = typeof file?.name === 'string'
    ? file.name.trim().toLowerCase()
    : '';
  if (normalizedName.includes('.')) {
    const fallbackExtension = normalizedName.split('.').pop();
    if (fallbackExtension) return fallbackExtension;
  }

  return 'jpg';
}

function buildStoragePath(file) {
  const extension = resolveStorageExtension(file);
  const uniqueId = crypto.randomUUID();
  return `${uniqueId}.${extension}`;
}

function resolvePhotoConfig(photoConfigOrSupabaseUrl) {
  if (typeof photoConfigOrSupabaseUrl === 'string') {
    return {
      supabaseUrl: photoConfigOrSupabaseUrl,
      cloudinaryCloudName: '',
    };
  }

  if (typeof photoConfigOrSupabaseUrl === 'object' && photoConfigOrSupabaseUrl !== null) {
    return {
      supabaseUrl: isNonEmptyString(photoConfigOrSupabaseUrl.supabaseUrl)
        ? photoConfigOrSupabaseUrl.supabaseUrl.trim()
        : '',
      cloudinaryCloudName: isNonEmptyString(photoConfigOrSupabaseUrl.cloudinaryCloudName)
        ? photoConfigOrSupabaseUrl.cloudinaryCloudName.trim()
        : '',
    };
  }

  return { supabaseUrl: '', cloudinaryCloudName: '' };
}

function buildCloudinaryPhotoUrl(cloudinaryCloudName, imageReference) {
  if (!imageReference || imageReference.provider !== CLOUDINARY_IMAGE_PROVIDER) {
    return PLACEHOLDER_IMAGE_PATH;
  }

  if (isNonEmptyString(imageReference.secureUrl)) {
    return imageReference.secureUrl.trim();
  }

  if (isNonEmptyString(cloudinaryCloudName) && isNonEmptyString(imageReference.publicId)) {
    const baseUrl = `https://res.cloudinary.com/${cloudinaryCloudName}/${imageReference.resourceType || 'image'}/upload`;
    const versionSegment = isNonEmptyString(String(imageReference.version || ''))
      ? `/v${String(imageReference.version).trim()}`
      : '';
    return `${baseUrl}${versionSegment}/${imageReference.publicId}`;
  }

  return PLACEHOLDER_IMAGE_PATH;
}

function buildPhotoUrl(photoConfigOrSupabaseUrl, imagePath) {
  const photoConfig = resolvePhotoConfig(photoConfigOrSupabaseUrl);
  const imageReference = parseStoredImageReference(imagePath);
  if (imageReference?.provider === CLOUDINARY_IMAGE_PROVIDER) {
    return buildCloudinaryPhotoUrl(photoConfig.cloudinaryCloudName, imageReference);
  }

  if (isNonEmptyString(imagePath) && /^https?:\/\//i.test(imagePath.trim())) {
    return imagePath.trim();
  }

  const normalizedPath = normalizeStoragePath(imagePath);
  if (!normalizedPath) return PLACEHOLDER_IMAGE_PATH;
  return `${photoConfig.supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET_NAME}/${normalizedPath}`;
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

function buildSafePinHtml(pin, photoConfigOrSupabaseUrl) {
  const photoUrl = buildPhotoUrl(photoConfigOrSupabaseUrl, pin.image_path);
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
  parseStoredImageReference,
  isCloudinaryImageReference,
  buildCloudinaryImageReference,
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
  CLOUDINARY_IMAGE_PROVIDER,
};
