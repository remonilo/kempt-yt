import { isOn, optionValue, type Option } from '../core/feature.ts';
import { loadSettings, saveSettings } from '../core/settings.ts';
import { features } from '../features/index.ts';

type Field = HTMLInputElement | HTMLSelectElement;
const list = document.getElementById('list')!;

function row(text: string, input: Field, cls = ''): HTMLLabelElement {
  const l = document.createElement('label');
  l.className = cls;
  l.append(text, input);
  return l;
}

function input(opt: Option, onChange: (v: unknown) => void): Field {
  if (opt.type === 'choice') {
    const s = document.createElement('select');
    for (const [value, label] of Object.entries(opt.choices)) s.add(new Option(label, value));
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }
  const i = document.createElement('input');
  i.type = opt.type === 'boolean' ? 'checkbox' : opt.type;
  if (opt.type === 'number') {
    if (opt.min != null) i.min = String(opt.min);
    if (opt.max != null) i.max = String(opt.max);
  }
  i.addEventListener('input', () =>
    onChange(opt.type === 'boolean' ? i.checked : opt.type === 'number' ? i.valueAsNumber : i.value),
  );
  return i;
}

const show = (i: Field, v: unknown) => {
  if (i instanceof HTMLInputElement && i.type === 'checkbox') i.checked = v as boolean;
  else i.value = String(v);
};

// Rows render synchronously with defaults so Firefox sizes the panel from its full content on the first
// layout. Waiting for storage.sync first (slow cold start in Firefox) left a near-empty panel that closed.
const settings = loadSettings();
const inputs: Field[] = [];
const add = (text: string, i: Field, cls?: string) => {
  i.disabled = true;
  inputs.push(i);
  const r = row(text, i, cls);
  list.append(r);
  return r;
};

if (!features.length) list.innerHTML = '<div class="empty">No features yet.</div>';
for (const f of features) {
  const toggle = input({ type: 'boolean', label: f.label, default: f.defaultOn }, (v) =>
    settings.then((s) => ((s.features[f.id] = v as boolean), saveSettings(s))),
  );
  show(toggle, f.defaultOn);
  add(f.label, toggle);
  settings.then((s) => show(toggle, isOn(f, s)));
  const rows = new Map<string, { field: Field; row: HTMLLabelElement }>();
  // Rows of options with a parent show only while the parent box is checked.
  const sync = () => {
    for (const [key, opt] of Object.entries(f.options ?? {})) {
      const p = opt.parent && rows.get(opt.parent)?.field;
      if (p instanceof HTMLInputElement) rows.get(key)!.row.hidden = !p.checked;
    }
  };
  for (const [key, opt] of Object.entries(f.options ?? {})) {
    const i = input(opt, (v) => (sync(), settings.then((s) => ((s.options[`${f.id}.${key}`] = v), saveSettings(s)))));
    show(i, opt.default);
    rows.set(key, { field: i, row: add(opt.label, i, opt.parent ? 'opt sub' : 'opt') });
    settings.then((s) => (show(i, optionValue(f, key, s)), sync()));
  }
  sync();
}
settings.then(() => inputs.forEach((i) => (i.disabled = false)));
