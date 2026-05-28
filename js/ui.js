import { validatePinForm, validateUsername, PIN_NOTE_MAX, PIN_PLACE_NAME_MAX } from './data.js';
import { normalizeUsername } from './pinLogic.js';
import { normalizePhotoForUpload, requiresPhotoNormalization } from './photoProcessing.js';

const TOAST_DURATION_MS = 1600;
const PHOTO_UPLOAD_DEFAULT_LABEL = 'Choose a photo';
const PHOTO_UPLOAD_DEFAULT_STATUS = 'No photo selected';
const ADD_SUBMIT_DEFAULT_LABEL = 'Save Memory';
const ADD_SUBMIT_EDIT_LABEL = 'Save Changes';
const ADD_SUBMIT_LOADING_LABEL = 'Saving...';
const BYTES_PER_MB = 1024 * 1024;
const ADD_MODAL_COUNTER_CONFIGS = [
  { inputId: 'add-note', counterId: 'note-counter', maxLength: PIN_NOTE_MAX },
  { inputId: 'add-place-name', counterId: 'place-name-counter', maxLength: PIN_PLACE_NAME_MAX },
];

let usernameSubmitHandler = null;
let addPinSubmitHandler = null;
let charCountersInitialized = false;
let usernamePromptInitialized = false;
let addPinFormInitialized = false;
let addPhotoPreviewObjectUrl = null;
let isEditMode = false;

function showElement(elementId) {
  document.getElementById(elementId).classList.remove('hidden');
}

function hideElement(elementId) {
  document.getElementById(elementId).classList.add('hidden');
}

function setElementText(elementId, text) {
  document.getElementById(elementId).textContent = text;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  showElement('toast');
  setTimeout(() => hideElement('toast'), TOAST_DURATION_MS);
}

function parseCssTimeToMs(cssTimeValue) {
  const normalizedValue = String(cssTimeValue || '').trim();
  if (normalizedValue.endsWith('ms')) return Number.parseFloat(normalizedValue) || 0;
  if (normalizedValue.endsWith('s')) return (Number.parseFloat(normalizedValue) || 0) * 1000;
  return 0;
}

function getTransitionTimeoutMs(transitionDurationValue, transitionDelayValue) {
  const durationValues = String(transitionDurationValue || '0s').split(',');
  const delayValues = String(transitionDelayValue || '0s').split(',');
  const pairCount = Math.max(durationValues.length, delayValues.length);

  let longestTransitionMs = 0;

  for (let index = 0; index < pairCount; index += 1) {
    const durationMs = parseCssTimeToMs(durationValues[index] || durationValues[durationValues.length - 1]);
    const delayMs = parseCssTimeToMs(delayValues[index] || delayValues[delayValues.length - 1]);
    longestTransitionMs = Math.max(longestTransitionMs, durationMs + delayMs);
  }

  return longestTransitionMs;
}

function showSplash() {
  const splash = document.getElementById('splash');
  splash.classList.remove('splash--fading');
  showElement('splash');
}

function hideSplash(onDone) {
  const splash = document.getElementById('splash');
  let didFinish = false;

  function finishHideSplash() {
    if (didFinish) return;
    didFinish = true;
    splash.classList.remove('splash--fading');
    hideElement('splash');
    onDone();
  }

  splash.classList.add('splash--fading');
  const splashStyle = window.getComputedStyle(splash);
  const transitionTimeoutMs = getTransitionTimeoutMs(
    splashStyle.transitionDuration,
    splashStyle.transitionDelay
  );

  if (transitionTimeoutMs === 0) {
    finishHideSplash();
    return;
  }

  const fallbackTimerId = window.setTimeout(finishHideSplash, transitionTimeoutMs + 50);
  splash.addEventListener('transitionend', () => {
    window.clearTimeout(fallbackTimerId);
    finishHideSplash();
  }, { once: true });
}

function initializeUsernamePrompt() {
  if (usernamePromptInitialized) return;
  usernamePromptInitialized = true;

  const usernameForm = document.getElementById('username-form');
  usernameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const rawUsername = document.getElementById('username-input').value;
    const usernameResult = validateUsername(rawUsername);

    if (!usernameResult.valid) {
      setElementText('username-error', usernameResult.error);
      return;
    }

    setElementText('username-error', '');
    hideElement('username-prompt');

    if (typeof usernameSubmitHandler === 'function') {
      usernameSubmitHandler(usernameResult.value);
    }
  });
}

function hideUsernamePrompt() {
  hideElement('username-prompt');
  usernameSubmitHandler = null;
}

