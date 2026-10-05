// Pure math first (tested in test/color.test.ts), DOM after.
import { el } from '../core/dom.ts';

export interface Hsv { h: number; s: number; v: number } // h 0-360, s and v 0-1

export function normHex(input: string): string | null {
  const m = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(m)) return `#${[...m].map((c) => c + c).join('')}`;
  return /^[0-9a-f]{6}$/.test(m) ? `#${m}` : null;
}

export function hexToHsv(hex: string): Hsv {
  const n = parseInt((normHex(hex) ?? '#000000').slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return `#${[f(5), f(3), f(1)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

// Hue 0 (red) at the top, clockwise, like conic-gradient's default.
export function pointToHs(dx: number, dy: number, radius: number): { h: number; s: number } {
  const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  return { h, s: Math.min(1, Math.hypot(dx, dy) / radius) };
}

export const PRESETS = ['#cb274a', '#ff0033', '#f2711c', '#e5b80b', '#21ba45', '#00a6a6', '#3e8ef7', '#8e5cf7'];

export interface Picker {
  el: HTMLElement;
  set(hex: string): void;
}

/** `onInput` fires while dragging (live preview), `onCommit` when a change is final. */
export function colorPicker(fallback: string, onInput: (hex: string) => void, onCommit: (hex: string) => void): Picker {
  let hsv = hexToHsv(fallback);
  let hex = fallback;

  const swatches = el('div', 'kp-swatches');
  for (const c of PRESETS) {
    const b = el('button', 'kp-swatch');
    b.type = 'button';
    b.style.background = c;
    b.dataset.hex = c;
    b.ariaLabel = c;
    b.addEventListener('click', () => (set(c), onCommit(c)));
    swatches.append(b);
  }

  const knob = el('span', 'kp-knob');
  const shade = el('span', 'kp-shade'); // black over the wheel for brightness < 1
  const wheel = el('div', 'kp-wheel', shade, knob);
  wheel.tabIndex = 0;
  wheel.role = 'slider';
  wheel.ariaLabel = 'Hue and saturation';

  const bright = el('input', 'kp-bright');
  bright.type = 'range';
  bright.min = '0';
  bright.max = '100';
  bright.ariaLabel = 'Brightness';

  const chip = el('span', 'kp-chip');
  const field = el('input', 'kp-hex');
  field.spellcheck = false;
  field.maxLength = 7;
  field.ariaLabel = 'Hex color';
  const reset = el('button', 'kp-reset', 'Reset to default');
  reset.type = 'button';
  reset.addEventListener('click', () => (set(fallback), onCommit(fallback)));

  const root = el('div', 'kp', swatches,
    el('div', 'kp-main', wheel, el('div', 'kp-side', bright, el('label', 'kp-field', chip, field), reset)));

  // `typed` skips rewriting the hex field while the user types in it.
  function paint(typed = false) {
    const r = wheel.clientWidth / 2 || 66;
    const rad = (hsv.h * Math.PI) / 180;
    knob.style.translate = `${Math.sin(rad) * hsv.s * r}px ${-Math.cos(rad) * hsv.s * r}px`;
    shade.style.opacity = String(1 - hsv.v);
    root.style.setProperty('--kp-color', hex);
    root.style.setProperty('--kp-full', hsvToHex({ ...hsv, v: 1 }));
    bright.value = String(Math.round(hsv.v * 100));
    if (!typed) field.value = hex.toUpperCase();
    for (const b of swatches.children as HTMLCollectionOf<HTMLElement>) b.classList.toggle('sel', b.dataset.hex === hex);
  }

  function set(value: string) {
    const n = normHex(value);
    if (!n) return;
    const next = hexToHsv(n);
    // Grey has no hue and black no saturation: keep the knob where it was.
    hsv = { h: next.s && next.v ? next.h : hsv.h, s: next.v ? next.s : hsv.s, v: next.v };
    hex = n;
    paint();
  }

  const update = (next: Partial<Hsv>, commit: boolean) => {
    hsv = { ...hsv, ...next };
    hex = hsvToHex(hsv);
    paint();
    (commit ? onCommit : onInput)(hex);
  };

  const fromPointer = (e: PointerEvent, commit: boolean) => {
    const b = wheel.getBoundingClientRect();
    update(pointToHs(e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2, b.width / 2), commit);
  };
  wheel.addEventListener('pointerdown', (e) => {
    wheel.setPointerCapture(e.pointerId);
    wheel.classList.add('drag');
    fromPointer(e, false);
  });
  wheel.addEventListener('pointermove', (e) => wheel.hasPointerCapture(e.pointerId) && fromPointer(e, false));
  const end = (e: PointerEvent) => {
    if (!wheel.classList.contains('drag')) return;
    wheel.classList.remove('drag');
    fromPointer(e, true);
  };
  wheel.addEventListener('pointerup', end);
  wheel.addEventListener('pointercancel', end);
  wheel.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    const k: Record<string, Partial<Hsv>> = {
      ArrowLeft: { h: (hsv.h + 360 - step) % 360 },
      ArrowRight: { h: (hsv.h + step) % 360 },
      ArrowUp: { s: Math.min(1, hsv.s + step / 100) },
      ArrowDown: { s: Math.max(0, hsv.s - step / 100) },
    };
    if (!k[e.key]) return;
    e.preventDefault();
    update(k[e.key], true);
  });

  bright.addEventListener('input', () => update({ v: bright.valueAsNumber / 100 }, false));
  bright.addEventListener('change', () => update({ v: bright.valueAsNumber / 100 }, true));

  field.addEventListener('input', () => {
    const n = normHex(field.value);
    if (n && field.value.replace('#', '').length === 6) {
      set(n);
      paint(true);
      onInput(n);
    }
  });
  field.addEventListener('change', () => {
    const n = normHex(field.value);
    if (n) { set(n); onCommit(n); }
    else paint(); // invalid: put the current color back
  });

  set(fallback);
  return { el: root, set };
}
