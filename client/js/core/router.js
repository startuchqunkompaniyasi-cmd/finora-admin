/**
 * core/router.js
 * Hash router (#/dashboard) with lazy-loaded pages.
 *
 * A page module exports:
 *   title                        string
 *   render(ctx) -> Node          builds the page (may be async)
 *   skeleton?() -> Node          shown only if render() takes longer than config.skeletonDelayMs
 *
 * ctx = { path, signal, refresh(), onCleanup(fn), onMounted(fn) }
 *   onCleanup  run when the page is left or re-rendered (destroy charts, cancel animations)
 *   onMounted  run after the page is attached to the DOM (charts need real dimensions)
 * Cleanups live on ctx instead of module-level state, so two overlapping renders can never
 * destroy each other's charts.
 */

import { config } from './config.js';
import { h } from './dom.js';
import { errorState } from '../components/emptyState.js';
import { t } from '../i18n/index.js';

function readQuery() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '');
}

function createInstance(path, refresh) {
  const cleanups = [];
  const mountedCallbacks = [];
  const controller = new AbortController();
  let disposed = false;

  const runSafely = (fn) => {
    try {
      fn();
    } catch (error) {
      console.error('[finora] Page lifecycle callback failed', error);
    }
  };

  return {
    ctx: {
      path,
      /** URLSearchParams of the hash query, e.g. #/transactions?type=expense */
      query: readQuery(),
      /**
       * Update the hash query WITHOUT re-rendering the page (history.replaceState does not
       * fire hashchange). Lets filters live in the URL: shareable, survives refresh.
       */
      setQuery(params) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) if (value !== '' && value != null) search.set(key, value);
        const suffix = search.toString();
        history.replaceState(null, '', `#${path}${suffix ? `?${suffix}` : ''}`);
      },
      signal: controller.signal,
      refresh,
      onCleanup(fn) {
        if (disposed) runSafely(fn); // page was already left: clean up immediately
        else cleanups.push(fn);
      },
      onMounted(fn) {
        mountedCallbacks.push(fn);
      },
    },
    runMounted() {
      mountedCallbacks.splice(0).forEach(runSafely);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      cleanups.splice(0).reverse().forEach(runSafely);
    },
  };
}

export function createRouter({ routes, outlet, notFound, defaultPath = '/dashboard', onNavigate }) {
  const byPath = new Map(routes.map((route) => [route.path, route]));
  let navigationId = 0;
  let active = null;

  const currentPath = () => {
    const raw = location.hash.replace(/^#/, '').split('?')[0];
    return raw.startsWith('/') ? raw : defaultPath;
  };

  async function resolve({ refresh = false } = {}) {
    const id = ++navigationId;
    const path = currentPath();
    const route = byPath.get(path) ?? notFound;
    const instance = createInstance(path, () => resolve({ refresh: true }));

    outlet.setAttribute('aria-busy', 'true');
    let skeletonTimer;
    let view;
    let title = route.title;

    try {
      const page = await route.load();
      if (id !== navigationId) return instance.dispose();

      title = page.title ?? route.title;
      if (page.skeleton) {
        skeletonTimer = setTimeout(() => {
          if (id === navigationId) outlet.replaceChildren(page.skeleton());
        }, config.skeletonDelayMs);
      }
      view = await page.render(instance.ctx);
    } catch (error) {
      console.error(`[finora] Failed to render "${path}"`, error);
      view = h('div', { class: 'card' }, errorState({ title: t('dashboard.loadFailed'), text: t('dashboard.loadFailedHint'), onRetry: () => resolve({ refresh: true }) }));
    } finally {
      clearTimeout(skeletonTimer);
    }

    if (id !== navigationId) return instance.dispose();

    const hadFocus = outlet.contains(document.activeElement);
    active?.dispose();
    active = instance;

    if (!refresh) view.classList.add('page-enter');
    outlet.replaceChildren(view);
    outlet.removeAttribute('aria-busy');
    document.title = `${title} \u00B7 ${config.appName}`;
    instance.runMounted();

    if (refresh && hadFocus) outlet.focus({ preventScroll: true }); // the focused element was replaced
    if (!refresh) {
      window.scrollTo(0, 0);
      outlet.focus({ preventScroll: true }); // keyboard and screen-reader users start at the new content
    }
    onNavigate?.({ path: byPath.has(path) ? path : null, route });
  }

  return {
    start() {
      window.addEventListener('hashchange', () => resolve());
      if (!location.hash) history.replaceState(null, '', `#${defaultPath}`);
      return resolve();
    },
    refresh: () => resolve({ refresh: true }),
    go(path) {
      if (currentPath() === path) return resolve({ refresh: true });
      location.hash = `#${path}`;
    },
  };
}

