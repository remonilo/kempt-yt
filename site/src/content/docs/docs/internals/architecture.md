---
title: Architecture
description: The core model, the runner and how CSS is switched on and off.
---

Kempt is a Manifest V3 extension with no framework and no background worker. TypeScript is bundled by esbuild; tests run on `node:test`.

## Principles

1. **CSS before JS.** A visual change is a stylesheet rule. JS runs only to add elements, move elements, read page data or change navigation.
2. **Core knows nothing about features.** A feature is one folder plus one line in a list.
3. **Every feature is toggleable and fully reversible.** Off means zero CSS applied and zero JS running.
4. **No global observers, no polling.** Route changes come from YouTube's `yt-navigate-finish` event. DOM waits watch one container and disconnect as soon as they resolve.
5. **YouTube selectors have one home each.** JS selectors live in `src/core/selectors.ts`; CSS selectors live in the feature's `style.css`.

## Two scripts, two worlds

The manifest injects two scripts into every YouTube page, both at `document_start`:

| Script | World | Does |
| --- | --- | --- |
| `content.js` + `content.css` | Isolated | Reads settings, sets `<html>` attributes, routes, runs features |
| `main-world.js` | YouTube's page | Answers [bridge](/kempt-yt/docs/internals/page-bridge/) calls that need YouTube's own objects |

## Project layout

```text
src/
  content.ts         entry: settings -> html attributes -> router -> runner
  main-world.ts      entry in the page world: a 20-line dispatcher
  core/              feature runner, router, settings, DOM helpers, selectors, i18n
  page/              page-world helpers shared by features (ytcfg, innertube, stamping)
  theme/tokens.css   --kyt-* design tokens and overrides of YouTube's --yt-spec-* variables
  features/
    index.ts         the only list of features (also the popup order)
    page.ts          the only list of page-world handlers
    <id>/index.ts    the feature
    <id>/style.css   its CSS
    <id>/page.ts     optional: its page-world handlers
  popup/             renders itself from features/index.ts
test/*.test.ts
```

## The feature contract

```ts
export interface Feature {
  id: string;                        // also the CSS gate: html[kyt-<id>]
  label: string;                     // shown in the popup
  defaultOn: boolean;
  routes?: Route[];                  // omit = every page
  options?: Record<string, Option>;  // popup controls
  run?(ctx: Ctx): void;              // omit for CSS-only features
}

export interface Ctx {
  signal: AbortSignal;               // aborted when the feature turns off or leaves its routes
  option<T>(key: string): T;         // live option value
  call: typeof call;                 // typed call into the page world
}
```

Rules for `run()`:

- Pass `{ signal: ctx.signal }` to every listener, observer and wait.
- On abort, remove what you added and put back what you moved.
- To react to a new video on the watch page, listen for `kyt:navigate` with the same signal.

## The runner

On startup, on every settings change and on every route change:

```text
for each feature:
  enabled   = settings[id] ?? defaultOn
  html.toggleAttribute(`kyt-${id}`, enabled)       // turns its CSS on or off
  shouldRun = enabled && run && (no routes || routes includes route)
  if running and not shouldRun: abort its controller
  if not running and shouldRun: new AbortController, run(ctx)
```

One `AbortController` per running feature is the whole lifecycle. Every listener and observer the feature made hangs off its signal, so turning a feature off can't leak.

## CSS gating

Every rule in a feature's `style.css` starts with `html[kyt-<id>]`:

```css
html[kyt-subscribe-red] ytd-subscribe-button-renderer button:not([subscribed]) { ... }
```

All feature CSS ships as one `content.css`, injected by the manifest before YouTube paints. Toggling a feature flips one attribute: no style injection at runtime, no flash. `test/structure.test.ts` fails the build if a rule is missing its gate.

`chrome.storage` answers asynchronously, too late for the first paint. So `settings.ts` mirrors the enabled set to `localStorage['kyt:flags']`, and `content.ts` reads it synchronously at `document_start`. Storage stays the source of truth.

## Router

`routeOf(url)` is a pure, unit-tested function: `/watch` is `watch`, `/feed/subscriptions` is `subscriptions`, and so on. The router listens to `yt-navigate-finish`, which YouTube fires on every in-page navigation, and to `popstate`. It then dispatches `kyt:navigate` with the route and URL.

## DOM helpers

```ts
waitFor(sel, { root, signal, timeout = 10_000 }): Promise<Element>
```

One `MutationObserver` on `root` only. It disconnects on a match, an abort or a timeout. On timeout it logs `kyt: selector "<name>" not found`, the first warning when YouTube changes its markup.

Observers that repair YouTube's re-renders write inside the observer callback itself. That runs before the next paint; a `requestAnimationFrame` delay would paint the unrepaired page for one frame, which shows as flicker.

## Design tokens

`src/theme/tokens.css` defines every color Kempt uses as a `--kyt-*` variable, with a light and a dark value. The accent feature points YouTube's own `--yt-spec-*` variables at them. A custom accent is one variable on `<html>`, and every tint is derived from it with `color-mix()`.