function showUsernamePrompt(onSubmit, mode = 'initial') {
  initializeUsernamePrompt();
  usernameSubmitHandler = onSubmit;
  document.getElementById('username-input').value = '';
  setElementText('username-error', '');
  const subtitle = mode === 'switch'
    ? 'Who\'s here now?'
    : 'Use the same name on any device to find your way back.';
  setElementText('username-prompt-subtitle', subtitle);
  const closeBtn = document.getElementById('username-close');
  if (mode === 'switch') {
    closeBtn.classList.remove('hidden');
  } else {
    closeBtn.classList.add('hidden');
  }
  showElement('username-prompt');
}

const buildActiveUsernameLabel = normalizeUsername;

function getAddModalIdleLabel(isEditMode) {
  return isEditMode ? ADD_SUBMIT_EDIT_LABEL : ADD_SUBMIT_DEFAULT_LABEL;
}

function resolveExistingPinPlaceName(existingPin) {
  if (!existingPin || typeof existingPin !== 'object') return '';
  if (typeof existingPin.placeName === 'string' && existingPin.placeName.trim().length > 0) {
    return existingPin.placeName;
  }
  if (typeof existingPin.place_name === 'string') {
    return existingPin.place_name;
  }
  return '';
}

function setActiveUsernameDisplay(username) {
  const activeUsername = buildActiveUsernameLabel(username);
  if (activeUsername.length === 0) {
    hideElement('active-username-badge');
    setElementText('active-username-value', '');
    return;
  }

  setElementText('active-username-value', activeUsername);
  showElement('active-username-badge');
}

function setCharCounter(inputId, counterId, maxLength) {
  const counterInput = document.getElementById(inputId);
  const counterElement = document.getElementById(counterId);
  counterElement.textContent = `${counterInput.value.length}/${maxLength}`;
}

function syncAddModalCounters() {
  ADD_MODAL_COUNTER_CONFIGS.forEach(({ inputId, counterId, maxLength }) => {
    setCharCounter(inputId, counterId, maxLength);
  });
}

function formatDebugFileSize(file) {
  const fileSize = Number(file?.size || 0);
  if (!Number.isFinite(fileSize) || fileSize <= 0) return 'unknown size';
  return `${(fileSize / BYTES_PER_MB).toFixed(2)} MB`;
}

function formatDebugFileType(file) {
  return typeof file?.type === 'string' && file.type.trim().length > 0
    ? file.type.trim()
    : 'unknown type';
}

function buildUploadDebugInfo(file, stage = '') {
  if (!file) return 'Upload debug: no photo selected';
  const fileName = typeof file.name === 'string' && file.name.trim().length > 0
    ? file.name.trim()
    : 'unnamed file';
  const stageLabel = stage ? `${stage} | ` : '';
  return `Upload debug: ${stageLabel}${fileName} | ${formatDebugFileType(file)} | ${formatDebugFileSize(file)}`;
}

function getSelectedPhotoStatus(file) {
  if (!file || typeof file.name !== 'string' || file.name.trim().length === 0) {
    return PHOTO_UPLOAD_DEFAULT_STATUS;
  }
  return `Selected: ${file.name.trim()} (${formatDebugFileType(file)}, ${formatDebugFileSize(file)})`;
}

function revokeAddPhotoPreviewUrl() {
  if (!addPhotoPreviewObjectUrl) return;
  URL.revokeObjectURL(addPhotoPreviewObjectUrl);
  addPhotoPreviewObjectUrl = null;
}

function setAddPhotoPreviewFromUrl(url) {
  revokeAddPhotoPreviewUrl();
  const previewImage = document.getElementById('add-photo-preview');
  const previewWrap = document.getElementById('add-photo-preview-wrap');
  const photoLabel = document.getElementById('add-photo-label');
  const photoTrigger = document.getElementById('add-photo-trigger');
  const photoStatus = document.getElementById('add-photo-status');

  previewImage.src = url;
  previewImage.alt = 'Selected photo preview';
  previewWrap.classList.remove('hidden');
  photoLabel.textContent = 'Change photo';
  photoTrigger.classList.add('upload-btn--selected');
  photoStatus.textContent = 'Photo ready (uploaded via Shortcut)';
}

