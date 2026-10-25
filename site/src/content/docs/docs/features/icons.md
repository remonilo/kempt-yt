---
title: Icons
description: One icon set across YouTube, drawn over YouTube's own buttons.
banner:
  content: These docs are outdated and will be updated once v1.0 is released.
---

YouTube mixes three icon styles. Kempt replaces them with one set of 1.5px rounded strokes across the top bar, the sidebar, the player controls, the action row under the video (like, dislike, share, save, download, clip, more), the Create button, the subscribe bell, and the rows of popup menus: the account menu, the ⋯ menu under the video and the ⋯ menu on video cards.

Comments get the set too: like and dislike share one pill with the count between them, and Reply sits in its own pill. Channel pages follow: the header links, the About dialog rows, and the like, share and comment buttons on posts (Posts tab, channel Home and post pages).

Pressed like and dislike buttons use the filled version of their icon. The bell shows its three states: all notifications, personalized, none.

## Settings

The switch is **Look → Icons**, with no options.

## How it works

Kempt never replaces a YouTube button. It masks the icon inside it:

1. At start, Kempt writes each icon's URL as a CSS variable, `--kyt-i-<name>`, on `<html>`. CSS can't build an extension's per-install URL by itself.
2. The stylesheet turns YouTube's icon box into `background: currentColor` masked by that icon, and hides the original SVG inside.

YouTube's button keeps its own click handler and tooltip. Turning the feature off removes the mask, and the original icon shows again.

Kempt finds the top bar and the like and dislike buttons by their position in the page. Share, Save, Download and Clip have localized labels, so the [page bridge](/kempt-yt/docs/internals/page-bridge/) stamps each with its icon type from YouTube's data (`kyt-icon="SHARE"`), which is the same in every language. The bell has one animated icon for all states, so the bridge stamps its state too (`kyt-bell="all"`). Menu rows are stamped the same way when a menu opens. Video card menus carry no icon type, so their rows are matched by title from the card's data.

## Sources

The set comes from Juxtopposed's [YouTube Redesign (Community)](https://www.figma.com/community/file/1450380484645543336/youtube-redesign) Figma file, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Kempt exports, renames and resizes the icons and draws them as CSS masks. Glyphs it lacks (Ask, Thanks, Movies, Podcasts and a few more) come from [Hugeicons](https://hugeicons.com) Stroke Rounded (MIT), which has the same stroke. Anything still unmapped keeps YouTube's icon. Player control icons apply to YouTube's current player only; older player builds keep YouTube's icons.

`npm run icons` re-exports the set into `src/icons/`.
