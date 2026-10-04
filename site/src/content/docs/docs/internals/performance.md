---
title: Performance
description: The budget Kempt holds itself to, and how.
---

Kempt should cost nothing you can measure.

## Budget

| Metric                       | Target                                | How                                                               |
| ---------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| `content.js` + `content.css` | Under 60 KB                           | No framework. Icons are files masked in CSS.                      |
| Script per navigation        | Under 5 ms                            | Features run only on their routes. CSS does most of the work.     |
| Long tasks added             | 0                                     | Small observer roots, idempotent writes, no layout reads in loops |
| Observers alive              | Only scoped ones for running features | `waitFor` disconnects; signals abort the rest                     |
| Timers and polling           | None                                  | YouTube's own events only                                         |

## Rules

- **CSS first.** Most features are stylesheet rules behind an `html[kyt-<id>]` attribute.
- **Compositor-only animation.** Animate `transform` and `opacity`. Arrows rotate instead of swapping icons. Dropdowns use `grid-template-rows: 0fr` to `1fr`.
- **Respect `prefers-reduced-motion`.** Every transition has a reduced-motion override.
- **No global observers.** An observer watches one container (the grid, the action row), never `document`.
- **Write only when needed.** Repairs are idempotent: check, then write. A write that changes nothing still costs a style recalculation.

## Checking

Open the browser's Performance panel on Home, a watch page and Subscriptions, and record with Kempt on and off. The difference should be lost in the noise.
