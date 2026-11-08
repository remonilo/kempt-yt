import { el } from '../core/dom.ts';
import { GROUPS, isOn, optionValue, type Feature, type Group, type Option } from '../core/feature.ts';
import { loadSettings, saveSettings, updateSettings, type Settings } from '../core/settings.ts';
import { features } from '../features/index.ts';
import { faceCss, familyOf } from '../features/font/index.ts';
import { colorPicker } from './color.ts';

// Rows render synchronously with defaults, inert until storage.sync answers (docs/internals/youtube-quirks).
const settings = loadSettings();
const app = document.getElementById('app')!;
app.inert = true;

// `live` (dragging) writes at most every 500ms, so the page follows the drag: storage.sync allows 120 writes a minute.
let timer: ReturnType<typeof setTimeout> | undefined;
let lastWrite = 0;
// Changes apply to a fresh read at write time, so the popup never writes back a stale snapshot over a change the
// page made (in-page Grid/List toggles) while it was open.
let changes: ((s: Settings) => void)[] = [];
function persist(change: (s: Settings) => void, live = false) {
  changes.push(change);
  clearTimeout(timer);
  const write = () => {
    lastWrite = Date.now();
    const cs = changes;
    changes = [];
    updateSettings((s) => cs.forEach((c) => c(s)));
  };
  const wait = live ? 500 - (Date.now() - lastWrite) : 0;
  if (wait > 0) timer = setTimeout(write, wait);
  else write();
}

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

// Equal-width segments so the pill moves by transform only.
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

function fontFace(k: string) {
  if (!document.querySelector('style.kp-faces')) {
    document.head.append(Object.assign(el('style', 'kp-faces'), { textContent: faceCss((file) => `fonts/${file}`) }));
  }
  return k === 'system' ? 'system-ui' : `"${familyOf(k)}"`;
}

function number(opt: Extract<Option, { type: 'number' }>, on: (v: number, live?: boolean) => void) {
  const i = el('input', opt.slider ? 'kp-range' : 'kp-number');
  i.type = opt.slider ? 'range' : 'number';
  if (opt.min != null) i.min = String(opt.min);
  if (opt.max != null) i.max = String(opt.max);
  if (opt.step != null) i.step = String(opt.step);
  // Typed values skip min/max/step; checkValidity also rejects an empty field.
  i.addEventListener('change', () => i.checkValidity() && Number.isFinite(i.valueAsNumber) && on(i.valueAsNumber));
  if (!opt.slider) return { el: i, set: (v: unknown) => (i.value = String(v)) };

  // Dragging applies live (throttled by persist); the fill is the accent up to the thumb.
  const out = el('output', 'kp-range-value');
  const show = () => {
    out.textContent = `${i.value}${opt.unit ?? ''}`;
    i.style.setProperty('--p', String((i.valueAsNumber - Number(i.min)) / (Number(i.max) - Number(i.min))));
  };
  i.ariaLabel = opt.label;
  i.addEventListener('input', () => (show(), on(i.valueAsNumber, true)));
  return { el: el('div', 'kp-slider', i, out), set: (v: unknown) => ((i.value = String(v)), show()) };
}

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
    if (opt.type === 'color') continue; // a lone color option sits in the feature row
    const save = (v: unknown, live = false) => {
      values.set(key, v);
      sync();
      persist((s) => (s.options[`${f.id}.${key}`] = v), live);
    };
    let r: HTMLElement;
    let set: (v: unknown) => void;
    if (opt.type === 'choice' && Object.keys(opt.choices).length > 3) {
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

// A switch whose parts another switch already hides (coveredBy) is dimmed, and its hint names that switch.
const onNow = new Map<string, boolean>();
const covers: (() => void)[] = [];
const setOn = (id: string, v: boolean) => (onNow.set(id, v), covers.forEach((c) => c()));
const labelOf = (id: string) => features.find((f) => f.id === id)?.label ?? id;

function coverHint(f: Feature, item: HTMLElement) {
  if (!f.coveredBy) return;
  const small = item.querySelector('.kp-label small');
  covers.push(() => {
    const by = f.coveredBy!.find((c) => [c].flat().every((id) => onNow.get(id)));
    item.classList.toggle('covered', !!by);
    if (small) small.textContent = by ? `Covered by ${labelOf([by].flat()[0])}` : f.hint ?? '';
  });
}

function featureItem(f: Feature) {
  const item = el('div', 'kp-item');
  const sw = toggle(f.label, (v) => {
    item.classList.toggle('off', !v);
    setOn(f.id, v);
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

  coverHint(f, item);
  const show = (v: boolean) => (sw.set(v), item.classList.toggle('off', !v), setOn(f.id, v));
  show(f.defaultOn);
  settings.then((s) => show(isOn(f, s)));
  return item;
}

// One group at a time, picked from tabs in the header; only the tab's content scrolls. The last tab is
// remembered in the popup's own localStorage: it is UI state, not a setting.
const sections = new Map<Group, HTMLElement>();
for (const key of Object.keys(GROUPS) as Group[]) {
  const section = el('section', 'kp-section');
  section.role = 'tabpanel';
  sections.set(key, section);
  app.append(section);
}
// A new card, under a sticky heading when the feature has a section, each time the section changes.
const cardSection = new Map<HTMLElement, string | undefined>();
for (const f of features) {
  const section = sections.get(f.group)!;
  let card = section.lastElementChild as HTMLElement | null;
  if (!card || cardSection.get(card) !== f.section) {
    if (f.section) section.append(el('h3', 'kp-heading', f.section));
    card = el('div', 'kp-card');
    cardSection.set(card, f.section);
    section.append(card);
  }
  card.append(featureItem(f));
}

const show = (g: string) => {
  for (const [k, s] of sections) s.hidden = k !== g;
  localStorage.setItem('kp-tab', g);
};
const tabs = segmented(GROUPS, show);
tabs.el.classList.add('kp-tabs');
tabs.el.role = 'tablist';
for (const b of tabs.el.querySelectorAll('button')) b.role = 'tab';
// Rate goes to the store this copy came from: Firefox serves extension pages from moz-extension://.
const store = chrome.runtime.getURL('').startsWith('moz-extension:')
  ? 'https://addons.mozilla.org/firefox/addon/kempt-for-youtube/reviews/'
  : 'https://chromewebstore.google.com/detail/kempt-for-youtube/dpiheahglgggkdjcgdkiogpmhbmppfmg/reviews';
const link = (cls: string, label: string, title: string, href: string) =>
  Object.assign(el('a', `kp-icon-link ${cls}`, icon(cls), label), { href, target: '_blank', rel: 'noopener', title });
const links = el('nav', 'kp-links', link('star', 'Rate', 'Rate Kempt', store), link('heart', 'Sponsor', 'Sponsor on GitHub', 'https://github.com/sponsors/remonilo'));
document.querySelector('.kp-header')!.append(links, tabs.el);
const first = localStorage.getItem('kp-tab') ?? 'look';
const start = first in GROUPS ? first : 'look';
tabs.set(start);
show(start);

const reset = el('button', 'kp-link', 'Reset all');
reset.type = 'button';
reset.addEventListener('click', () => {
  if (reset.dataset.armed) return void saveSettings({ features: {}, options: {} }).then(() => location.reload());
  reset.dataset.armed = '1';
  reset.textContent = 'Click again to reset';
});
reset.addEventListener('blur', () => (delete reset.dataset.armed, (reset.textContent = 'Reset all')));
document.body.append(el('footer', 'kp-footer', el('span', '', `v${chrome.runtime.getManifest().version}`), reset));

settings.then(() => (app.inert = false));
