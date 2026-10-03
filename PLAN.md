# Kempt for YouTube: build plan

A browser extension (MV3, Chrome + Firefox 128+) that restyles YouTube into one consistent design system.
Icon source: Juxtopposed "YouTube Redesign (Community)" Figma file.

---

## 1. Principles

1. **CSS before JS.** If a change is visual, it is a stylesheet rule. JS only when we must add elements, move elements, read page data, or change navigation.
2. **Core knows nothing about features.** Features plug into a small runner. Adding one = one new folder + one line in `features/index.ts`.
3. **Every feature is toggleable and fully reversible.** Off means zero CSS applied and zero JS running.
4. **No global observers, no polling.** Route changes come from YouTube's own `yt-navigate-finish` event. DOM waits are scoped to one container and disconnect as soon as they resolve.
5. **All YouTube selectors live in one file.** When YouTube ships a DOM change, we fix one file.

---

## 2. Stack

| Choice                          | Why                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| TypeScript, no UI framework     | Content scripts must stay tiny. Every DOM piece we add is small.                                      |
| `esbuild` (only dev dependency) | Bundles TS and concatenates every feature's CSS into one `content.css`. Builds in ms.                 |
| `node:test`                     | Unit tests for the pure logic (route parsing, date bucketing, shorts URL parsing). No test framework. |
| `chrome.storage.sync`           | Settings sync across the user's browsers.                                                             |

Switch to WXT only if you later want HMR or Safari. Not needed now.

---

## 3. Project layout

```
kempt-yt/
  manifest.json
  build.mjs                 esbuild: content.ts, main-world.ts, popup.ts
  scripts/
    build-icons.mjs         SVG folder -> theme/icons.css (CSS masks)
  src/
    content.ts              entry (isolated world): settings -> html attrs -> router -> runner
    main-world.ts           entry (page world): reads YouTube page data, calls innertube, SPA navigate
    core/
      feature.ts            Feature / Ctx types + runner
      router.ts             Route from URL, fires on yt-navigate-finish
      settings.ts           typed get/set/onChange over chrome.storage.sync + localStorage cache
      dom.ts                waitFor(), h() element helper
      bridge.ts             request/response to main-world.ts
      selectors.ts          EVERY YouTube selector, named
    theme/
      tokens.css            --kyt-* design tokens + overrides of YouTube's --yt-spec-* vars
      icons.css             generated
    icons/*.svg             exported from Figma
    features/
      index.ts              the ONLY list of features
      accent/               index.ts + style.css
      search-bar/
      ...
    popup/
      popup.html
      popup.ts              renders toggles/options from the feature list
  test/*.test.ts
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Kempt for YouTube",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": ["https://www.youtube.com/*"],
  "action": { "default_popup": "popup.html" },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_start"
    },
    {
      "matches": ["https://www.youtube.com/*"],
      "js": ["main-world.js"],
      "run_at": "document_start",
      "world": "MAIN"
    }
  ]
}
```

No background service worker. Nothing needs one.

---

## 4. Core model

### 4.1 Feature contract

```ts
// src/core/feature.ts
export type Route =
  | "home"
  | "watch"
  | "shorts"
  | "subscriptions"
  | "search"
  | "channel"
  | "playlist"
  | "other";

export interface Ctx {
  signal: AbortSignal; // aborted when the feature turns off or leaves its routes
  option<T>(key: string): T; // live option value
  call: typeof call; // talk to main-world.ts
}

export interface Feature {
  id: string; // also the CSS gate: html[kyt-<id>]
  label: string; // shown in popup
  defaultOn: boolean;
  routes?: Route[]; // omit = all pages
  options?: Record<string, Option>; // popup controls: boolean | color | number; `cssVar` ones are written to <html>
  run?(ctx: Ctx): void; // omit for CSS-only features
}
```

Rules for `run()`:

- Pass `{ signal: ctx.signal }` to every `addEventListener`, `waitFor`, observer helper.
- On abort, remove what you added and put back what you moved (`ctx.signal.addEventListener('abort', undo)`).
- Need to react to watch → watch navigation (new video)? Listen to `kyt:navigate` on `document` with the same signal.

