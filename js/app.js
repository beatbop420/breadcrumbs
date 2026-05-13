import { createSupabaseClient, ensureAnonymousSession, fetchAllPins, ensureAccount, insertPin, fetchSeenPinIds, insertView, uploadPhoto, downloadPhoto, restorePhoto, deletePhoto, deletePin, subscribeToNewPins } from './supabase.js';
import { resolveSupabaseConfig } from './config.js';
import { readCachedPins, saveCachedPins, upsertCachedPin, removeCachedPin, readCachedSeenPinIds, saveCachedSeenPinIds } from './offlineCache.js';
import { buildPinInsertPayload, buildStoragePath, buildSafePinHtml, isPinOwner } from './pinLogic.js';
import { getStoredUsername, saveUsername, hasStoredUsername } from './username.js';
import { initMap, renderPinMarker, updateMarkerColor, addTemporaryMarker, removeTemporaryMarker, moveTemporaryMarker, animatePinEntrance, animatePinDelete, getMapCenter } from './map.js';
import { showToast, showSplash, hideSplash, showUsernamePrompt, hideUsernamePrompt, showAddModal, hideAddModal, showAddModalSubmitError, setAddModalSubmitting, showViewModal, hideViewModal, confirmDeleteMemory, initCharCounters, setActiveUsernameDisplay } from './ui.js';

const pinMarkers = new Map();
let seenPinSet = new Set();
let currentUsername = null;
let runtimeConfig = null;

async function geocodePlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!response.ok) return null;
  const results = await response.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

function initGeocoding() {
  const placeInput = document.getElementById('add-place-name');
  let geocodeTimer = null;
  placeInput.addEventListener('input', () => {
    clearTimeout(geocodeTimer);
    geocodeTimer = setTimeout(async () => {
      const query = placeInput.value.trim();
      if (query.length < 3) return;
      const modal = document.getElementById('modal-add');
      if (modal.classList.contains('hidden')) return;
      try {
        const result = await geocodePlace(query);
        if (!result) return;
        if (modal.classList.contains('hidden')) return;
        document.getElementById('add-lat').value = result.lat;
        document.getElementById('add-lng').value = result.lng;
        moveTemporaryMarker({ lat: result.lat, lng: result.lng });
      } catch (err) {
        // silent fail — user can still tap the map manually
      }
    }, 700);
  });
}

function initUsernameBadgeClick() {
  const badge = document.getElementById('active-username-badge');
  badge.addEventListener('click', () => {
    showUsernamePrompt(async (newUsername) => {
      try {
        await ensureAccount(newUsername);
      } catch (err) {
        console.warn('[Breadcrumbs] ensureAccount on switch skipped:', err);
      }
      saveUsername(newUsername);
      currentUsername = newUsername;
      setActiveUsernameDisplay(currentUsername);
      try {
        seenPinSet = await fetchSeenPinIds(currentUsername);
        saveCachedSeenPinIds(currentUsername, seenPinSet);
      } catch (err) {
        seenPinSet = readCachedSeenPinIds(currentUsername);
      }
      pinMarkers.forEach((marker, pinId) => updateMarkerColor(marker, pinId, seenPinSet));
    }, 'switch');

    document.getElementById('username-close').onclick = hideUsernamePrompt;

    const overlay = document.getElementById('username-prompt');
    overlay.onclick = (event) => {
      if (event.target === overlay) hideUsernamePrompt();
    };
  });
}

function openAddModal(latlng) {
  const tempMarker = addTemporaryMarker(latlng);
  showAddModal(latlng, currentUsername, async (cleanData) => {
    await handlePinSubmit(cleanData, tempMarker);
  });

  function closeModal() {
    removeTemporaryMarker(tempMarker);
    hideAddModal();
  }

  document.getElementById('add-close').onclick = closeModal;

  const backdrop = document.getElementById('modal-add');
  backdrop.onclick = (event) => {
    if (event.target === backdrop) closeModal();
  };
}

