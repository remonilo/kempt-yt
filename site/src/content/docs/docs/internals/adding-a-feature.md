---
title: Adding a feature
description: A new feature is one folder and one line, with no core changes.
---

A feature is a folder under `src/features/` and one line in `src/features/index.ts`. It shows up in the popup and shuts off cleanly, and the core needs no change.

## A CSS-only feature

```text
src/features/seek-height/index.ts
src/features/seek-height/style.css
```

```ts
// index.ts
import type { Feature } from '../../core/feature.ts';

export const seekHeight: Feature = {
  id: 'seek-height',
  label: 'Seek bar height',
  group: 'watch',
  defaultOn: false,
  options: { height: { type: 'number', label: 'Height', default: 4, cssVar: '--kyt-seek-height' } },
};
```

```css
/* style.css: every rule gated by the feature's attribute */
html[kyt-seek-height] .ytp-progress-bar {
  height: calc(var(--kyt-seek-height) * 1px);
}
```

```ts
// src/features/index.ts
import { seekHeight } from './seek-height/index.ts';
export const features: Feature[] = [/* ... */, seekHeight];
```

`build.mjs` picks up `style.css` on its own.

## A feature with code

Add `routes` and `run`:

```ts
export const example: Feature = {
  id: 'example',
  label: 'Example',
  group: 'watch',
  defaultOn: true,
  routes: ['watch'],
  run(ctx) {
    const box = document.createElement('div');
    const update = () => { box.textContent = location.search; };
    waitFor(S.watchMetadata, { signal: ctx.signal }).then((el) => el?.prepend(box));
    document.addEventListener('kyt:navigate', update, { signal: ctx.signal });
    ctx.signal.addEventListener('abort', () => box.remove());
  },
};
```

- YouTube selectors used from JS go in `src/core/selectors.ts`. Prefer structure and YouTube's camelCase classes over translated `aria-label`s.
- Every listener and observer takes `ctx.signal`. On abort, put YouTube's page back as you found it.
- Labels you draw go through `local()` with a table for every language. See [Languages](/kempt-yt/docs/features/languages/).
- If you need YouTube's data, add a `page.ts`. See [Page bridge](/kempt-yt/docs/internals/page-bridge/).

## Checklist

```sh
npm run check && npm test && npm run build
```

`test/structure.test.ts` checks that the feature is registered, that every CSS rule is gated by `html[kyt-<id>]`, that page handler names are unique, and that every `page.ts` is registered. If it fails, fix the code and leave the test alone.

Before you open a PR, read [YouTube quirks](/kempt-yt/docs/internals/youtube-quirks/). Each entry there cost a debugging round.
