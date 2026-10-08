import type { call } from './bridge.ts';
import type { Route } from './router.ts';
import type { Settings } from './settings.ts';

/** While the `parent` boolean option is false, this option is inactive (attribute unset, popup row hidden). */
export type Option = { label: string; cssVar?: string; parent?: string } & (
  | { type: 'boolean'; default: boolean }
  | { type: 'color'; default: string }
  /** `slider` draws a range input with the value and `unit` beside it instead of a number field. */
  | { type: 'number'; default: number; min?: number; max?: number; step?: number; slider?: boolean; unit?: string }
  | { type: 'choice'; default: string; choices: Record<string, string> }
);

export const GROUPS = { look: 'Look', navigation: 'Navigation', watch: 'Watch page', feeds: 'Feeds' } as const;
export type Group = keyof typeof GROUPS;

export interface Ctx {
  /** Undo your DOM work on abort. */
  signal: AbortSignal;
  option<T = unknown>(key: string): T;
  call: typeof call;
}

export interface Feature {
  /** Also the CSS gate: html[kyt-<id>] */
  id: string;
  label: string;
  hint?: string;
  group: Group;
  /** A file name in src/icons/ without .svg. */
  icon?: string;
  defaultOn: boolean;
  /** Omit = every page. */
  routes?: Route[];
  /** `cssVar` options are written to <html> as custom properties while the feature is on.
   *  Boolean options that are true set html[kyt-<id>-<key>], choice options set html[kyt-<id>-<key>="<value>"],
   *  so CSS can gate on them. */
  options?: Record<string, Option>;
  /** Omit for CSS-only features. Listen to `kyt:navigate` for same-route navigation. */
  run?(ctx: Ctx): void | Promise<void>;
}

export const isOn = (f: Feature, s: Settings) => s.features[f.id] ?? f.defaultOn;
export const optionValue = (f: Feature, key: string, s: Settings) =>
  s.options[`${f.id}.${key}`] ?? f.options?.[key]?.default;
export const optionActive = (f: Feature, key: string, s: Settings) => {
  const p = f.options?.[key]?.parent;
  return !p || optionValue(f, p, s) === true;
};

// `bridge` is ctx.call, a parameter so tests can run the runner without the page world.
export function createRunner(features: Feature[], bridge: typeof call) {
  const running = new Map<string, AbortController>();
  const html = document.documentElement;
  let current: Settings;

  return function update(route: Route, settings: Settings): void {
    current = settings;
    for (const f of features) {
      const on = isOn(f, settings);
      html.toggleAttribute(`kyt-${f.id}`, on);
      for (const [key, opt] of Object.entries(f.options ?? {})) {
        const active = on && optionActive(f, key, settings);
        const attr = `kyt-${f.id}-${key}`;
        if (opt.type === 'boolean') html.toggleAttribute(attr, active && optionValue(f, key, settings) === true);
        if (opt.type === 'choice') {
          const v = String(optionValue(f, key, settings));
          if (!active) html.removeAttribute(attr);
          else if (html.getAttribute(attr) !== v) html.setAttribute(attr, v);
        }
        if (!opt.cssVar) continue;
        if (on) html.style.setProperty(opt.cssVar, String(optionValue(f, key, settings)));
        else html.style.removeProperty(opt.cssVar);
      }

      const should = on && !!f.run && (!f.routes || f.routes.includes(route));
      const ctl = running.get(f.id);
      if (ctl && !should) {
        ctl.abort();
        running.delete(f.id);
      } else if (!ctl && should) {
        const c = new AbortController();
        running.set(f.id, c);
        const ctx: Ctx = { signal: c.signal, option: (k) => optionValue(f, k, current) as never, call: bridge };
        // One broken feature must not take down the rest.
        Promise.resolve()
          .then(() => f.run!(ctx))
          .catch((e) => console.error(`kyt:${f.id}`, e));
      }
    }
  };
}