### 4.2 Runner (in `feature.ts`, ~40 lines)

On startup, on every settings change, and on every route change:

```
for each feature:
  enabled  = settings.features[id] ?? defaultOn
  html.toggleAttribute(`kyt-${id}`, enabled)          // turns its CSS on/off
  shouldRun = enabled && run && (!routes || routes.includes(route))
  if running && !shouldRun -> controller.abort()
  if !running && shouldRun -> controller = new AbortController(); run(ctx)
```

### 4.3 CSS gating

Every rule in `features/<id>/style.css` is prefixed with `html[kyt-<id>]`:

```css
html[kyt-subscribe-red] ytd-subscribe-button-renderer button:not([subscribed]) { ... }
```

All feature CSS ships in one `content.css` that the manifest injects at `document_start`, before YouTube paints. Toggling a feature flips one attribute. No style injection at runtime, no flash.

To avoid a flash before `chrome.storage` answers (async), `settings.ts` mirrors the enabled set to `localStorage['kyt:flags']` and `content.ts` reads it synchronously at `document_start`. Storage stays the source of truth.

### 4.4 Router

```ts
routeOf(url): Route   // pure, unit tested
// '/watch' -> watch, '/shorts/..' -> shorts, '/feed/subscriptions' -> subscriptions, ...
```

Listens to `yt-navigate-finish` (YouTube fires it on every SPA navigation) and `popstate`. Dispatches `kyt:navigate` with `{ route, url }`.

### 4.5 DOM helpers

```ts
waitFor(sel, { root = document, signal, timeout = 10_000 }): Promise<Element>
```

One `MutationObserver` on `root` only, disconnects on match, abort, or timeout. On timeout it logs `kyt: selector "<name>" not found`, which is your early warning when YouTube changes markup.

Observers that repair YouTube's re-renders (`keep()`, the `stamp` handler) write inside the `MutationObserver` callback itself. It runs before the next paint, while a `requestAnimationFrame` delay can paint the un-repaired DOM for one frame, which shows as flicker. The MutationObserver already batches records, so the repair work stays cheap: one small `querySelectorAll` and an idempotent position check.

### 4.6 Selectors

```ts
// src/core/selectors.ts
export const S = {
  masthead: "ytd-masthead",
  mastheadEnd: "ytd-masthead #end",
  guide: "ytd-guide-renderer #sections",
  watchFlexy: "ytd-watch-flexy",
  secondary: "ytd-watch-flexy #secondary-inner",
  comments: "ytd-watch-flexy ytd-comments#comments",
  liveChat: "ytd-live-chat-frame#chat",
  subscribeBtn: "ytd-subscribe-button-renderer, yt-subscribe-button-view-model",
  // ...
} as const;
```

JS features import names from here. CSS selectors live in each feature's `style.css`, next to the rules that use them. YouTube's 2025 markup uses camelCase classes (`ytSpecButtonShapeNextFilled`, `ytSearchboxComponentInputBox`, `ytChipShapeActive`); prefer those and structural selectors over localized `aria-label`s.

Feature CSS may use `!important`: it has to beat YouTube's own rules, and every rule is gated by `html[kyt-<id>]`.

### 4.7 Bridge to the page world

Content scripts cannot see YouTube's JS objects (`ytcfg`, Polymer `.data` on elements). `main-world.ts` exposes a few handlers. The isolated side calls them:

```ts
call('signedIn')                  -> ytcfg LOGGED_IN
call('stamp', rootSelector)       -> kyt-icon="SHARE" etc. on buttons and guide entries, kept across re-renders
call('stampTabs', rootSelector)   -> kyt-tab="shorts" etc. on channel tabs (slug from the tab's URL)
call('inWatchLater', videoId)     -> playlist/get_add_to_playlist
call('setWatchLater', id, add)    -> browse/edit_playlist (playlistId "WL")
call('navigate', '/watch?v=..')   -> SPA navigation via YouTube's yt-navigate event, no reload
call('guideData')                 -> (phase 4) sidebar data
```

Transport: `CustomEvent` on `document` with a JSON string in `detail` plus a request id. Strings, because Firefox drops object `detail` across worlds.

