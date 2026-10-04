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
| Long tasks added             | 0                                     | Small observer roots, and idempotent writes with no layout reads in loops |
| Observers alive              | Only scoped ones for running features | `waitFor` disconnects; signals abort the rest                     |
| Timers and polling           | None                                  | YouTube's own events only                                         |

## Rules

- CSS comes first. Most features are stylesheet rules behind an `html[kyt-<id>]` attribute.
- Animation stays on the compositor with `transform` and `opacity`. Arrows rotate instead of swapping icons, and dropdowns use `grid-template-rows: 0fr` to `1fr`.
- Every transition has a `prefers-reduced-motion` override.
- An observer watches one container, such as the grid or the action row, and never `document`.
- Repairs write only when needed: they check first, then write. A write that changes nothing still costs a style recalculation.

## Checking

Open the browser's Performance panel on Home, a watch page, Subscriptions and History, and record with Kempt on and off. The difference should be lost in the noise.
