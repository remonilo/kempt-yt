---
title: Settings
description: The popup, its switches and options.
---

Click the Kempt icon in the browser toolbar. Changes apply to open YouTube tabs at once.

<img class="shot" src="/kempt-yt/screenshots/popup.png" alt="Kempt popup" style="max-width: 360px" />

## Switches

| Group | Switch | Options | Default |
| --- | --- | --- | --- |
| Look | [Accent color](/kempt-yt/docs/features/look/) | Any color | On, `#cb274a` |
| | [Tinted hover & selected](/kempt-yt/docs/features/look/#tinted-hover-and-selected) | | On |
| | [Font](/kempt-yt/docs/features/look/#font) | Plus Jakarta Sans, Inter, Geist, Figtree, System | On, Plus Jakarta Sans |
| | [Accent Subscribe button](/kempt-yt/docs/features/look/#subscribe-button) | | On |
| | [Outlined search bar](/kempt-yt/docs/features/look/#search-bar) | | On |
| | [Icons](/kempt-yt/docs/features/icons/) | | On |
| Navigation | [Redesigned sidebar](/kempt-yt/docs/features/sidebar/) | Hide "You", "Your channel", "Your videos", "Courses" | On, all hidden |
| | [Settings in top bar](/kempt-yt/docs/features/top-bar/) | | On |
| | [Watch later button](/kempt-yt/docs/features/top-bar/#watch-later-button) | | On |
| Watch page | [Tabs](/kempt-yt/docs/features/watch-tabs/) | Ask AI on or off; as an icon button or a tab | On |
| | [Comment sort as buttons](/kempt-yt/docs/features/comment-sort/) | | On |
| Feeds | [Hide Shorts](/kempt-yt/docs/features/shorts/) | | On |
| | [Timeline](/kempt-yt/docs/features/timeline/) | | On |
| | [Grid size](/kempt-yt/docs/features/grid/) | Videos per row (2 to 8), Shorts per row (3 to 10) | Off |

## The color picker

The dot in the Accent color row opens a picker: swatches, a hue and saturation wheel, a brightness slider and a hex field. Everything that uses the accent follows it, including the tint behind selected items and the Subscribe button.

## Sync and reset

Settings are saved with `chrome.storage.sync`, so they follow your browser account to other computers. The popup footer shows the version and a **Reset all** button; click it twice to confirm.

## How it works

The popup has no list of its own. It reads the same feature list the extension runs (`src/features/index.ts`) and draws one row per feature from its `label`, `hint`, `icon`, `group` and `options`. A new feature appears in the popup with no popup changes.

A color option that names a `cssVar` is written straight onto `<html>` as a CSS variable. Boolean options become attributes such as `kyt-sidebar-hide-you`, which the feature's CSS matches. Live color drags save at most every 400 ms, because `storage.sync` allows 120 writes a minute.
