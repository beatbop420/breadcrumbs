import { validateUsername } from './data.js';

const USERNAME_STORAGE_KEY = 'breadcrumbs_username';

function getStoredUsername() {
  return localStorage.getItem(USERNAME_STORAGE_KEY);
}

function saveUsername(rawValue) {
  const result = validateUsername(rawValue);
  if (!result.valid) throw new Error(result.error);
  localStorage.setItem(USERNAME_STORAGE_KEY, result.value);
  return result.value;
}

function hasStoredUsername() {
  const username = getStoredUsername();
  return username !== null && username.length > 0;
}

function clearStoredUsername() {
  localStorage.removeItem(USERNAME_STORAGE_KEY);
}

export { USERNAME_STORAGE_KEY, getStoredUsername, saveUsername, hasStoredUsername, clearStoredUsername };
