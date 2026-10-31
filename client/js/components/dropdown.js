/**
 * components/dropdown.js
 * Disclosure-style popover (bell, avatar menu). Trigger has aria-expanded; the panel
 * closes on Esc (focus returns to trigger), outside click, or when it loses focus.
 */

import { h } from '../core/dom.js';

let idCounter = 0;

/**
 * @param {Object} options
 * @param {Node[]|Node} options.triggerContent  content of the trigger button
 * @param {string} options.label                accessible name of the trigger
 * @param {string} [options.triggerClass]
 * @param {(api:{close:()=>void}) => Node} options.renderPanel
 * @param {'start'|'end'} [options.align]
 */
export function createDropdown({ triggerContent, label, triggerClass = 'icon-btn', renderPanel, align = 'end' }) {
  const panelId = `dropdown-panel-${(idCounter += 1)}`;
  let isOpen = false;

  const trigger = h(
    'button',
    { class: triggerClass, type: 'button', 'aria-label': label, 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': panelId, onClick: () => toggle() },
    triggerContent
  );

  const panel = h('div', { class: `dropdown__panel dropdown__panel--${align}`, id: panelId, hidden: true });
  const root = h('div', { class: 'dropdown' }, trigger, panel);

  const api = { close: () => close(), open: () => open(), get isOpen() { return isOpen; }, root, trigger };

  function onDocumentPointerDown(event) {
    if (!root.contains(event.target)) close();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      close();
      trigger.focus();
    }
  }

  function onFocusOut(event) {
    if (event.relatedTarget && !root.contains(event.relatedTarget)) close();
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.replaceChildren(renderPanel(api)); // re-render each time so content is never stale
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onDocumentPointerDown);
    root.addEventListener('keydown', onKeydown);
    root.addEventListener('focusout', onFocusOut);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('focusout', onFocusOut);
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  return api;
}
