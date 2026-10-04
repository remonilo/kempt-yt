import type { call } from './bridge.ts';
import type { Route } from './router.ts';
import type { Settings } from './settings.ts';

/** `parent`: key of a boolean option of the same feature. While it's false this option is inactive (attribute
 *  unset, popup row hidden). */
export type Option = { label: string; cssVar?: string; parent?: string } & (
  | { type: 'boolean'; default: boolean }
  | { type: 'color'; default: string }
  | { type: 'number'; default: number; min?: number; max?: number }
  | { type: 'choice'; default: string; choices: Record<string, string> }
);

/** Popup sections, in display order. */
export const GROUPS = { look: 'Look', navigation: 'Navigation', watch: 'Watch page', feeds: 'Feeds' } as const;
export type Group = keyof typeof GROUPS;

export interface Ctx {
  /** Aborted when the feature is turned off or leaves its routes. Undo your DOM work on abort. */
  signal: AbortSignal;
  /** Live option value. */
  option<T = unknown>(key: string): T;
  /** Call a main-world.ts handler. */
  call: typeof call;
}

export interface Feature {
  /** Also the CSS gate: html[kyt-<id>] */
  id: string;
  label: string;
  /** Muted second line in the popup. */
  hint?: string;
  /** Popup section; omitted = "Other". */
  group?: Group;
  /** Popup row icon: a file name in src/icons/ without .svg. */
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
/** False while the option's parent option is off. */
export const optionActive = (f: Feature, key: string, s: Settings) => {
  const p = f.options?.[key]?.parent;
  return !p || optionValue(f, p, s) === true;
};

/** Applies settings and route to every feature: html[kyt-*] flags and option vars, then starts or aborts run().
 *  `bridge` is ctx.call (a parameter so tests can run the runner without the page world). */
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
