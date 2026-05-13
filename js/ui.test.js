import { expect, summarizeResults } from './test-runner.js';
import { parseCssTimeToMs, getTransitionTimeoutMs, getSelectedPhotoStatus, buildActiveUsernameLabel, setActiveUsernameDisplay, showViewModal } from './ui.js';

// ─── parseCssTimeToMs ────────────────────────────────────────────────────────

expect('parseCssTimeToMs parses seconds', parseCssTimeToMs('0.4s'), 400);
expect('parseCssTimeToMs parses milliseconds', parseCssTimeToMs('75ms'), 75);
expect('parseCssTimeToMs trims whitespace', parseCssTimeToMs(' 0.25s '), 250);
expect('parseCssTimeToMs returns 0 for invalid input', parseCssTimeToMs('nope'), 0);

// ─── getTransitionTimeoutMs ─────────────────────────────────────────────────

expect('getTransitionTimeoutMs adds duration and delay', getTransitionTimeoutMs('0.4s', '100ms'), 500);
expect('getTransitionTimeoutMs uses the longest transition pair', getTransitionTimeoutMs('0.2s, 75ms', '100ms, 0s'), 300);
expect('getTransitionTimeoutMs reuses the last listed delay when needed', getTransitionTimeoutMs('50ms, 0.2s', '25ms'), 225);
expect('getTransitionTimeoutMs returns 0 when transition values are empty', getTransitionTimeoutMs('', ''), 0);

// ─── getSelectedPhotoStatus ────────────────────────────────────────────────

expect('getSelectedPhotoStatus returns default text without a file', getSelectedPhotoStatus(null), 'No photo selected');
expect('getSelectedPhotoStatus returns the selected filename', getSelectedPhotoStatus({ name: 'road-trip.webp' }), 'Selected: road-trip.webp');

// ─── active username badge ──────────────────────────────────────────────────

expect('buildActiveUsernameLabel trims the username for display', buildActiveUsernameLabel('  Petra  '), 'Petra');
expect('buildActiveUsernameLabel returns empty string for non-string input', buildActiveUsernameLabel(null), '');

// ─── showViewModal ──────────────────────────────────────────────────────────

function createMockElement(initialClassNames = []) {
  const classNames = new Set(initialClassNames);
  return {
    textContent: '',
    src: '',
    alt: '',
    onclick: null,
    style: {},
    dataset: {},
    classList: {
      add: (...names) => names.forEach((name) => classNames.add(name)),
      remove: (...names) => names.forEach((name) => classNames.delete(name)),
      contains: (name) => classNames.has(name),
    },
    addEventListener: () => {},
  };
}

const originalDocument = globalThis.document;
const mockElements = {
  'photo-lightbox-close': createMockElement(),
  'photo-lightbox': createMockElement(['hidden']),
  'photo-lightbox-image': createMockElement(),
  'view-place-name': createMockElement(),
  'view-note': createMockElement(),
  'view-submitted-by': createMockElement(),
  'view-date': createMockElement(),
  'view-polaroid': createMockElement(['hidden']),
  'view-photo': createMockElement(),
  'view-delete': createMockElement(['hidden']),
  'modal-view': createMockElement(['hidden']),
  'active-username-badge': createMockElement(['hidden']),
  'active-username-value': createMockElement(),
};

globalThis.document = {
  getElementById: (id) => mockElements[id],
  addEventListener: () => {},
};

setActiveUsernameDisplay('  Petra  ');
expect('setActiveUsernameDisplay shows the identity badge for a valid username', mockElements['active-username-badge'].classList.contains('hidden'), false);
expect('setActiveUsernameDisplay writes the trimmed username', mockElements['active-username-value'].textContent, 'Petra');

setActiveUsernameDisplay('');
expect('setActiveUsernameDisplay hides the badge when the username is empty', mockElements['active-username-badge'].classList.contains('hidden'), true);

showViewModal({
  placeName: 'No Photo Pin',
  note: 'Still has a placeholder.',
  submittedBy: 'Petra',
  date: 'May 12, 2026',
  photoUrl: 'assets/pin-placeholder.svg',
  hasPhoto: false,
});

expect('showViewModal keeps the polaroid visible for placeholder images', mockElements['view-polaroid'].classList.contains('hidden'), false);
expect('showViewModal sets the placeholder photo src', mockElements['view-photo'].src, 'assets/pin-placeholder.svg');
expect('showViewModal keeps placeholder images out of the lightbox flow', mockElements['view-photo'].style.cursor, 'default');
expect('showViewModal shows the view modal', mockElements['modal-view'].classList.contains('hidden'), false);

globalThis.document = originalDocument;

summarizeResults();
