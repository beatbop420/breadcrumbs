import { getPinColor } from './pinLogic.js';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://carto.com/">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAP_INITIAL_ZOOM = 2;
const MAP_INITIAL_CENTER = [20, 0];
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

function initMap(onMapTap) {
  mapInstance = window.L.map('map', { zoomControl: true }).setView(MAP_INITIAL_CENTER, MAP_INITIAL_ZOOM);
  window.L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(mapInstance);
  mapInstance.on('click', (event) => onMapTap(event.latlng));
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

export {
  initMap,
  renderPinMarker,
  updateMarkerColor,
  addTemporaryMarker,
  removeTemporaryMarker,
  animatePinEntrance,
};
