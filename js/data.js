// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const PIN_PLACE_NAME_MAX = 200;
const PIN_NOTE_MAX = 1000;
const PIN_SUBMITTED_BY_MAX = 100;
const PIN_LAT_MIN = -90;
const PIN_LAT_MAX = 90;
const PIN_LNG_MIN = -180;
const PIN_LNG_MAX = 180;
const USERNAME_MAX = 100;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// ─── SANITIZATION ────────────────────────────────────────────────────────────

function sanitizeText(rawValue) {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim();
}

function escapeHtml(rawText) {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(rawText).replace(/[&<>"']/g, (char) => escapeMap[char]);
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────

function validatePlaceName(rawValue) {
  const placeName = sanitizeText(rawValue);
  if (placeName.length === 0) return { valid: false, error: 'Place name is required.' };
  if (placeName.length > PIN_PLACE_NAME_MAX) return { valid: false, error: `Place name must be ${PIN_PLACE_NAME_MAX} characters or fewer.` };
  return { valid: true, value: placeName };
}

function validateNote(rawValue) {
  const note = sanitizeText(rawValue);
  if (note.length > PIN_NOTE_MAX) return { valid: false, error: `Memory must be ${PIN_NOTE_MAX} characters or fewer.` };
  return { valid: true, value: note };
}

function validateSubmittedBy(rawValue) {
  const submittedBy = sanitizeText(rawValue);
  if (submittedBy.length > PIN_SUBMITTED_BY_MAX) return { valid: false, error: `Name must be ${PIN_SUBMITTED_BY_MAX} characters or fewer.` };
  return { valid: true, value: submittedBy };
}

function validateLatitude(rawValue) {
  const lat = Number(rawValue);
  if (isNaN(lat)) return { valid: false, error: 'Invalid latitude.' };
  if (lat < PIN_LAT_MIN || lat > PIN_LAT_MAX) return { valid: false, error: `Latitude must be between ${PIN_LAT_MIN} and ${PIN_LAT_MAX}.` };
  return { valid: true, value: lat };
}

function validateLongitude(rawValue) {
  const lng = Number(rawValue);
  if (isNaN(lng)) return { valid: false, error: 'Invalid longitude.' };
  if (lng < PIN_LNG_MIN || lng > PIN_LNG_MAX) return { valid: false, error: `Longitude must be between ${PIN_LNG_MIN} and ${PIN_LNG_MAX}.` };
  return { valid: true, value: lng };
}

function validatePhoto(file) {
  if (!file) return { valid: true, value: null };
  if (!PHOTO_ALLOWED_TYPES.includes(file.type)) return { valid: false, error: 'Only JPG, PNG, WebP, HEIC, or HEIF photos are allowed.' };
  if (file.size > PHOTO_MAX_BYTES) return { valid: false, error: 'Photo must be under 5MB.' };
  return { valid: true, value: file };
}

function validateUsername(rawValue) {
  const username = sanitizeText(rawValue);
  if (username.length === 0) return { valid: false, error: 'Please enter your name.' };
  if (username.length > USERNAME_MAX) return { valid: false, error: `Name must be ${USERNAME_MAX} characters or fewer.` };
  return { valid: true, value: username };
}

function validatePinForm(rawFormData) {
  const errors = [];

  const placeNameResult = validatePlaceName(rawFormData.placeName);
  if (!placeNameResult.valid) errors.push(placeNameResult.error);

  const noteResult = validateNote(rawFormData.note);
  if (!noteResult.valid) errors.push(noteResult.error);

  const submittedByResult = validateSubmittedBy(rawFormData.submittedBy);
  if (!submittedByResult.valid) errors.push(submittedByResult.error);

  const latResult = validateLatitude(rawFormData.lat);
  if (!latResult.valid) errors.push(latResult.error);

  const lngResult = validateLongitude(rawFormData.lng);
  if (!lngResult.valid) errors.push(lngResult.error);

  const photoResult = validatePhoto(rawFormData.photo);
  if (!photoResult.valid) errors.push(photoResult.error);

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    cleanData: {
      placeName: placeNameResult.value,
      note: noteResult.value,
      submittedBy: submittedByResult.value,
      lat: latResult.value,
      lng: lngResult.value,
      photo: photoResult.value,
    },
  };
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export {
  sanitizeText,
  escapeHtml,
  validatePlaceName,
  validateNote,
  validateSubmittedBy,
  validateLatitude,
  validateLongitude,
  validatePhoto,
  validateUsername,
  validatePinForm,
  PIN_PLACE_NAME_MAX,
  PIN_NOTE_MAX,
  PIN_SUBMITTED_BY_MAX,
  USERNAME_MAX,
  PHOTO_ALLOWED_TYPES,
  PHOTO_MAX_BYTES,
};
