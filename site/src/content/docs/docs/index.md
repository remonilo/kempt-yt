---
title: Kempt
description: What Kempt changes on YouTube, and how these docs are organized.
---

Kempt is a browser extension that restyles YouTube into one consistent design: one accent color, one icon set, and a few layout changes where YouTube's own layout gets in the way. It runs on Firefox 128+ and on Chromium browsers.

<img class="shot" src="/kempt-yt/screenshots/demo.png" alt="Kempt on a YouTube watch page" />

## What changes

| Where | Change |
| --- | --- |
| Watch page | Info, Comments, Videos, Live chat and Ask AI as tabs beside the player. Comment sort as chips. A Watch later button. |
| Subscriptions, History | A timeline with date headers, type chips and search. |
| Sidebar | Explore, Subscriptions and Playlists as dropdowns. Hide the entries you don't use. |
| Everywhere | One accent color, tinted hover and selection, one icon set, an outlined search bar, Settings in the top bar. |
| Shorts | Hidden. Shorts links open in the normal player. |

Every change is a switch in the popup. Off means off: the feature's CSS stops matching, its code stops, and anything it moved goes back.

## How these docs are organized

- **Start here** covers installing, the popup and common questions.
- **Features** has one page per feature: what it does, its settings, then how it works and its limits.
- **How it works** is for contributors: the core model, the bridge into YouTube's page, the performance rules and how to add a feature.

## Design rules

Kempt follows four rules, and every feature page shows how it applies them.

1. CSS before JS. A visual change is a stylesheet rule. Code runs only to add, move or read something.
2. Every feature is reversible. Turning it off restores YouTube's page without a reload.
3. No polling and no page-wide observers. Kempt reacts to YouTube's own navigation event and watches only the containers it needs.
4. YouTube's selectors live in one place each, so a YouTube update is one `grep` away from a fix.
