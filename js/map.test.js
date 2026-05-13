import { expect, summarizeResults } from './test-runner.js';
import { getSingleWorldMinZoom, initMap, animatePinEntrance } from './map.js';

const originalWindow = globalThis.window;
const recordedMapCalls = [];
const recordedTileLayerCalls = [];
const windowEventHandlers = {};

const mockMapInstance = {
  currentZoom: 0,
  setView: (center, zoom, options) => {
    mockMapInstance.currentZoom = zoom;
    recordedMapCalls.push({ type: 'setView', center, zoom, options });
    return mockMapInstance;
  },
  on: (eventName, handler) => {
    recordedMapCalls.push({ type: 'on', eventName });
  },
  setMinZoom: (zoom) => {
    recordedMapCalls.push({ type: 'setMinZoom', zoom });
  },
  getZoom: () => mockMapInstance.currentZoom,
  setZoom: (zoom) => {
    mockMapInstance.currentZoom = zoom;
    recordedMapCalls.push({ type: 'setZoom', zoom });
  },
};

globalThis.window = {
  innerWidth: 1366,
  addEventListener: (eventName, handler) => {
    windowEventHandlers[eventName] = handler;
  },
  L: {
    map: (elementId, options) => {
      recordedMapCalls.push({ type: 'map', elementId, options });
      return mockMapInstance;
    },
    tileLayer: (url, options) => {
      recordedTileLayerCalls.push({ url, options });
      return {
        addTo: (map) => {
          recordedTileLayerCalls.push({ type: 'addTo', map });
        },
      };
    },
  },
};

const expectedMinZoom = getSingleWorldMinZoom(1366);
expect('getSingleWorldMinZoom returns a fractional zoom for widescreens', Number(expectedMinZoom.toFixed(1)), 2.5);
expect('getSingleWorldMinZoom falls back to the base zoom for bad input', getSingleWorldMinZoom(0), 1);

initMap(() => {});

expect('initMap targets the map element', recordedMapCalls[0].elementId, 'map');
expect('initMap enables wrapped-world dragging', recordedMapCalls[0].options.worldCopyJump, true);
expect('initMap uses fractional zoom snapping', recordedMapCalls[0].options.zoomSnap, 0.1);
expect('initMap uses quarter-step zoom controls', recordedMapCalls[0].options.zoomDelta, 0.25);
expect('initMap keeps horizontal tile wrapping enabled', recordedTileLayerCalls[0].options.noWrap, undefined);
expect('initMap sets the computed minimum zoom', recordedMapCalls[0].options.minZoom, expectedMinZoom);
expect('initMap starts at the computed minimum zoom', recordedMapCalls[1].zoom, expectedMinZoom);
expect('initMap registers a resize handler', typeof windowEventHandlers.resize, 'function');

globalThis.window.innerWidth = 1600;
windowEventHandlers.resize();
const resizedMinZoom = getSingleWorldMinZoom(1600);
expect('resize updates the minimum zoom for wider screens', recordedMapCalls[3].zoom, resizedMinZoom);
expect('resize clamps the current zoom to the new minimum', recordedMapCalls[4].zoom, resizedMinZoom);

const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const recordedListeners = [];
const mockInnerElement = {
  style: {},
  offsetWidth: 16,
  addEventListener: (eventName, handler, options) => {
    recordedListeners.push({ eventName, handler, options });
  },
};
const mockIconElement = {
  style: {},
  firstElementChild: mockInnerElement,
};

globalThis.requestAnimationFrame = (callback) => {
  callback();
  return 1;
};

animatePinEntrance({
  getElement: () => mockIconElement,
});

expect('animatePinEntrance preserves the Leaflet wrapper transform', mockIconElement.style.transform, undefined);
expect('animatePinEntrance sets transform origin on the animated child', mockInnerElement.style.transformOrigin, 'center center');
expect('animatePinEntrance sets the final transition string', mockInnerElement.style.transition, 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease');
expect('animatePinEntrance restores scale to 1', mockInnerElement.style.transform, 'scale(1)');
expect('animatePinEntrance restores opacity to 1', mockInnerElement.style.opacity, '1');
expect('animatePinEntrance registers a one-time transitionend listener', recordedListeners[0].options.once, true);

recordedListeners[0].handler();
expect('animatePinEntrance clears willChange after the transition ends', mockInnerElement.style.willChange, '');

let nullElementError = null;
try {
  animatePinEntrance({ getElement: () => null });
} catch (err) {
  nullElementError = err;
}
expect('animatePinEntrance safely ignores missing marker elements', nullElementError, null);

globalThis.requestAnimationFrame = originalRequestAnimationFrame;
globalThis.window = originalWindow;

summarizeResults();
