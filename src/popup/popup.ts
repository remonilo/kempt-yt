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

loadSettings().then((s) => {
  if (!features.length) {
    list.innerHTML = '<div class="empty">No features yet.</div>';
    return;
  }
  for (const f of features) {
    const toggle = input({ type: 'boolean', label: f.label, default: f.defaultOn }, isOn(f, s), (v) => {
      s.features[f.id] = v as boolean;
      saveSettings(s);
    });
    list.append(row(f.label, toggle));
    for (const [key, opt] of Object.entries(f.options ?? {})) {
      const i = input(opt, optionValue(f, key, s), (v) => {
        s.options[`${f.id}.${key}`] = v;
        saveSettings(s);
      });
      list.append(row(opt.label, i, 'opt'));
    }
  }
});
