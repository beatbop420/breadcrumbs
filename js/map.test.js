import { expect, summarizeResults } from './test-runner.js';
import { animatePinEntrance } from './map.js';

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

summarizeResults();
