/**
 * core/theme.js
 * Light / dark theme. The preference is 'light' | 'dark' | 'system'.
 * js/theme-init.js applies the saved theme before first paint (no flash);
 * this module keeps it in sync afterwards.
 */

import { config } from './config.js';
import { store } from './store.js';

const STORAGE_KEY = `finora:${config.storageVersion}:theme`;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

export function getThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function resolve(preference) {
  if (preference === 'system') return darkQuery.matches ? 'dark' : 'light';
  return preference;
}

function apply(preference) {
  const resolved = resolve(preference);
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0A1322' : '#F3F5F9');
  store.set('theme', resolved);
}

export function setThemePreference(preference) {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch (error) {
    console.warn('[finora] Could not persist theme preference', error);
  }
  apply(preference);
}

export function toggleTheme() {
  setThemePreference(store.get('theme') === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  apply(getThemePreference());
  darkQuery.addEventListener('change', () => {
    if (getThemePreference() === 'system') apply('system');
  });
}