async function handleMapTap(latlng) {
  openAddModal(latlng);
}

function initFab() {
  const fab = document.getElementById('drop-crumb-fab');
  fab.addEventListener('click', () => {
    openAddModal(getMapCenter());
  });
}

function buildSubmitFailureMessage(submitStage, hadSelectedPhoto, uploadedImagePath) {
  if (submitStage === 'upload') {
    return 'Photo didn\'t upload. Choose it again and try saving.';
  }

  if (submitStage === 'insert' && hadSelectedPhoto && uploadedImagePath) {
    return 'Didn\'t save. Choose the photo again and try again.';
  }

  if (submitStage === 'insert') {
    return 'Didn\'t save. Try again.';
  }

  return 'Something went wrong. Please refresh and try again.';
}

async function cleanupUploadedPhoto(uploadedImagePath) {
  try {
    await deletePhoto(uploadedImagePath);
  } catch (err) {
    console.error('[Breadcrumbs] deletePhoto after insert failure failed:', err);
  }
}

async function handlePinSubmit(cleanData, tempMarker) {
  setAddModalSubmitting(true);
  const hadSelectedPhoto = Boolean(cleanData.photo);
  let submitStage = 'auth';
  let uploadedImagePath = null;

  try {
    await ensureAnonymousSession();
    if (hadSelectedPhoto) {
      submitStage = 'upload';
      const storagePath = buildStoragePath(cleanData.photo);
      uploadedImagePath = await uploadPhoto(cleanData.photo, storagePath);
    }

    submitStage = 'insert';
    const payload = buildPinInsertPayload(cleanData, uploadedImagePath, currentUsername);
    await insertPin(payload);
    removeTemporaryMarker(tempMarker);
    hideAddModal();
    showToast('Bread successfully deployed.', 'success');
    console.info('[Breadcrumbs] Pin inserted successfully');
  } catch (err) {
    console.error('[Breadcrumbs] handlePinSubmit failed:', err);

    if (submitStage === 'insert' && uploadedImagePath) {
      await cleanupUploadedPhoto(uploadedImagePath);
    }

    const failureMessage = buildSubmitFailureMessage(submitStage, hadSelectedPhoto, uploadedImagePath);
    setAddModalSubmitting(false);
    showAddModalSubmitError(failureMessage);
  }
}

async function handlePinDelete(pin) {
  const ownerCanDeletePin = isPinOwner(pin, currentUsername);
  if (!ownerCanDeletePin) {
    showToast('You can only delete your own pins.', 'error');
    return;
  }

  const didConfirmDelete = confirmDeleteMemory(pin.place_name);
  if (!didConfirmDelete) return;

  try {
    await ensureAnonymousSession();
    let photoBackup = null;

    if (pin.image_path) {
      photoBackup = await downloadPhoto(pin.image_path);
      await deletePhoto(pin.image_path);
    }

    try {
      await deletePin(pin.id, currentUsername);
    } catch (deleteErr) {
      if (pin.image_path && photoBackup) {
        try {
          await restorePhoto(photoBackup, pin.image_path);
        } catch (restoreErr) {
          console.error('[Breadcrumbs] restorePhoto after deletePin failure failed:', restoreErr);
          throw new Error('Couldn\'t delete this memory, and the photo restore also failed.');
        }
      }

      throw deleteErr;
    }

    removeCachedPin(pin.id);
    hideViewModal();

    const marker = pinMarkers.get(pin.id);
    if (marker) {
      pinMarkers.delete(pin.id);
      await animatePinDelete(marker);
      marker.remove();
    }

    showToast('The creatures in the woods have been fed.', 'success');
  } catch (err) {
    console.error('[Breadcrumbs] handlePinDelete failed:', err);
    showToast('Couldn\'t delete this pin. Please try again.', 'error');
  }
}

