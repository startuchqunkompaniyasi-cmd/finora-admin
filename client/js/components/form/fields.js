/**
 * components/form/fields.js
 * Form building blocks. Every field returns { element, getValue, setValue, setError, focus }
 * so forms can treat them uniformly. Errors are wired with aria-invalid + aria-describedby
 * and cleared automatically as soon as the user edits the field.
 */

import { h } from '../../core/dom.js';
import { icon } from '../../utils/icons.js';
import { t } from '../../i18n/index.js';

let counter = 0;
const uid = (prefix) => `${prefix}-${(counter += 1)}`;

function errorLine(id) {
  return h('p', { class: 'field__error', id, 'aria-live': 'polite', hidden: true });
}

function showError(node, message) {
  node.replaceChildren(...(message ? [icon('alertCircle', { size: 14 }), message] : []));
  node.hidden = !message;
}

function labelText(label, optional) {
  return [label, optional ? h('span', { class: 'field__optional' }, ` ${t('form.optional')}`) : null];
}

/**
 * Text-like input or textarea.
 * @param {Object} o
 * @param {Record<string,string>} [o.attrs]  extra attributes (max, min, step ...)
 */
export function textField({ name, label, value = '', type = 'text', inputMode, placeholder, maxLength, hint, optional = false, required = false, multiline = false, rows = 2, attrs = {}, className = '', hideLabel = false, prefix }) {
  const id = uid(name);
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : null;

  const control = h(multiline ? 'textarea' : 'input', {
    id,
    name,
    ...(multiline ? { rows } : { type }),
    inputmode: inputMode,
    placeholder,
    maxlength: maxLength,
    autocomplete: 'off',
    'aria-required': required ? 'true' : undefined,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' '),
    class: 'input',
    ...attrs,
  });
  control.value = value;

  const error = errorLine(errorId);
  const input = prefix ? h('div', { class: 'input-group' }, prefix, control) : control;

  const element = h(
    'div',
    { class: ['field', className] },
    h('label', { class: ['field__label', hideLabel && 'sr-only'], for: id }, ...labelText(label, optional)),
    input,
    hint ? h('p', { class: 'field__hint', id: hintId }, hint) : null,
    error
  );

  const setError = (message) => {
    showError(error, message);
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  };
  control.addEventListener('input', () => setError(''));

  return { element, control, getValue: () => control.value, setValue: (next) => { control.value = next; }, setError, focus: () => control.focus() };
}

/** Native <select>. options: [{ value, label }] */
export function selectField({ name, label, options, value = '', hideLabel = false, className = '', onChange }) {
  const id = uid(name);
  const control = h('select', { id, name, class: 'input input--select' }, options.map((option) => h('option', { value: option.value }, option.label)));
  control.value = value;
  control.addEventListener('change', () => onChange?.(control.value));

  const element = h(
    'div',
    { class: ['field', className] },
    h('label', { class: ['field__label', hideLabel && 'sr-only'], for: id }, label),
    h('div', { class: 'select-wrap' }, control, icon('chevronDown', { size: 16, class: 'select-wrap__chevron' }))
  );

  return { element, control, getValue: () => control.value, setValue: (next) => { control.value = next; }, focus: () => control.focus() };
}

/**
 * Radio group rendered as chips or a segmented control. Uses real radio inputs, so arrow keys,
 * focus and screen readers work natively.
 * @param {'chips'|'segmented'} [o.variant]
 * @param {{value:string,label:string,icon?:string,color?:string}[]} o.options
 */
export function choiceField({ name, label, options, value = '', variant = 'chips', onChange, hideLegend = false, className = '' }) {
  const groupName = uid(name);
  const errorId = `${groupName}-error`;
  const list = h('div', { class: 'choice__list' });
  const error = errorLine(errorId);
  const element = h(
    'fieldset',
    { class: ['field', 'choice', `choice--${variant}`, className], role: 'radiogroup', 'aria-describedby': errorId },
    h('legend', { class: ['field__label', hideLegend && 'sr-only'] }, label),
    list,
    error
  );

  const getValue = () => list.querySelector('input:checked')?.value ?? '';

  function renderOptions(nextOptions, selected) {
    list.replaceChildren(
      ...nextOptions.map((option) =>
        h(
          'label',
          { class: 'choice__option' },
          h('input', { type: 'radio', name: groupName, value: option.value, checked: option.value === selected, class: 'choice__input' }),
          h(
            'span',
            { class: 'choice__box', style: option.color ? { '--choice-color': option.color } : undefined },
            option.icon ? h('span', { class: 'choice__icon', 'aria-hidden': 'true' }, option.icon) : null,
            h('span', { class: 'choice__text' }, option.label)
          )
        )
      )
    );
  }
  renderOptions(options, value);

  const setError = (message) => {
    showError(error, message);
    if (message) element.setAttribute('aria-invalid', 'true');
    else element.removeAttribute('aria-invalid');
  };

  list.addEventListener('change', () => {
    setError('');
    onChange?.(getValue());
  });

  return {
    element,
    getValue,
    setValue(next) {
      const input = [...list.querySelectorAll('input')].find((el) => el.value === next);
      if (input) input.checked = true;
    },
    /** Replace the options, keeping the selection when it is still available. */
    setOptions(nextOptions) {
      const current = getValue();
      renderOptions(nextOptions, nextOptions.some((option) => option.value === current) ? current : '');
    },
    setError,
    focus: () => (list.querySelector('input:checked') ?? list.querySelector('input'))?.focus(),
  };
}