Stamping exists because YouTube's `aria-label`s are localized. The icon type in the element's data (`SHARE`, `PLAYLIST_ADD`, `VIDEO_CALL`) is the same in every language. It runs only on small, known containers (masthead, guide, watch action row).

### 4.8 Design tokens

```css
/* theme/tokens.css */
html {
  --kyt-accent: #e5213a; /* "selected" color everywhere, user-configurable */
  --kyt-selected-bg: #322629; /* selected sidebar item + feed chip background (dark) */
  --kyt-subscribe-bg: #cb274a;
  --kyt-subscribe-fg: #fff;
  --kyt-radius: 10px;
  --kyt-outline: 1px solid var(--yt-spec-10-percent-layer);
}
html[kyt-accent] {
  --yt-spec-static-brand-red: var(--kyt-accent);
  --yt-spec-call-to-action: var(--kyt-accent);
  /* + progress bar, chips, tabs: see accent/style.css */
}
```

Light theme (`html:not([dark])`) uses a light pink-red selected background: `--kyt-selected-bg: #fbe3e8`.

When the user picks a custom accent, `--kyt-selected-bg` becomes `color-mix(in srgb, var(--kyt-accent) 18%, var(--yt-spec-base-background))` (12% on light) so it follows the accent. With the default accent it stays `#322629` / `#fbe3e8`.

Selected item text and icon use `--kyt-accent`.

### 4.9 Popup

`popup.ts` imports `features/index.ts` and renders one toggle per feature plus its `options`. A new feature appears in the popup with no popup changes.

---

## 5. Features

Legend: **CSS** = stylesheet only. **JS** = needs `run()`. **MW** = needs the main-world bridge.

