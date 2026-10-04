---
title: Adding a feature
description: A new feature is one folder and one line, with no core changes.
---

A feature is a folder under `src/features/` and one line in `src/features/index.ts`. It shows up in the popup and shuts off cleanly, and the core needs no change.

## A CSS-only feature

```text
src/features/progress-bar/index.ts
src/features/progress-bar/style.css
```

```ts
// index.ts
import type { Feature } from '../../core/feature.ts';

export const progressBar: Feature = {
  id: 'progress-bar',
  label: 'Custom progress bar',
  group: 'watch',
  icon: 'play',
  defaultOn: false,
  options: { height: { type: 'number', label: 'Height', default: 4, cssVar: '--kyt-progress-height' } },
};
```

```css
/* style.css: every rule gated by the feature's attribute */
html[kyt-progress-bar] .ytp-progress-bar {
  height: calc(var(--kyt-progress-height) * 1px);
}
```

```ts
// src/features/index.ts
import { progressBar } from './progress-bar/index.ts';
export const features: Feature[] = [/* ... */, progressBar];
```

`build.mjs` picks up `style.css` on its own.

## A feature with code

Add `routes` and `run`:

```ts
export const example: Feature = {
  id: 'example',
  label: 'Example',
  defaultOn: true,
  routes: ['watch'],
  run(ctx) {
    const box = document.createElement('div');
    waitFor(S.secondary, { signal: ctx.signal }).then((col) => col.prepend(box));
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

Before you open a PR, read the lessons section of [`PLAN.md`](https://github.com/remonilo/kempt-yt/blob/main/PLAN.md). Each entry there cost a debugging round.
