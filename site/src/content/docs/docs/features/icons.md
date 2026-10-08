---
title: Icons
description: One icon set across YouTube, drawn over YouTube's own buttons.
---

YouTube mixes three icon styles. Kempt replaces them with one set of 1.5px rounded strokes across the top bar, the sidebar, the action row under the video (like, dislike, share, save, download, clip, more), the Create button, the subscribe bell, and the rows of popup menus: the account menu, the ⋯ menu under the video and the ⋯ menu on video cards.

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

The set comes from Juxtopposed's _YouTube Redesign (Community)_ [Figma](https://www.figma.com/community/file/1450380484645543336/youtube-redesign) file. Glyphs it lacks (Ask, Thanks, Movies, Podcasts and a few more) come from [Hugeicons](https://hugeicons.com) Stroke Rounded, which has the same stroke. Anything still unmapped keeps YouTube's icon. Player controls keep YouTube's icons on purpose.

`npm run icons` re-exports the set into `src/icons/`.
