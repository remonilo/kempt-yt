---
title: Grid size
description: Choose how many videos and Shorts fill each row.
---

YouTube picks how many videos fit in a row from your window width. Grid size lets you set the count yourself, on Home, Subscriptions and channel tabs (Videos, Live, Shorts). Search and History are lists, so they stay as they are.

## Settings

**Feeds → Grid size.** Off by default.

| Option | Range | Default |
| --- | --- | --- |
| Videos per row | 2 to 8 | 4 |
| Shorts per row | 3 to 10 | 6 |

A new count applies at once, without a reload. The Subscriptions timeline headers keep spanning the full row.

## How it works

- **The count is one CSS variable.** YouTube writes its per-row counts inline on each grid (`--ytd-rich-grid-items-per-row`, `--ytd-rich-grid-slim-items-per-row`). A stylesheet rule with `!important` beats a plain inline value, and YouTube's item widths are `calc(100% / per-row - margin)`, so they follow.
- **Rows stay aligned.** YouTube drops the left margin of the items it counted as first in a row. With a different count those are the wrong items, so Kempt gives every item the same margins.
- **Home's Shorts shelf needs code.** The shelf draws only as many Shorts as YouTube's own count, even when it holds more. On Home, a [page-world](/kempt-yt/docs/internals/page-bridge/) handler sets the shelf's `elementsPerRow` to your count. YouTube resets that count whenever the window width changes, so the handler watches the shelf's `elements-per-row` attribute and sets it again.
- **Off means YouTube's count.** Turning Grid size off, or leaving Home, gives the shelf back to YouTube's layout code.
