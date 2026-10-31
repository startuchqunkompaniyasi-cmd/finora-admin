/*
 * theme-init.js - classic (non-module) script that runs before first paint so the saved
 * theme is applied without a light -> dark flash. core/theme.js takes over afterwards.
 * Keep the storage key in sync with core/theme.js.
 */
(function () {
  try {
    var saved = localStorage.getItem('finora:v1:theme');
    var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (error) {
    document.documentElement.dataset.theme = 'light';
  }
})();
