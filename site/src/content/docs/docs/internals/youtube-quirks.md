---
title: YouTube quirks
description: Behaviour of YouTube's page that shaped how Kempt's features are built.
---

Short comments in the source point here. Each entry is a constraint YouTube imposes, found by breaking something. Read this before you "fix" something that looks odd, and add an entry when a bug takes a real debugging round.

## Page and scripts

- A content script can't read Polymer's `.data` on YouTube's elements (Firefox Xray wrappers). Stamping, guide data and the comment count run in the page world. See [Page bridge](/kempt-yt/docs/internals/page-bridge/).
- Trusted Types blocks `innerHTML`. Build nodes with `el()` from `src/core/dom.ts`.
- `ytcfg` exists at `document_start`, but `LOGGED_IN` is set later. `signedIn` waits for a value; reading it early makes signed-in features skip without an error.
- `--yt-spec-*` variables are not defined at the page root. Feature CSS uses Kempt's `--kyt-*` tokens.
- Feature-local CSS variables must not reuse a theme token name. A popup rule read `var(--kyt-bg, transparent)`, but `--kyt-bg` is the theme background inherited from `<html>`, so every unmapped menu row drew a black square.
- YouTube's newer lockup classes are camelCase (`ytBadgeShapeThumbnailLive`). A BEM-style `[class*="thumbnail-live"]` matches nothing.
- Firefox 128 has no iterator helpers (they arrived in 131). Use arrays.
- `setTimeout(fn, Infinity)` fires at once. `waitFor` has its own no-timeout path for `timeout: Infinity`.

## Re-renders and flicker

- Signed in, YouTube redraws the masthead `#buttons` (when Notifications arrives) and the watch action row (when Ask arrives, and on the Subscribe animation), and drops nodes it didn't create. Anything Kempt inserts there goes through `keep()` in `src/core/dom.ts`.
- `keep` and `stamp` run synchronously in the observer callback, before paint. A `requestAnimationFrame` delay paints the re-rendered element unstamped for one frame.
- Stamp channel tabs by URL slug, never by title. The mini guide's root exists early, but its entries render later.

## Masthead and search

- YouTube stacks its own hover layers: 10% white on the guide's `#endpoint`, a 1px rim on active rows, 20% white on the notifications button. Clear each on its own element. A broad `#buttons > *:hover` rule also kills Kempt's own Settings hover.
- Old `yt-icon-button` hovers through `yt-interaction`; button-shape components hover differently. Cover both.
- The search box gains a second magnifier on focus (Kempt hides it). The grey mic circle is the `#voice-search-button` wrapper.
- Setting `input.value` doesn't open search suggestions. Only real key events do (`ext.mjs --type`).

## Sidebar

