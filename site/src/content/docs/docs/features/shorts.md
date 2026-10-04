---
title: Shorts
description: Hide Shorts, and open Shorts links as normal videos.
---

Shorts shelves disappear from Home, Subscriptions, search, channels and the sidebar. A Shorts link, from anywhere, opens in the normal player with a seek bar, volume and the usual layout.

## Settings

**Feeds → Hide Shorts.** No options.

## How it works

- **Hiding** is CSS: shelf elements such as `ytd-reel-shelf-renderer`, `ytd-rich-shelf-renderer[is-shorts]` and `grid-shelf-view-model`, the sidebar entry and the Shorts tab on channels.
- **Redirecting** covers the three ways into a Short:
  1. A click on a `/shorts/` link is caught before YouTube's handler and becomes an in-page navigation to `/watch?v=ID`.
  2. An in-page navigation to a Shorts URL (from YouTube's own code) is caught at `yt-navigate-start` and sent to the same place.
  3. Opening `/shorts/ID` directly is replaced with the watch URL before the page draws.

Channel tabs have localized names, so the [page bridge](/kempt-yt/docs/internals/page-bridge/) stamps the Shorts tab from its data (`kyt-tab="shorts"`).

## Limits

- The Shorts filter chip in search stays. It has no marker that works in every language.
