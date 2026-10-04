---
title: YouTube quirks
description: Behaviour of YouTube's page that shaped how Kempt's features are built.
---

Short comments in the source point here. Each entry is a constraint YouTube imposes, found by breaking something.

## Watch tabs

- YouTube's `updatePanelsLocation` (theater, fullscreen, column changes) expects its panels to be the first children of their parent, in order, and re-inserts all of them otherwise. Kempt's nodes go after that leading run (`YT_PANELS`), and `style.css` restores the visual order with flex `order`.
- `#panels` moves between `#secondary-inner` and `#below` with the layout, so every anchor goes through `#panels`. That makes the one-column layout work the same.
- Videos (`#related`) and Live chat (`#chat-container`) are only shown or hidden, so the chat iframe never reloads. The description and comments move into boxes that go back on abort.
- Hidden tabs are `display: none`. Comments and related videos load lazily when their tab is first shown.
- Re-inserting the comments box re-renders every loaded comment, so Kempt moves nothing that is already in place.
- Ask (AI) is a flexible item of the action row. The row drops flexible items from the end into the ⋯ menu as it narrows, so `front` moves it first (dropped last), `off` removes it from the row and the menu, and `restore` puts YouTube's data back. Reassigning `data` re-stamps the row.
- Live chat's close button sits inside its same-origin iframe, out of reach of CSS. The iframe reloads with each stream, so the handler re-runs on every `load` (which does not bubble: use capture).

## Timeline

- YouTube matches the Subscriptions grid's children to its data by index whenever the row count changes (sidebar toggle, resize). Any Kempt node between YouTube's items shifts every index, and YouTube then moves every card in the feed (a freeze of about a second). Kempt's toolbar and headers sit after all of YouTube's children and flex `order` draws them in place.
- While filtering, most items are hidden, so YouTube's loading row never leaves the screen and the feed would load to its end. `style.css` hides that row unless more matches are wanted.
- YouTube orders streams by end time but labels them by start time ("Streamed 21 hr ago" between 14 and 15 hr). Grouping therefore only moves back in time: an item that looks newer stays in the current group, and so does one Kempt can't read.
- Seconds to days give the upload day (YouTube rounds down, so "13 days ago" is still one day). Weeks, months and years only give a range, so they group by YouTube's own wording.
- The age regex is built from `Intl`'s words, which match YouTube's long form (`aria-label`) in the ten languages checked: "vor 2 Wochen", "hace 2 semanas", "2 週間前", "2주 전".

## Grid

Home's Shorts shelf draws only `elementsPerRow` of its items (one row, no Show more). YouTube resets that count on every width change and reflects it to the `elements-per-row` attribute, so Kempt sets it again on each change and on shelves the grid adds later.

## Popup

Rows render synchronously with defaults, so Firefox sizes the panel from its full content on the first layout. Input waits for `storage.sync`: the list is inert until it answers.

## Re-renders and flicker

YouTube rebuilds lists like the masthead buttons and the watch action row, dropping foreign nodes. Kempt's `keep` and `stamp` helpers run synchronously in the observer callback (before paint). A `requestAnimationFrame` delay paints the re-rendered element unstamped for one frame.
