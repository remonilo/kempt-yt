---
title: Performance
description: The budget Kempt holds itself to, and how.
banner:
  content: These docs are outdated and will be updated once v1.0 is released.
---

Kempt should cost nothing you can measure.

## Budget

| Metric                       | Target                                | How                                                               |
| ---------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| `content.js` + `content.css` | Under 100 KB (about 92 KB in 0.2.0)   | No framework. Icons are files masked in CSS.                      |
| Script per navigation        | Under 5 ms                            | Features run only on their routes. CSS does most of the work.     |
| Long tasks added             | 0                                     | Small observer roots, and idempotent writes with no layout reads in loops |
| Observers alive              | Only scoped ones for running features | `waitFor` disconnects; signals abort the rest                     |
| Timers and polling           | No intervals                          | YouTube's own events; a few capped startup waits (see below)      |

## Rules

- CSS comes first. Most features are stylesheet rules behind an `html[kyt-<id>]` attribute.
- Animation stays on the compositor with `transform` and `opacity` where it can. Arrows rotate instead of swapping icons. Dropdowns animate `grid-template-rows: 0fr` to `1fr`, a layout animation that runs only on click.
- Every transition has a `prefers-reduced-motion` override.
- An observer watches one container, such as the grid or the action row. `waitFor` falls back to `document` when no root is given, and disconnects once the element appears or after 10 s.
- The page world waits for YouTube's globals (`signedIn`, the guide data, icon names) with short capped loops of 100 ms sleeps. They end on success and never run in the background.
- Repairs write only when needed: they check first, then write. A write that changes nothing still costs a style recalculation.

## Checking

Open the browser's Performance panel on Home, a watch page, Subscriptions and History, and record with Kempt on and off. The difference should be lost in the noise.