async function handlePinClick(pin) {
  const safePin = buildSafePinHtml(pin, runtimeConfig.supabaseUrl);
  showViewModal(safePin, {
    canDelete: isPinOwner(pin, currentUsername),
    onDelete: async () => {
      await handlePinDelete(pin);
    },
  });

  const closeButton = document.getElementById('view-close');
  closeButton.onclick = hideViewModal;

  if (seenPinSet.has(pin.id)) return;

  try {
    await ensureAnonymousSession();
    await insertView(currentUsername, pin.id);
    seenPinSet.add(pin.id);
    saveCachedSeenPinIds(currentUsername, seenPinSet);
    const marker = pinMarkers.get(pin.id);
    if (marker) updateMarkerColor(marker, pin.id, seenPinSet);
  } catch (err) {
    console.error('[Breadcrumbs] handlePinClick insertView failed:', err);
  }
}

function handleNewRealtimePin(newPin) {
  if (pinMarkers.has(newPin.id)) return;
  const marker = renderPinMarker(newPin, seenPinSet, handlePinClick);
  pinMarkers.set(newPin.id, marker);
  upsertCachedPin(newPin);
  animatePinEntrance(marker);
  console.info('[Breadcrumbs] Realtime pin rendered:', newPin.id);
}

async function loadAndRenderPins() {
  try {
    const pins = await fetchAllPins();
    saveCachedPins(pins);
    pins.forEach((pin) => {
      const marker = renderPinMarker(pin, seenPinSet, handlePinClick);
      pinMarkers.set(pin.id, marker);
    });
    console.info(`[Breadcrumbs] Loaded ${pins.length} pins`);
  } catch (err) {
    console.error('[Breadcrumbs] loadAndRenderPins failed:', err);
    const cachedPins = readCachedPins();
    if (cachedPins.length > 0) {
      cachedPins.forEach((pin) => {
        if (pinMarkers.has(pin.id)) return;
        const marker = renderPinMarker(pin, seenPinSet, handlePinClick);
        pinMarkers.set(pin.id, marker);
      });
      showToast('Showing saved pins offline.', 'info');
      console.info(`[Breadcrumbs] Loaded ${cachedPins.length} cached pins`);
      return;
    }
    showToast('Something went wrong. Please refresh.', 'error');
  }
}

async function resolveUsername() {
  if (hasStoredUsername()) {
    currentUsername = getStoredUsername();
    setActiveUsernameDisplay(currentUsername);
    try {
      await ensureAccount(currentUsername);
    } catch (err) {
      console.warn('[Breadcrumbs] ensureAccount skipped while offline/unavailable:', err);
    }
    return;
  }
  await new Promise((resolve) => {
    showUsernamePrompt(async (username) => {
      await ensureAccount(username);
      saveUsername(username);
      currentUsername = username;
      setActiveUsernameDisplay(currentUsername);
      resolve();
    });
  });
}

async function initApp() {
  try {
    runtimeConfig = resolveSupabaseConfig();
    createSupabaseClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey);
    initMap(handleMapTap);
    initCharCounters();
    initGeocoding();
    showSplash();

    await resolveUsername();
    initUsernameBadgeClick();
    try {
      seenPinSet = await fetchSeenPinIds(currentUsername);
      saveCachedSeenPinIds(currentUsername, seenPinSet);
    } catch (err) {
      console.warn('[Breadcrumbs] Using cached seen-pin state:', err);
      seenPinSet = readCachedSeenPinIds(currentUsername);
    }

    initFab();

    const startButton = document.getElementById('splash-start');
    startButton.addEventListener('click', () => {
      hideSplash(async () => {
        document.getElementById('drop-crumb-fab').classList.remove('hidden');
        await loadAndRenderPins();
        subscribeToNewPins(handleNewRealtimePin);
      });
    }, { once: true });

    console.info('[Breadcrumbs] App initialized');
  } catch (err) {
    console.error('[Breadcrumbs] initApp failed:', err);
    showToast('Something went wrong. Please refresh.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