- The selected background goes on `ytd-guide-entry-renderer[active]` itself (YouTube's squircle), not on the inner `tp-yt-paper-item`.
- `ytd-guide-renderer` doesn't exist on watch pages, or when the sidebar starts collapsed (under about 1312px), until the drawer opens. `guide()` then falls back to one guide request per page load.
- Signed-in guide data links only to `/feed/playlists`, so the Playlists dropdown fetches the list on first open. The guide data has no Settings, Help or Send feedback entries.
- Entries behind YouTube's "Show more" (Memberships, for example) have no drawn icon. `ytIcon` waits up to about 5 s for the hidden `yt-icon` to render.
- Masking flattens multicolour brand icons (Premium, Music, Kids). Kempt detects a fill other than `currentColor` and draws those as `<img>`.
- `grid-template-rows: 0fr` to `1fr` on an empty list animates to the wrong height. Fill the list before opening it.

## Icons

- Inlining icons in `content.js` broke: esbuild's `dataurl` loader mangled `"` and `#` (icons drew as squares), and base64 grew the bundle. Icons are copied to `dist/icons` and loaded as `web_accessible_resources` through CSS `mask-image`.
- Masks use alpha only, so rewriting SVG `fill` to `currentColor` does nothing useful, and it fills shapes meant to stay empty.
- Card menu icon types, signed in: Not interested is `HIDE`, Don't recommend channel is `REMOVE`.

## Watch tabs

- YouTube's `updatePanelsLocation` (theater, fullscreen, column changes) expects `#panels`, `#chat-container`, `#playlist` and `#inline-panels` (plus `#shopping-timely-shelf` and `#persistent-panel-container` in `#below`) to be the first children of their parent, in order. Anything inserted inside that run makes it re-insert every panel on each call, which re-renders comments and reloads the chat. Kempt's nodes go after that run (`YT_PANELS`), and `style.css` restores the visual order with flex `order`.
- `#panels` moves between `#secondary-inner` and `#below` with the layout, so every anchor goes through `#panels`. That makes the one-column layout work the same.
- Videos (`#related`) and Live chat (`#chat-container`) are only shown or hidden, so the chat iframe never reloads. The description and comments move into boxes that go back on abort.
- Hidden tabs are `display: none`. Comments and related videos load lazily when their tab is first shown. YouTube's continuation loaders use an `IntersectionObserver` with a null root, so infinite scroll still works inside Kempt's scroll boxes; add `overscroll-behavior: contain`.
- Re-inserting the comments box re-renders every loaded comment, so Kempt moves nothing that is already in place.
- The comment count comes from the comments engagement panel's `contextualInfo` (short form, "2.4M"). It is stale for about a second after an in-page navigation. No panel means comments are off, so the tab shows its icon only.
- The description carries an inline `min-width` (about 381px) that Kempt overrides. On streams, `#teaser-carousel` and `#comment-teaser` are hidden while Watch tabs is on.
- Theater toggles often leave `#primary`'s width unchanged, so a `ResizeObserver` won't fire. Re-align after the `theater` attribute changes, inside `requestAnimationFrame`.
- Theater with live chat: `updateChatLocation` moves `#chat-container` into `#columns` and sets `[fixed-panels]` (chat `position: fixed` under the masthead, `#columns` padded by the sidebar width). Logged-out live chat to test with: `/@LofiGirl/live`.
- Ask (AI) is a flexible item of the action row. The row drops flexible items from the end into the ⋯ menu as it narrows, so `front` moves it first (dropped last), `off` removes it from the row and the menu, and `restore` puts YouTube's data back. Reassigning `data` re-stamps the row. Ask's item has `panelIdentifier: 'PAyouchat'` or the `SPARK` icon.
- HTML lowercases attribute names: observe `kyt-watch-tabs-aias`, not `-aiAs`.
- Live chat's close button sits inside its same-origin iframe, out of reach of CSS. The iframe reloads with each stream, so the handler re-runs on every `load` (which does not bubble: use capture).
- Signed in, YouTube keeps a 6px right margin after the Share and Save icons, so Kempt's `margin: 0` needs `!important`.

## Comment sort

The hidden `#sort-menu` items still work when clicked. Find them by index, because the list re-renders, and sync the chips from `aria-selected`.

## Progress bar

`#movie_player` can hold two `.ytp-progress-bar`: the real one in `.ytp-chrome-bottom`, and a hidden 0x0 spare that comes first in DOM order. A bare `.ytp-progress-bar` selector matches the spare. Scope to `#movie_player .ytp-chrome-bottom .ytp-progress-bar`. The Home hover preview (`#inline-preview-player`) is a second player with no bar.

## Timeline

- YouTube matches the Subscriptions grid's children to its data by index whenever the row count changes (sidebar toggle, resize). Any Kempt node between YouTube's items shifts every index, and YouTube then moves every card in the feed (a freeze of about a second). Kempt's toolbar and headers sit after all of YouTube's children and flex `order` draws them in place.
- Hiding items with CSS never shrinks YouTube's work: infinite scroll keys off the loading row's visibility. While filtering, most items are hidden, so the loading row never leaves the screen and the feed would load to its end. `style.css` hides that row unless more matches are wanted.
- YouTube orders streams by end time but labels them by start time ("Streamed 21 hr ago" between 14 and 15 hr). Grouping therefore only moves back in time: an item that looks newer stays in the current group, and so does one Kempt can't read.
- Seconds to days give the upload day (YouTube rounds down, so "13 days ago" is still one day). Weeks, months and years only give a range, so they group by YouTube's own wording.
- Feed ages are compact in the text ("hace 11 m" is months) and long in the `aria-label`, so Kempt parses the label. The age regex is built from `Intl`'s words, which match YouTube's long form in the ten languages checked: "vor 2 Wochen", "hace 2 semanas", "2 週間前", "2주 전".

## Grid

Home's Shorts shelf draws only `elementsPerRow` of its items (one row, no Show more). YouTube resets that count on every width change and reflects it to the `elements-per-row` attribute, so Kempt sets it again on each change and on shelves the grid adds later.

## Popup

Firefox sizes the toolbar popup on its first layout. Rows render synchronously with defaults, so the panel gets its full height; input waits for `storage.sync`, and the list is inert until it answers. A popup that waited for storage opened near-empty and closed.
