---
title: Settings
description: What each switch and option in the popup does.
---

Click the Kempt icon in the browser toolbar. The tabs at the top switch between the groups below (Look, Menus, Watch, Feeds, Hide), and the popup reopens on the last one. Changes apply to open YouTube tabs at once.

![Kempt popup](../../../assets/screenshots/popup.png)

## Switches

| Group | Switch | Options | Default |
| --- | --- | --- | --- |
| Look | [Accent color](/kempt-yt/docs/features/look/) | Any color | On, `#cb274a` |
| | [Logo](/kempt-yt/docs/features/look/#logo) | Style: Pixel play button, Snake, Comet, Paper boat | Off, Pixel play button |
| | [Font](/kempt-yt/docs/features/look/#font) | Plus Jakarta Sans, Inter, Geist, Figtree, System | On, Plus Jakarta Sans |
| | [Tinted hover & selected](/kempt-yt/docs/features/look/#tinted-hover-and-selected) | | On |
| | [Accent Subscribe button](/kempt-yt/docs/features/look/#subscribe-button) | | On |
| | [Outlined search bar](/kempt-yt/docs/features/look/#search-bar) | | On |
| | [Icons](/kempt-yt/docs/features/icons/) | | On |
| | [Hide button labels](/kempt-yt/docs/features/look/#hide-button-labels) | | On |
| | [Channel tabs](/kempt-yt/docs/features/look/#channel-tabs) | | On |
| Menus | [Redesigned sidebar](/kempt-yt/docs/features/sidebar/) | Hide "You", "Your channel", "Your videos", "Courses" | On, all hidden |
| | [Settings in top bar](/kempt-yt/docs/features/top-bar/) | | On |
| | [Watch later button](/kempt-yt/docs/features/top-bar/#watch-later-button) | | On |
| | [Notification actions](/kempt-yt/docs/features/top-bar/#notification-actions) | | On |
| Watch | [Tabs](/kempt-yt/docs/features/watch-tabs/) | Ask AI on or off; as an icon button or a tab; dot on Info for tickets, merch, donations | On, Ask AI as a button, dot on |
| | [Captions](/kempt-yt/docs/features/captions/) | Style: Shadow, Box or Blur; Size 50% to 200% | On, Shadow, 100% |
| | [Comment sort as buttons](/kempt-yt/docs/features/comment-sort/) | | On |
| | [Comment search](/kempt-yt/docs/features/comment-search/) | | On |
| | [Comment layout](/kempt-yt/docs/features/comment-sort/#comment-layout) | | On |
| | [Fun progress bar](/kempt-yt/docs/features/progress-bar/) | Style: Wave, Snake, Comet, Paper boat; Animate | Off, Wave, animated |
| Feeds | [Timeline](/kempt-yt/docs/features/timeline/) | Subscriptions view: Timeline, Plain, Channels; layout: Grid or List | On, Timeline, Grid |
| | [Subscriptions tabs](/kempt-yt/docs/features/timeline/#subscriptions-tabs) | Videos, Channels and [Collections](/kempt-yt/docs/features/timeline/#collections) tabs. Channels layout: Grid or List; channels per row | On, Grid, 5 per row |
| | [Playlist pages](/kempt-yt/docs/features/search-and-playlists/#playlist-pages) | Library layout: List or Grid | On, List |
| | [Downloads page](/kempt-yt/docs/features/search-and-playlists/#downloads-page) | | On |
| | [Search filters and grid](/kempt-yt/docs/features/search-and-playlists/#search-filters) | Results layout: Grid or List | On, Grid |
| | [Grid size](/kempt-yt/docs/features/grid/) | Videos per row, Shorts per row | Off, 4 and 6 |
| Hide | [Shorts](/kempt-yt/docs/features/shorts/) | | On |
| | [Subscriptions as Home](/kempt-yt/docs/features/hide/#subscriptions-as-home) | | Off |
| | [Autoplay](/kempt-yt/docs/features/hide/#autoplay) | | Off |
| | [22 more: Explore, Subscriptions, top bar buttons, Special logos, Home feed and chips, Mixes, Playables, Search extras, watch page parts](/kempt-yt/docs/features/hide/) | | Off |

The Hide tab groups its switches under sub-headings by page. A switch another one already covers is dimmed, and says which switch covers it.

## The color picker

The dot in the Accent color row opens a picker: swatches, a hue and saturation wheel, a brightness slider and a hex field. Everything that uses the accent follows it, including the tint behind selected items and the Subscribe button.

## Sync and reset

Kempt saves settings with `chrome.storage.sync`, so they follow your browser account to other computers. The popup footer shows the version and a **Reset all** button; click it twice to confirm. The two buttons at the top of the popup open the store page, to rate Kempt, and GitHub Sponsors.

## How it works

The popup has no list of its own. It reads the same feature list the extension runs (`src/features/index.ts`) and draws one row per feature from its `label`, `hint`, `icon`, `group` and `options`. A new feature appears in the popup with no popup changes.

When a color or number option names a `cssVar`, Kempt writes it straight onto `<html>` as a CSS variable. Number options with `slider: true` draw as a range input and apply while you drag. Boolean options become attributes such as `kyt-sidebar-hide-you`, which the feature's CSS matches. Live drags save at most every 400 ms, because `storage.sync` allows 120 writes a minute.
