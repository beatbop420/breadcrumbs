import { getPinColor } from './pinLogic.js';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://carto.com/">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAP_INITIAL_CENTER = [20, 0];
const MAP_BASE_MIN_ZOOM = 1;
const MAP_ZOOM_SNAP = 0.1;
const MAP_ZOOM_DELTA = 0.25;
const MAP_WORLD_FIT_PADDING_PX = 96;
const TILE_SIZE_PX = 256;
const PIN_ENTRANCE_TRANSITION = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';

let mapInstance = null;
let temporaryMarker = null;

function buildPinIcon(color) {
  return window.L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function getSingleWorldMinZoom(viewportWidth) {
  const numericWidth = Number(viewportWidth);
  if (!Number.isFinite(numericWidth) || numericWidth <= 0) return MAP_BASE_MIN_ZOOM;

  const paddedWidth = numericWidth + MAP_WORLD_FIT_PADDING_PX;
  return Math.max(MAP_BASE_MIN_ZOOM, Math.log2(paddedWidth / TILE_SIZE_PX));
}

function initMap(onMapTap) {
  const singleWorldMinZoom = getSingleWorldMinZoom(window.innerWidth);
  mapInstance = window.L.map('map', {
    zoomControl: true,
    minZoom: singleWorldMinZoom,
    zoomSnap: MAP_ZOOM_SNAP,
    zoomDelta: MAP_ZOOM_DELTA,
    worldCopyJump: true,
  }).setView(MAP_INITIAL_CENTER, singleWorldMinZoom);
  window.L.tileLayer(TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    maxZoom: 19,
  }).addTo(mapInstance);
  mapInstance.on('click', (event) => onMapTap(event.latlng));
  window.addEventListener('resize', () => {
    const nextMinZoom = getSingleWorldMinZoom(window.innerWidth);
    mapInstance.setMinZoom(nextMinZoom);
    if (mapInstance.getZoom() < nextMinZoom) {
      mapInstance.setZoom(nextMinZoom);
    }
  });
  console.info('[Breadcrumbs] Map initialized');
  return mapInstance;
}

function renderPinMarker(pin, seenPinSet, onPinClick) {
  const color = getPinColor(pin.id, seenPinSet);
  const marker = window.L.marker([pin.lat, pin.lng], { icon: buildPinIcon(color) });
  marker.pinId = pin.id;
  marker.on('click', (event) => {
    event.originalEvent.stopPropagation();
    onPinClick(pin);
  });
  marker.addTo(mapInstance);
  return marker;
}

function updateMarkerColor(marker, pinId, seenPinSet) {
  const color = getPinColor(pinId, seenPinSet);
  marker.setIcon(buildPinIcon(color));
}

function addTemporaryMarker(latlng) {
  removeTemporaryMarker();
  temporaryMarker = window.L.marker(latlng, {
    icon: buildPinIcon('#5B8CDB'),
    opacity: 0.7,
  }).addTo(mapInstance);
  return temporaryMarker;
}

function removeTemporaryMarker() {
  if (temporaryMarker) {
    mapInstance.removeLayer(temporaryMarker);
    temporaryMarker = null;
  }
}

function moveTemporaryMarker(latlng) {
  if (!temporaryMarker) return;
  temporaryMarker.setLatLng(latlng);
  mapInstance.panTo(latlng);
}

function animatePinEntrance(marker) {
  const iconElement = marker.getElement();
  if (!iconElement) return;
  const animatedElement = iconElement.firstElementChild || iconElement;

  animatedElement.style.willChange = 'transform, opacity';
  animatedElement.style.transformOrigin = 'center center';
  animatedElement.style.transition = 'none';
  animatedElement.style.transform = 'scale(0)';
  animatedElement.style.opacity = '0';

  // Force the browser to commit the start state before animating to the end state.
  void animatedElement.offsetWidth;

  requestAnimationFrame(() => {
    animatedElement.style.transition = PIN_ENTRANCE_TRANSITION;
    animatedElement.style.transform = 'scale(1)';
    animatedElement.style.opacity = '1';
  });

  animatedElement.addEventListener('transitionend', () => {
    animatedElement.style.willChange = '';
  }, { once: true });
}

function animatePinDelete(marker) {
  return new Promise((resolve) => {
    const iconElement = marker.getElement();
    if (!iconElement) { resolve(); return; }

    const pinDot = iconElement.firstElementChild || iconElement;
    const rect = iconElement.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;

    const CROW_W = 110;
    const CROW_H = 60;

    const bird = document.createElement('img');
    bird.src = 'assets/crow-swoop.png';
    bird.style.cssText = [
      'position:fixed',
      `left:-${CROW_W}px`,
      `top:${targetY - CROW_H / 2}px`,
      `width:${CROW_W}px`,
      `height:${CROW_H}px`,
      'z-index:9999',
      'pointer-events:none',
      'transform-origin:center center',
      'transition:left 0.4s linear',
    ].join(';');
    document.body.appendChild(bird);

    void bird.offsetWidth;
    bird.style.left = `${window.innerWidth + CROW_W}px`;

    // grab the pin as it passes through
    setTimeout(() => {
      pinDot.style.transition = 'transform 0.1s ease, opacity 0.1s ease';
      pinDot.style.transform = 'scale(0)';
      pinDot.style.opacity = '0';
    }, 200);

    bird.addEventListener('transitionend', () => {
      bird.remove();
      resolve();
    }, { once: true });
  });
}

function getMapCenter() {
  if (!mapInstance) return { lat: 20, lng: 0 };
  const center = mapInstance.getCenter();
  return { lat: center.lat, lng: center.lng };
}

export {
  getSingleWorldMinZoom,
  initMap,
  renderPinMarker,
  updateMarkerColor,
  addTemporaryMarker,
  removeTemporaryMarker,
  moveTemporaryMarker,
  animatePinEntrance,
  animatePinDelete,
  getMapCenter,
};
