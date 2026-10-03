import { isOn, optionValue, type Option } from '../core/feature.ts';
import { loadSettings, saveSettings } from '../core/settings.ts';
import { features } from '../features/index.ts';

const list = document.getElementById('list')!;

function row(text: string, input: HTMLInputElement, cls = ''): HTMLLabelElement {
  const l = document.createElement('label');
  l.className = cls;
  l.append(text, input);
  return l;
}

function input(opt: Option, value: unknown, onChange: (v: unknown) => void): HTMLInputElement {
  const i = document.createElement('input');
  i.type = opt.type === 'boolean' ? 'checkbox' : opt.type;
  if (opt.type === 'boolean') i.checked = value as boolean;
  else i.value = String(value);
  if (opt.type === 'number') {
    if (opt.min != null) i.min = String(opt.min);
    if (opt.max != null) i.max = String(opt.max);
  }
  i.addEventListener('input', () =>
    onChange(opt.type === 'boolean' ? i.checked : opt.type === 'number' ? i.valueAsNumber : i.value),
  );
  return i;
}

// Rows render synchronously with defaults so Firefox sizes the panel from its full content on the first
// layout. Waiting for storage.sync first (slow cold start in Firefox) left a near-empty panel that closed.
const settings = loadSettings();
const inputs: HTMLInputElement[] = [];
const add = (text: string, i: HTMLInputElement, cls?: string) => {
  i.disabled = true;
  inputs.push(i);
  list.append(row(text, i, cls));
};

if (!features.length) list.innerHTML = '<div class="empty">No features yet.</div>';
for (const f of features) {
  const toggle = input({ type: 'boolean', label: f.label, default: f.defaultOn }, f.defaultOn, (v) =>
    settings.then((s) => ((s.features[f.id] = v as boolean), saveSettings(s))),
  );
  add(f.label, toggle);
  settings.then((s) => (toggle.checked = isOn(f, s)));
  for (const [key, opt] of Object.entries(f.options ?? {})) {
    const i = input(opt, opt.default, (v) => settings.then((s) => ((s.options[`${f.id}.${key}`] = v), saveSettings(s))));
    add(opt.label, i, 'opt');
    settings.then((s) => {
      const v = optionValue(f, key, s);
      if (opt.type === 'boolean') i.checked = v as boolean;
      else i.value = String(v);
    });
  }
}
settings.then(() => inputs.forEach((i) => (i.disabled = false)));
