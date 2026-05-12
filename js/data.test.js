import { expect, summarizeResults } from './test-runner.js';
import {
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
} from './data.js';

// ─── sanitizeText ─────────────────────────────────────────────────────────────

expect('sanitizeText trims whitespace', sanitizeText('  hello  '), 'hello');
expect('sanitizeText returns empty string for non-string', sanitizeText(null), '');
expect('sanitizeText returns empty string for number', sanitizeText(42), '');

// ─── escapeHtml ───────────────────────────────────────────────────────────────

expect('escapeHtml escapes ampersand', escapeHtml('a & b'), 'a &amp; b');
expect('escapeHtml escapes less-than', escapeHtml('<script>'), '&lt;script&gt;');
expect('escapeHtml escapes double quote', escapeHtml('"hello"'), '&quot;hello&quot;');
expect('escapeHtml escapes single quote', escapeHtml("it's"), 'it&#039;s');
expect('escapeHtml leaves clean text alone', escapeHtml('hello world'), 'hello world');

// ─── validatePlaceName ────────────────────────────────────────────────────────

expect('validatePlaceName accepts valid name', validatePlaceName('Paris, France'), { valid: true, value: 'Paris, France' });
expect('validatePlaceName rejects empty string', validatePlaceName('').valid, false);
expect('validatePlaceName rejects whitespace only', validatePlaceName('   ').valid, false);
expect('validatePlaceName rejects over 200 chars', validatePlaceName('a'.repeat(201)).valid, false);
expect('validatePlaceName accepts exactly 200 chars', validatePlaceName('a'.repeat(200)).valid, true);

// ─── validateNote ─────────────────────────────────────────────────────────────

expect('validateNote accepts empty note', validateNote(''), { valid: true, value: '' });
expect('validateNote accepts valid note', validateNote('Great trip!'), { valid: true, value: 'Great trip!' });
expect('validateNote rejects over 1000 chars', validateNote('a'.repeat(1001)).valid, false);
expect('validateNote accepts exactly 1000 chars', validateNote('a'.repeat(1000)).valid, true);

// ─── validateSubmittedBy ──────────────────────────────────────────────────────

expect('validateSubmittedBy accepts valid name', validateSubmittedBy('Sofia'), { valid: true, value: 'Sofia' });
expect('validateSubmittedBy accepts empty string', validateSubmittedBy(''), { valid: true, value: '' });
expect('validateSubmittedBy rejects over 100 chars', validateSubmittedBy('a'.repeat(101)).valid, false);

// ─── validateLatitude ────────────────────────────────────────────────────────

expect('validateLatitude accepts 0', validateLatitude(0), { valid: true, value: 0 });
expect('validateLatitude accepts 90', validateLatitude(90), { valid: true, value: 90 });
expect('validateLatitude accepts -90', validateLatitude(-90), { valid: true, value: -90 });
expect('validateLatitude rejects 91', validateLatitude(91).valid, false);
expect('validateLatitude rejects -91', validateLatitude(-91).valid, false);
expect('validateLatitude rejects non-number', validateLatitude('abc').valid, false);

// ─── validateLongitude ───────────────────────────────────────────────────────

expect('validateLongitude accepts 0', validateLongitude(0), { valid: true, value: 0 });
expect('validateLongitude accepts 180', validateLongitude(180), { valid: true, value: 180 });
expect('validateLongitude accepts -180', validateLongitude(-180), { valid: true, value: -180 });
expect('validateLongitude rejects 181', validateLongitude(181).valid, false);
expect('validateLongitude rejects -181', validateLongitude(-181).valid, false);
expect('validateLongitude rejects non-number', validateLongitude('abc').valid, false);

// ─── validatePhoto ───────────────────────────────────────────────────────────

expect('validatePhoto accepts null', validatePhoto(null), { valid: true, value: null });
expect('validatePhoto accepts jpeg', validatePhoto({ type: 'image/jpeg', size: 1000 }), { valid: true, value: { type: 'image/jpeg', size: 1000 } });
expect('validatePhoto rejects wrong type', validatePhoto({ type: 'image/gif', size: 1000 }).valid, false);
expect('validatePhoto rejects oversized file', validatePhoto({ type: 'image/jpeg', size: 6 * 1024 * 1024 }).valid, false);
expect('validatePhoto accepts exactly 5MB', validatePhoto({ type: 'image/png', size: 5 * 1024 * 1024 }).valid, true);

// ─── validateUsername ────────────────────────────────────────────────────────

expect('validateUsername accepts valid name', validateUsername('Sofia'), { valid: true, value: 'Sofia' });
expect('validateUsername rejects empty string', validateUsername('').valid, false);
expect('validateUsername rejects whitespace only', validateUsername('   ').valid, false);
expect('validateUsername rejects over 100 chars', validateUsername('a'.repeat(101)).valid, false);

// ─── validatePinForm ─────────────────────────────────────────────────────────

expect('validatePinForm accepts valid form data', validatePinForm({
  placeName: 'Paris',
  note: 'Great trip',
  submittedBy: 'Sofia',
  lat: 48.8566,
  lng: 2.3522,
  photo: null,
}).valid, true);

expect('validatePinForm rejects missing place name', validatePinForm({
  placeName: '',
  note: 'Great trip',
  submittedBy: 'Sofia',
  lat: 48.8566,
  lng: 2.3522,
  photo: null,
}).valid, false);

expect('validatePinForm rejects invalid coordinates', validatePinForm({
  placeName: 'Paris',
  note: '',
  submittedBy: '',
  lat: 999,
  lng: 999,
  photo: null,
}).valid, false);

// ─── SECURITY: XSS attack vectors ────────────────────────────────────────────

expect('escapeHtml blocks script tag injection', escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
expect('validatePlaceName sanitizes leading/trailing spaces around XSS attempt', validatePlaceName('  <b>bold</b>  ').value, '<b>bold</b>');

summarizeResults();
