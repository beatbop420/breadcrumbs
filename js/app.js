import { createSupabaseClient, signInAnonymously, fetchAllPins, ensureAccount, insertPin, fetchSeenPinIds, insertView, uploadPhoto, downloadPhoto, restorePhoto, deletePhoto, deletePin, subscribeToNewPins } from './supabase.js';
import { resolveSupabaseConfig } from './config.js';
import { readCachedPins, saveCachedPins, upsertCachedPin, removeCachedPin, readCachedSeenPinIds, saveCachedSeenPinIds } from './offlineCache.js';
import { buildPinInsertPayload, buildStoragePath, buildSafePinHtml, isPinOwner } from './pinLogic.js';
import { getStoredUsername, saveUsername, hasStoredUsername } from './username.js';
import { initMap, renderPinMarker, updateMarkerColor, addTemporaryMarker, removeTemporaryMarker, animatePinEntrance } from './map.js';
import { showToast, showSplash, hideSplash, showUsernamePrompt, showAddModal, hideAddModal, showAddModalSubmitError, setAddModalSubmitting, showViewModal, hideViewModal, confirmDeleteMemory, initCharCounters, setActiveUsernameDisplay } from './ui.js';

const pinMarkers = new Map();
let seenPinSet = new Set();
let currentUsername = null;
let runtimeConfig = null;

async function handleMapTap(latlng) {
  const tempMarker = addTemporaryMarker(latlng);
  showAddModal(latlng, currentUsername, async (cleanData) => {
    await handlePinSubmit(cleanData, tempMarker);
  });

  const closeButton = document.getElementById('add-close');
  closeButton.onclick = () => {
    removeTemporaryMarker(tempMarker);
    hideAddModal();
  };
}

function buildSubmitFailureMessage(submitStage, hadSelectedPhoto, uploadedImagePath) {
  if (submitStage === 'upload') {
    return 'Photo upload failed. Please choose the photo again and try once more.';
  }

  if (submitStage === 'insert' && hadSelectedPhoto && uploadedImagePath) {
    return 'Couldn\'t save your memory. Please choose the photo again and tap Save Memory again.';
  }

  if (submitStage === 'insert') {
    return 'Couldn\'t save your memory. Please tap Save Memory again.';
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
    await signInAnonymously();
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
    showToast('Memory added!', 'success');
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
    showToast('You can only delete your own memories.', 'error');
    return;
  }

  const didConfirmDelete = confirmDeleteMemory(pin.place_name);
  if (!didConfirmDelete) return;

  try {
    await signInAnonymously();
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

    const marker = pinMarkers.get(pin.id);
    if (marker) {
      marker.remove();
      pinMarkers.delete(pin.id);
    }
    removeCachedPin(pin.id);

    hideViewModal();
    showToast('Memory deleted.', 'success');
  } catch (err) {
    console.error('[Breadcrumbs] handlePinDelete failed:', err);
    showToast('Couldn\'t delete this memory. Please try again.', 'error');
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
      showToast('Showing saved memories offline.', 'info');
      console.info(`[Breadcrumbs] Loaded ${cachedPins.length} cached pins`);
      return;
    }
    showToast('Couldn\'t load memories. Please refresh.', 'error');
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
    showSplash();

    await resolveUsername();
    try {
      seenPinSet = await fetchSeenPinIds(currentUsername);
      saveCachedSeenPinIds(currentUsername, seenPinSet);
    } catch (err) {
      console.warn('[Breadcrumbs] Using cached seen-pin state:', err);
      seenPinSet = readCachedSeenPinIds(currentUsername);
    }

    const startButton = document.getElementById('splash-start');
    startButton.addEventListener('click', () => {
      hideSplash(async () => {
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