| id                | Your request                                                               | How                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Kind                    | Risk                                                                                      |
| ----------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `accent`          | All selected accents red, custom accent color                              | Token overrides of `--yt-spec-*` vars + targeted rules for chips, tabs, progress bar. Color option in popup.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | CSS                     | Low                                                                                       |
| `selected-bg`     | Selected background `#322629` (dark) / light pink-red (light)              | Sidebar entries (`[active]`) and the selected feed filter chip. Text and icon in accent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | CSS                     | Low                                                                                       |
| `subscribe-red`   | Subscribe `#CB274A`, white text                                            | Style unsubscribed state only. Subscribed state stays neutral.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | CSS                     | Low                                                                                       |
| `search-bar`      | Magnifier left, mic inside, outline only                                   | Flex `order:-1` on search button, remove grey segment, mic absolutely positioned inside the box, single outline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | CSS                     | Medium (YouTube switched to `yt-searchbox` in 2025; cover both)                           |
| `create-icon`     | Create button icon only                                                    | Hide label text, square button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | CSS + MW stamp          | Low                                                                                       |
| `action-icons`    | Share/Save icon only                                                       | Hide label text on buttons stamped `SHARE` / `PLAYLIST_ADD`. Force Save out of the overflow menu when space allows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | CSS + MW stamp          | Medium                                                                                    |
| `watch-later-btn` | Watch later button beside ⋯                                                | Insert button into the action row. Click → `bridge.addToWatchLater(id)`, toast on success. v2: show filled state via `get_add_to_playlist`.                                                                                                                                                                                                                                                                                                                                                                                                                                                         | JS + MW                 | Medium (innertube auth: SAPISIDHASH from cookie)                                          |
| `settings-topbar` | Settings button beside avatar                                              | Insert `<a href="/account">` icon before the avatar in `#end`. Hide guide's Settings entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | JS + CSS                | Low                                                                                       |
| `sidebar`         | Explore under Home as dropdown; Subscriptions dropdown; Playlists dropdown | Render one `kyt-guide` block from `bridge.guideData()`: Home, Explore ▾ (Music, Movies & TV, Gaming, News, Sports, ...), Subscriptions ▾ (all channels), Playlists ▾ (all playlists). Arrow toggles open state, saved in settings. Native duplicate sections hidden by CSS. Active item from current URL.                                                                                                                                                                                                                                                                                           | JS + MW                 | Medium (guide re-renders on login/locale; re-render on `yt-guide-*` updates)              |
| `watch-tabs`      | Info / Comments / Ask AI / Live chat / Videos as tabs on the right         | Tab bar at top of `#secondary-inner`. Move (not clone) description, `ytd-comments`, AI panel, `#chat`, related into panels. Tab = icon + label: Info, Videos, Live chat, Ask AI show their name; Comments shows only its icon + total count. Selected tab: white background, dark text, and its icon swaps to the checklist icon (same slot, so width doesn't jump). Hidden tabs keep layout (`content-visibility: hidden`) so YouTube's lazy loaders still fire when shown. Ask AI tab only when option is on AND the panel exists. Live chat tab only on streams. On abort, move everything back. | JS                      | High (most DOM-coupled; reference: "Tabview YouTube" userscript by CY Fung on Greasyfork) |
| `shorts`          | Hide Shorts; Shorts links open as normal video                             | CSS hides shelves (`ytd-reel-shelf-renderer`, `ytd-rich-shelf-renderer[is-shorts]`, `grid-shelf-view-model`), guide entry, chips, search results. JS: capture-phase click on `a[href^="/shorts/"]` → `bridge.navigate('/watch?v=ID')`; `yt-navigate-start` to a shorts URL → same; direct load of `/shorts/ID` → `location.replace` at `document_start`.                                                                                                                                                                                                                                            | CSS + JS + MW           | Low (reference: "YouTube Shorts Redirect" userscripts on Greasyfork)                      |
| `subs-timeline`   | Subscriptions page as dated timeline                                       | Route `subscriptions` only. Hide native items, keep the native continuation spinner visible below our list so infinite scroll still loads. Scoped observer on the grid `#contents` reads each new item (title, thumb, channel, duration, relative date), buckets by day, renders: red dot + date, vertical line on the left, that day's videos beside it.                                                                                                                                                                                                                                           | JS (+ MW for item data) | Medium (see 7)                                                                            |
| `icons`           | Consistent icon set                                                        | `scripts/build-icons.mjs` turns `src/icons/*.svg` into CSS `mask-image` rules. Target `yt-icon` by stamped `data-kyt-icon`, or by `href` for guide links. Hide YouTube's inner svg, paint ours with `background: currentColor`. Pure CSS after stamping, survives re-renders.                                                                                                                                                                                                                                                                                                                       | CSS + MW stamp          | Medium (mapping table is the work)                                                        |

### Extensibility check: custom progress bar later

```
src/features/progress-bar/index.ts
src/features/progress-bar/style.css   (html[kyt-progress-bar] .ytp-progress-bar ...)
src/features/index.ts                 + import progressBar
```

```ts
export const progressBar: Feature = {
  id: "progress-bar",
  label: "Custom progress bar",
  defaultOn: false,
  routes: ["watch"],
  options: { height: { type: "number", default: 4 } },
};
```

No core file changes. It appears in the popup, it gets `--kyt-accent` for free, and it shuts off cleanly.

---

## 6. Performance budget

| Metric                       | Target                                | How we hold it                                                         |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `content.js` + `content.css` | < 60 KB total                         | No framework, icons as one generated CSS file                          |
| JS per navigation            | < 5 ms scripting                      | Route gating; CSS does most work                                       |
| Long tasks added             | 0                                     | small observer roots, idempotent writes, no sync layout reads in loops |
| Observers alive              | Only scoped ones for running features | `waitFor` disconnects; signals abort the rest                          |
| Timers / polling             | None                                  | YouTube events only                                                    |

Check with Chrome DevTools Performance panel on Home, Watch, Subscriptions, with the extension on vs off.

---

## 7. Known risks

1. **YouTube A/B tests and DOM churn.** Two markup generations live side by side (Polymer `ytd-*` and newer `yt-*-view-model`). `selectors.ts` lists both. `waitFor` timeouts log which name broke.
2. **Subscription timeline dates are relative.** YouTube shows "3 days ago", "1 week ago". Day buckets are exact for under a week. Older items group as "1 week ago", "2 weeks ago". Exact dates would need one request per video, which breaks the budget. Parse English first; other locales fall back to grouping by the raw string.
3. **Watch Later API** uses innertube with a SAPISIDHASH header. Many userscripts do this; it can break if YouTube changes auth. Fallback: open the native Save menu and click Watch later.
4. **Ask AI panel** is an experiment not every account has. Its engagement-panel `target-id` must be confirmed on an account that has it.
5. **Icon license.** Confirm the Figma community file's license allows redistribution in an extension.

---

## 8. Phases

Each phase ends shippable.

| #    | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Done when                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 0    | Scaffold: manifest, build, core (feature runner, router, settings, dom, bridge, selectors), tokens, popup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Empty feature list loads on YouTube with no errors; popup renders                                                |
| 1 ✅ | CSS wins: `accent` (+ custom color), `selected-bg`, `subscribe-red`, `search-bar`, `create-icon` (pulled forward: no stamping needed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Toggling each in popup applies/removes instantly                                                                 |
| 2 ✅ | Stamping + `action-icons`, `settings-topbar`, `watch-later-btn`. Verified signed in, in two UI languages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Works in English and one other UI language                                                                       |
| 3 ✅ | `shorts` (History keeps its Shorts). Known gap: the search "Shorts" filter chip stays (no language-independent marker)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | No Shorts visible anywhere; every Shorts entry point opens `/watch`                                              |
| 4 🧪 | `sidebar`: own renderer from `ytd-guide-renderer.data` in Figma's layout (Sidebar 92:4870, dropdown rows `subs` 23:8475 / `playlist` 101:6372) at YouTube's own sizes (40px rows, 14px labels, 24px icons). Explore under Home; Explore, Playlists, Subscriptions dropdowns; "More from YouTube" entries as plain text links above YouTube's footer. Popup options hide You, Your channel, Your videos, Courses (all on by default; boolean options gate CSS via `html[kyt-<id>-<key>]`). Icons the Figma set lacks are drawn by a hidden `yt-icon` (`ytIcon`); brand logos keep their colours. Built; Subscriptions/Playlists dropdowns await signed-in test | Dropdowns work, hidden entries toggle live from the popup, active item highlights, SPA navigation                |
| 5    | `watch-tabs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | All tabs work on normal video, stream, premiere; theater and narrow layouts; toggling off restores native layout |
| 6    | `subs-timeline`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Infinite scroll keeps appending to the right day                                                                 |
| 7    | `icons` (can start any time once SVGs are exported)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | No original YouTube icon left in masthead, guide, watch action row                                               |

Tests: `node --test` for `routeOf`, `bucketByDay`, `shortsIdFromUrl`. Everything else is a manual checklist per phase.

Dev checks (logged-out YouTube in local Firefox, all features on, no extension install):

- `node scripts/shot.mjs <url> <out.png> [selector] [--light] [--off]` screenshots the page or one element.
- `node scripts/probe.mjs <url> <file.js> [--hover=sel] [--shot=out.png:sel]` runs a snippet in the page and prints its return value (computed styles, rects). Hover and shot happen after the snippet, so it can emulate main-world stamping or inject signed-in-only elements first.
- `scripts/dump-dom.js` pasted in your signed-in console downloads a trimmed DOM sample for signed-in-only UI.

---

## 9. Getting the icons out of Figma

Done: `node scripts/fetch-icons.mjs` (alias `npm run icons`) exports the `Icons` component set (9:8208, 133 variants) to `src/icons/`. Names are `<name>[-<quality>][-<direction>][-selected][-disabled].svg`, e.g. `home.svg`, `home-selected.svg`, `arrow-down.svg`. All 24x24, white fill, used as CSS masks so color comes from `currentColor`. Re-run after the Figma file changes.

Watch-tab icons: `info`, `comments`, `chat` (live chat), `list` (related videos), `check` (selected-tab checkmark). Not in the set yet: Ask AI, Movies & TV, Podcasts, Shopping, Courses. Fallback: keep YouTube's icon for those until the Figma file adds them.

Figma API access works: token in `.env` as `FIGMA_TOKEN` (gitignored). File key `67JrsVl1sPE1qzZZL0iuNG`; page `Design` (0:1) has frames Home 4:11081, Video 29:9551, Subs 96:3679, Search 117:7228, Shorts 156:7879, Components section 273:10907. Figma specs used so far: search pill 40px tall, 1px `#2a2a2a` outline, icons 15px from each end; icons 24px; sidebar row 45px, radius 10, Roboto 17/500, icon–label gap 20.

Option B (scripted): `GET https://api.figma.com/v1/images/:fileKey?ids=<nodeIds>&format=svg` with a personal access token, then download each URL. Worth it only if the set will change often.

---

## 10. Decisions

1. `#322629` is the dark-mode selected background, used on the sidebar and the selected feed chip. Red (`--kyt-accent`) colors selected text/icons and indicators.
2. Light mode supported; selected background is light pink-red `#fbe3e8`.
3. Watch tabs: the selected tab's icon becomes the checklist icon. Comments tab = icon + total count, no label.
4. "Videos" tab = related videos.
5. Chrome + Firefox 128+. No Safari.
6. Default accent is `#cb274a`, the Subscribe red, so the palette has one red. Subscribe follows the accent if the user changes it.
7. Selected/hover background comes from Figma: `#ffaabb` @ 14% over `#111` = `#322629`. We use a translucent tint `--kyt-tint = color-mix(accent 40%, #fff)` (≈ `#eaa9b7`) at 14% dark / 30% light, so it works on any background and follows a custom accent. Hover uses the same tint as selected. Chips use a stronger 30%/55% tint because unselected chips are already grey.
8. Every masthead icon button (old `yt-icon-button` and new button shapes) gets the same tinted hover circle.
9. Selected sidebar/chip text stays primary color; only the icon turns accent. Accent text on the dark tint is under 3:1 contrast.
10. Sidebar order: Home, Shorts, Explore | History, Liked, Downloads, Watch later, Playlists | Subscriptions (nav.ts `LIBRARY`). The collapsed sidebar is our own render of the same groups as icons; Explore there opens the full sidebar with Explore expanded. The foot dropdown opens above a static divider (bottom-aligned wipe).

---

## 11. Sidebar & search polish

Done (phase 4): all four below, plus a `video-library` icon (Google Material, `src/icons/video-library.svg`) left of each playlist in the Playlists dropdown. Implementation notes:

- Foot: `.kyt-foot` in `sidebar/index.ts` replaces YouTube's `#footer` (hidden); footer links are rebuilt from its anchors. `ytd-guide-renderer` gets `min-height: 100%` and the foot `margin-top: auto`.
- Animations: `.kyt-nav-children` (grid wrapper) > `.kyt-nav-list`, shared by dropdowns and the foot. Lists fill before opening so the height animates to the real size. Arrow rotates instead of swapping icons.
- Suggestions: CSS only in `search-bar/style.css`, `--kyt-glass` token. Headless Firefox draws no `backdrop-filter`, so the blur is checked by hand.
- Mini guide: `miniGuideIcons()` generates one `<style>` with per-install icon URLs; entries are stamped via `stamp(S.miniGuide)`.

Original requests:

1. **Footer trademark toggle for More from YouTube:**
   - Anchor at the very bottom of the sidebar.
   - Google LLC trademark text centered relative to the sidebar.
   - Trademark acts as a clickable trigger: clicking expands the divider above to reveal the More from YouTube entries, and turns the trademark text accent red.
   - YouTube Music and YouTube Kids styled on dedicated rows for legibility.
   - Clicking again collapses the section back into the divider.
2. **Performant dropdown animations:**
   - Add hardware-accelerated, lightweight animations across all dropdown interactions (Explore, Subscriptions, Playlists, and footer).
   - Use CSS `grid-template-rows: 0fr -> 1fr` or `max-height` transitions to avoid CPU layout thrashing and keep power draw negligible.
3. **Search suggestions alignment and surface styling:**
   - Align the search autocomplete results box precisely with the bounds of the redesigned pill searchbar.
   - Set suggestion container background to match the primary surface with semi-transparency (consistent with the scrolling masthead).
   - Keep styling strictly CSS-based for battery and rendering efficiency.
4. **Collapsed sidebar (mini-guide) consistency:**
   - When the sidebar is collapsed into the mini-guide, display only icons (remove text labels below).
   - Harmonize icons with the expanded sidebar state so disabled entries (such as "You") do not appear in the mini-guide.
