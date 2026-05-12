import { expect, summarizeResults } from './test-runner.js';
import { parseCssTimeToMs, getTransitionTimeoutMs, getSelectedPhotoStatus } from './ui.js';

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

summarizeResults();
