import { GROUPS, isOn, optionValue, type Feature, type Group, type Option } from '../core/feature.ts';
import { loadSettings, saveSettings, type Settings } from '../core/settings.ts';
import { features } from '../features/index.ts';
import { faceCss, familyOf } from '../features/font/index.ts';
import { colorPicker } from './color.ts';

// One row per feature, grouped into cards by `group`. A feature's options sit in a panel under its row
// (chevron); a lone color option shows as a dot in the row and opens the picker instead.

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', ...kids: (Node | string)[]) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.append(...kids);
  return e;
};

// Rows render synchronously with defaults, inert until storage.sync answers (docs/internals/youtube-quirks).
const settings = loadSettings();
const app = document.getElementById('app')!;
app.inert = true;

/** Saves a change. `live` (dragging) writes at most every 400ms: storage.sync allows 120 writes a minute. */
let timer: ReturnType<typeof setTimeout> | undefined;
function persist(change: (s: Settings) => void, live = false) {
  settings.then((s) => {
    change(s);
    clearTimeout(timer);
    if (live) timer = setTimeout(() => saveSettings(s), 400);
    else saveSettings(s);
  });
}

/** Popup accent follows the chosen color. */
const tint = (hex: string) => document.documentElement.style.setProperty('--kp-accent', hex);

function icon(name: string) {
  const i = el('span', 'kp-icon');
  i.style.maskImage = `url("icons/${name}.svg")`;
  return i;
}

function toggle(label: string, on: (v: boolean) => void) {
  const i = el('input', 'kp-switch');
  i.type = 'checkbox';
  i.role = 'switch';
  i.ariaLabel = label;
  i.addEventListener('change', () => on(i.checked));
  return { el: i, set: (v: unknown) => (i.checked = v as boolean) };
}

/** Segmented control; equal-width segments so the pill moves by transform only. */
function segmented(choices: Record<string, string>, on: (v: string) => void) {
  const keys = Object.keys(choices);
  const seg = el('div', 'kp-seg');
  seg.role = 'radiogroup';
  seg.style.setProperty('--n', String(keys.length));
  const btns = keys.map((k) => {
    const b = el('button', '', choices[k]);
    b.type = 'button';
    b.role = 'radio';
    b.addEventListener('click', () => (set(k), on(k)));
    return b;
  });
  seg.append(el('span', 'kp-pill'), ...btns);
  const set = (v: unknown) => {
    const i = Math.max(0, keys.indexOf(v as string));
    seg.style.setProperty('--i', String(i));
    btns.forEach((b, j) => (b.ariaChecked = String(i === j)));
  };
  return { el: seg, set };
}

/** More choices than a segmented control fits: one row each, the chosen one tinted with a check.
 *  `face` gives a row its own font-family (the font feature previews each font). */
function choiceList(choices: Record<string, string>, on: (v: string) => void, face?: (v: string) => string) {
  const list = el('div', 'kp-list');
  list.role = 'radiogroup';
  const btns = Object.entries(choices).map(([k, label]) => {
    const b = el('button', '', el('span', '', label), icon('check'));
    b.type = 'button';
    b.role = 'radio';
    b.dataset.value = k;
    if (face) b.firstElementChild!.setAttribute('style', `font-family: ${face(k)}`);
    b.addEventListener('click', () => (set(k), on(k)));
    return b;
  });
  list.append(...btns);
  const set = (v: unknown) => btns.forEach((b) => (b.ariaChecked = String(b.dataset.value === v)));
  return { el: list, set };
}

/** Font previews in the popup: the same faces the page gets, from the popup's own fonts/ folder. */
function fontFace(k: string) {
  if (!document.querySelector('style.kp-faces')) {
    document.head.append(Object.assign(el('style', 'kp-faces'), { textContent: faceCss((file) => `fonts/${file}`) }));
  }
  return k === 'system' ? 'system-ui' : `"${familyOf(k)}"`;
}

function number(opt: Extract<Option, { type: 'number' }>, on: (v: number) => void) {
  const i = el('input', 'kp-number');
  i.type = 'number';
  if (opt.min != null) i.min = String(opt.min);
  if (opt.max != null) i.max = String(opt.max);
  i.addEventListener('change', () => Number.isFinite(i.valueAsNumber) && on(i.valueAsNumber));
  return { el: i, set: (v: unknown) => (i.value = String(v)) };
}

/** A grid-rows 0fr/1fr panel, opened by `trigger`. */
function panel(item: HTMLElement, trigger: HTMLElement, content: HTMLElement) {
  const p = el('div', 'kp-panel', el('div', 'kp-panel-inner', content));
  trigger.addEventListener('click', () => {
    const open = item.classList.toggle('open');
    trigger.ariaExpanded = String(open);
  });
  trigger.ariaExpanded = 'false';
  return p;
}

function row(label: string, hint: string | undefined, iconName: string | undefined, ...end: HTMLElement[]) {
  const text = el('span', 'kp-label', label);
  if (hint) text.append(el('small', '', hint));
  return el('div', 'kp-row', ...(iconName ? [icon(iconName)] : []), text, ...end);
}