function setAddPhotoPreview(file) {
  const previewImage = document.getElementById('add-photo-preview');

  revokeAddPhotoPreviewUrl();

  if (!file) {
    previewImage.src = '';
    previewImage.alt = 'Selected photo preview';
    hideElement('add-photo-preview-wrap');
    return;
  }

  previewImage.alt = `Selected photo preview: ${file.name || 'photo'}`;
  addPhotoPreviewObjectUrl = URL.createObjectURL(file);
  previewImage.src = addPhotoPreviewObjectUrl;
  showElement('add-photo-preview-wrap');
}

function syncAddPhotoSelection() {
  const photoInput = document.getElementById('add-photo');
  const photoTrigger = document.getElementById('add-photo-trigger');
  const photoLabel = document.getElementById('add-photo-label');
  const photoStatus = document.getElementById('add-photo-status');
  const selectedFile = photoInput.files[0] || null;
  const hasSelectedFile = Boolean(selectedFile);

  photoLabel.textContent = hasSelectedFile ? 'Photo selected' : PHOTO_UPLOAD_DEFAULT_LABEL;
  photoStatus.textContent = getSelectedPhotoStatus(selectedFile);
  photoTrigger.classList.toggle('upload-btn--selected', hasSelectedFile);
  setAddPhotoPreview(selectedFile);
}

function clearAddPhotoInput() {
  document.getElementById('add-photo').value = '';
  syncAddPhotoSelection();
}

function buildAddPinFormData() {
  return {
    placeName: document.getElementById('add-place-name').value,
    note: document.getElementById('add-note').value,
    submittedBy: document.getElementById('add-submitted-by').value,
    lat: document.getElementById('add-lat').value,
    lng: document.getElementById('add-lng').value,
    photo: document.getElementById('add-photo').files[0] || null,
  };
}

function initializeAddPinForm() {
  if (addPinFormInitialized) return;
  addPinFormInitialized = true;

  const form = document.getElementById('add-pin-form');
  const photoInput = document.getElementById('add-photo');

  photoInput.addEventListener('change', syncAddPhotoSelection);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const rawFormData = buildAddPinFormData();
    const originalPhoto = rawFormData.photo;
    if (originalPhoto) {
      setElementText('add-error', buildUploadDebugInfo(originalPhoto, 'selected'));
    }
    if (requiresPhotoNormalization(rawFormData.photo)) {
      try {
        setElementText('add-error', buildUploadDebugInfo(rawFormData.photo, 'normalizing'));
        rawFormData.photo = await normalizePhotoForUpload(rawFormData.photo);
        setElementText('add-error', buildUploadDebugInfo(rawFormData.photo, 'normalized'));
      } catch (err) {
        console.warn('[Breadcrumbs] normalizePhotoForUpload failed, falling back to raw upload:', err);
        setElementText('add-error', `${buildUploadDebugInfo(originalPhoto, 'normalization failed')} | ${err.message}`);
      }
    }
    const validationResult = validatePinForm(rawFormData);

    if (!validationResult.valid) {
      setElementText('add-error', `${validationResult.errors.join(' ')} ${buildUploadDebugInfo(rawFormData.photo, 'validation failed')}`);
      return;
    }

    if (rawFormData.photo) {
      setElementText('add-error', buildUploadDebugInfo(rawFormData.photo, 'uploading'));
    } else {
      setElementText('add-error', '');
    }
    if (typeof addPinSubmitHandler !== 'function') return;

    try {
      await addPinSubmitHandler(validationResult.cleanData);
    } catch (err) {
      console.error('[Breadcrumbs] addPinSubmitHandler failed:', err);
      showAddModalSubmitError(`Something went wrong. ${buildUploadDebugInfo(validationResult.cleanData.photo, 'submit failed')}`);
    }
  });
}

function showAddModal(latlng, prefillUsername, onSubmit, existingPin = null) {
  initializeAddPinForm();
  addPinSubmitHandler = onSubmit;

  const addPinForm = document.getElementById('add-pin-form');
  addPinForm.reset();

  const isEdit = Boolean(existingPin);
  isEditMode = isEdit;
  document.querySelector('#modal-add .modal__title').textContent = isEdit ? 'Edit Memory' : 'Drop a Crumb';
  document.getElementById('add-submit-btn').textContent = getAddModalIdleLabel(isEdit);

  document.getElementById('add-lat').value = latlng.lat;
  document.getElementById('add-lng').value = latlng.lng;
  document.getElementById('add-submitted-by').value = prefillUsername || '';

  if (isEdit) {
    document.getElementById('add-place-name').value = resolveExistingPinPlaceName(existingPin);
    document.getElementById('add-note').value = existingPin.note || '';
  }

  clearAddPhotoInput();
  setElementText('add-error', '');
  syncAddModalCounters();
  showElement('modal-add');
}

