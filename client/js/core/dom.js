/**
 * core/dom.js
 * Tiny hyperscript helpers. They build DOM nodes with createElement and text nodes,
 * and never touch innerHTML, so user-provided strings can not inject markup (XSS).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyProps(el, props) {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;

    if (key === 'class') {
      el.setAttribute('class', Array.isArray(value) ? value.filter(Boolean).join(' ') : value);
    } else if (key === 'style' && typeof value === 'object') {
      for (const [prop, val] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, key.startsWith('aria-') ? 'true' : '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

function appendChildren(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Create an HTML element. h('button', { class: 'btn', onClick }, 'Save') */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props);
  appendChildren(el, children);
  return el;
}

/** Create an SVG element. */
export function s(tag, props, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props);
  appendChildren(el, children);
  return el;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Replace all children of `parent`. */
export function mount(parent, ...children) {
  parent.replaceChildren();
  appendChildren(parent, children);
  return parent;
}

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Elements that can receive keyboard focus (used by modal focus trap). */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