function chevron() {
  const b = el('button', 'kp-chevron', icon('arrow-down'));
  b.type = 'button';
  b.ariaLabel = 'Options';
  return b;
}

function colorDot(label: string) {
  const b = el('button', 'kp-dot');
  b.type = 'button';
  b.ariaLabel = label;
  return b;
}

/** Option rows of a feature. Rows whose `parent` is off are hidden. */
function optionRows(f: Feature) {
  const box = el('div', 'kp-options');
  const rows = new Map<string, HTMLElement>();
  const values = new Map<string, unknown>();
  const sync = () => {
    for (const [key, opt] of Object.entries(f.options ?? {})) {
      const r = rows.get(key); // undefined while the rows are still being built
      if (r && opt.parent) r.hidden = values.get(opt.parent) !== true;
    }
  };
  for (const [key, opt] of Object.entries(f.options ?? {})) {
    const save = (v: unknown, live = false) => {
      values.set(key, v);
      sync();
      if (f.id === 'accent' && key === 'color') tint(v as string);
      persist((s) => (s.options[`${f.id}.${key}`] = v), live);
    };
    let r: HTMLElement;
    let set: (v: unknown) => void;
    if (opt.type === 'color') {
      const dot = colorDot(opt.label);
      const picker = colorPicker(opt.default, (v) => save(v, true), (v) => save(v));
      r = el('div', 'kp-item', row(opt.label, undefined, undefined, dot));
      r.append(panel(r, dot, picker.el));
      set = (v) => picker.set(v as string);
    } else if (opt.type === 'choice' && Object.keys(opt.choices).length > 3) {
      const c = choiceList(opt.choices, save, f.id === 'font' ? fontFace : undefined);
      r = c.el;
      set = c.set;
    } else {
      const c = opt.type === 'boolean' ? toggle(opt.label, save) : opt.type === 'choice' ? segmented(opt.choices, save) : number(opt, save);
      r = row(opt.label, undefined, undefined, c.el);
      set = c.set;
    }
    rows.set(key, r);
    box.append(r);
    const show = (v: unknown) => (values.set(key, v), set(v), sync());
    show(opt.default);
    settings.then((s) => show(optionValue(f, key, s)));
  }
  return box;
}

function featureItem(f: Feature) {
  const item = el('div', 'kp-item');
  const sw = toggle(f.label, (v) => {
    item.classList.toggle('off', !v);
    persist((s) => (s.features[f.id] = v));
  });
  const opts = Object.entries(f.options ?? {});
  const lone = opts.length === 1 && opts[0][1].type === 'color' ? opts[0] : null;

  if (lone) {
    // Color in the row itself (Accent color): the dot opens the picker.
    const [key, opt] = lone;
    const dot = colorDot(opt.label);
    const save = (v: string, live = false) => {
      if (f.id === 'accent') tint(v);
      persist((s) => (s.options[`${f.id}.${key}`] = v), live);
    };
    const picker = colorPicker(opt.default as string, (v) => save(v, true), (v) => save(v));
    item.append(row(f.label, f.hint, f.icon, dot, sw.el), panel(item, dot, picker.el));
    settings.then((s) => {
      const v = optionValue(f, key, s) as string;
      picker.set(v);
      if (f.id === 'accent') tint(v);
    });
  } else if (opts.length) {
    const c = chevron();
    item.append(row(f.label, f.hint, f.icon, c, sw.el), panel(item, c, optionRows(f)));
  } else {
    item.append(row(f.label, f.hint, f.icon, sw.el));
  }

  const show = (v: boolean) => (sw.set(v), item.classList.toggle('off', !v));
  show(f.defaultOn);
  settings.then((s) => show(isOn(f, s)));
  return item;
}

const groups = new Map<Group | 'other', HTMLElement>();
for (const key of [...Object.keys(GROUPS), 'other'] as (Group | 'other')[]) {
  const card = el('div', 'kp-card');
  groups.set(key, card);
  app.append(el('section', 'kp-section', el('h2', '', key === 'other' ? 'Other' : GROUPS[key]), card));
}
for (const f of features) groups.get(f.group ?? 'other')!.append(featureItem(f));
for (const card of groups.values()) if (!card.children.length) card.parentElement!.remove();

// Footer: version and a two-click reset.
const reset = el('button', 'kp-link', 'Reset all');
reset.type = 'button';
reset.addEventListener('click', () => {
  if (reset.dataset.armed) return void saveSettings({ features: {}, options: {} }).then(() => location.reload());
  reset.dataset.armed = '1';
  reset.textContent = 'Click again to reset';
});
reset.addEventListener('blur', () => (delete reset.dataset.armed, (reset.textContent = 'Reset all')));
app.append(el('footer', 'kp-footer', el('span', '', `v${chrome.runtime.getManifest().version}`), reset));

settings.then(() => (app.inert = false));