function hideAddModal() {
  addPinSubmitHandler = null;
  setAddModalSubmitting(false);
  isEditMode = false;
  hideElement('modal-add');
  document.getElementById('add-pin-form').reset();
  clearAddPhotoInput();
  setElementText('add-error', '');
  syncAddModalCounters();
}

function setAddModalSubmitting(isSubmitting) {
  const submitButton = document.getElementById('add-submit-btn');
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? ADD_SUBMIT_LOADING_LABEL : getAddModalIdleLabel(isEditMode);
}

function showAddModalSubmitError(errorMessage) {
  clearAddPhotoInput();
  setElementText('add-error', errorMessage);
}

function hidePhotoLightbox() {
  const lightboxImage = document.getElementById('photo-lightbox-image');
  lightboxImage.src = '';
  lightboxImage.alt = '';
  hideElement('photo-lightbox');
}

function showPhotoLightbox(photoUrl, photoAlt) {
  if (!photoUrl) return;
  const lightboxImage = document.getElementById('photo-lightbox-image');
  lightboxImage.src = photoUrl;
  lightboxImage.alt = photoAlt || '';
  showElement('photo-lightbox');
}

function initializePhotoLightbox() {
  const closeButton = document.getElementById('photo-lightbox-close');

  if (closeButton.dataset.initialized === 'true') return;
  closeButton.dataset.initialized = 'true';

  closeButton.addEventListener('click', hidePhotoLightbox);
  const lightbox = document.getElementById('photo-lightbox');
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) hidePhotoLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hidePhotoLightbox();
  });
}

function setOptionalActionButton(buttonId, isVisible, onClick) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.onclick = null;
  if (isVisible) {
    showElement(buttonId);
    button.onclick = onClick;
    return;
  }

  hideElement(buttonId);
}

function showViewModal(safePin, viewOptions = {}) {
  initializePhotoLightbox();
  setElementText('view-place-name', safePin.placeName);
  setElementText('view-note', safePin.note);
  setElementText('view-submitted-by', safePin.submittedBy);
  setElementText('view-date', safePin.date);

  showElement('view-polaroid');

  const photoElement = document.getElementById('view-photo');
  photoElement.src = safePin.photoUrl;
  photoElement.alt = `Photo from ${safePin.placeName}`;
  photoElement.onclick = null;
  photoElement.style.cursor = safePin.hasPhoto ? 'zoom-in' : 'default';
  if (safePin.hasPhoto) {
    photoElement.onclick = () => showPhotoLightbox(safePin.photoUrl, `Photo from ${safePin.placeName}`);
  }

  setOptionalActionButton('view-edit', viewOptions.canEdit, viewOptions.onEdit);
  setOptionalActionButton('view-delete', viewOptions.canDelete, viewOptions.onDelete);

  showElement('modal-view');
}

function hideViewModal() {
  setOptionalActionButton('view-edit', false, null);
  setOptionalActionButton('view-delete', false, null);
  hideElement('modal-view');
}

function confirmDeleteMemory(placeName) {
  return window.confirm(`A bird has its eye on your crumb at "${placeName}". Let it eat?`);
}

function updateCharCounter(inputId, counterId, maxLength) {
  const counterInput = document.getElementById(inputId);
  counterInput.addEventListener('input', () => {
    setCharCounter(inputId, counterId, maxLength);
  });
}

function initCharCounters() {
  if (charCountersInitialized) return;
  charCountersInitialized = true;

  ADD_MODAL_COUNTER_CONFIGS.forEach(({ inputId, counterId, maxLength }) => {
    updateCharCounter(inputId, counterId, maxLength);
  });
  syncAddModalCounters();
}

export {
  showToast,
  parseCssTimeToMs,
  getTransitionTimeoutMs,
  getSelectedPhotoStatus,
  buildUploadDebugInfo,
  buildActiveUsernameLabel,
  getAddModalIdleLabel,
  resolveExistingPinPlaceName,
  setActiveUsernameDisplay,
  setAddModalSubmitting,
  showPhotoLightbox,
  hidePhotoLightbox,
  showSplash,
  hideSplash,
  showUsernamePrompt,
  hideUsernamePrompt,
  showAddModal,
  hideAddModal,
  showAddModalSubmitError,
  showViewModal,
  hideViewModal,
  confirmDeleteMemory,
  initCharCounters,
  setAddPhotoPreviewFromUrl,
};
