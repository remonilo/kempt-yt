# Kempt for YouTube: build plan

A browser extension (MV3, Chrome + Firefox 128+) that restyles YouTube into one consistent design system.
Icon source: Juxtopposed "YouTube Redesign (Community)" Figma file.

## Next up

Keep this list current. It is the first thing a new session reads.

Open in phase 5 (`watch-tabs`, `comment-sort`):

- [ ] Spamming T froze the page and blacked out the player. Cause: our tab bar and boxes sat inside YouTube's panel run, so every theater toggle made `updatePanelsLocation` re-insert all panels and `keep()` move ours back, re-rendering comments (§13.35). Our nodes now go after the run, flex `order` keeps the look. Headless, 20 toggles with 20 comment threads loaded: 34.6k -> 9.1k mutations, worst frame 192 -> 92ms. User-verified on a video with comments disabled.
- [ ] Theater with live chat open: YouTube moves `#chat-container` into `#columns` and pins it `position: fixed` under its own masthead height (`[fixed-panels]`), which broke under our topbar (overlap, half off-screen). Now done like TabView: theater shows the player alone (chat hidden, `#columns` padding and `#panels-full-bleed-container` removed), the Live chat tab leaves theater. Verified headless on `/@LofiGirl/live` (live chat loads there logged out): awaits signed-in check.
- [ ] Ask AI setting (user request): `watch-tabs` options `ai` (parent toggle) and `aiAs` (`button` | `tab`, shown only while `ai` is on). Off: main-world `askAi('off')` drops Ask from the action row's menu data, so it is in neither the row nor ⋯. On: `askAi('front')` moves it first among the flexible items; YouTube's row moves flexible items into ⋯ from the end as it narrows (`shrinkFlexibleMenu`), so Ask stays out. Button mode is a 40px icon circle. New option machinery: `choice` type (popup `<select>`, `html[kyt-<id>-<key>="value"]`) and `parent`. Verified headless with a fake SPARK item (tab, off, button). Old `askAi` setting is dropped. Awaits signed-in check.
- [x] Page scrollbar hidden in two columns with a tab open (`html[kyt-watch-tabs-open]`); the tab keeps its own. Single column and theater keep the page scrollbar.
- [x] Theater animation itself: YouTube's own, not ours to fix (user, after commit).

User-verified signed in: Ask AI tab and cinema from it, toggle-off restores native layout, single column, Download icon-only.

Phase 7 `icons` (`src/features/icons/`, §10.19):

- [x] Masthead: ☰, back (narrow search), search (pill and narrow), clear X, mic, Create (`add`), Sign in (`you`), Notifications bell (`notifs`), signed-out ⋮. Verified headless at 1400 and 600px, except Create and the bell (signed-in only).
- [x] Watch action row: like/dislike (filled `-selected` when pressed, 300ms scale pop in place of YouTube's Lottie), Share, Save (`save` bookmark), Download, Clip, ⋯ (`more` rotated 90°). Verified headless, pressed state faked via `aria-pressed`.
- [ ] Signed-in check: Create and bell icons in the masthead, like/dislike after a real click (pop plays, filled icon), Clip if it shows in the row.
- [ ] Not covered, Figma lacks the icon: Ask (`SPARK`), Thanks, the subscribe notification bell (`notifs`/`notifs-selected`/`notifs-disabled` exist, but its state needs a stamp from the toggle's data). Player controls have Figma icons too (play, pause, next, volume, cc, settings, theater, fullscreen, pip): outside phase 7's scope, ask the user.

- [x] Return YouTube Dislike: the signed-in dislike icon went missing only in Zen (older Gecko). Fine in Firefox with RYD 4.0.6; not ours. `scripts/ext.mjs --with=<dir|xpi>` loads another extension beside ours for such checks.

Structure pass before 1.0 (§10.20), done: page-world handlers split per feature (`features/<id>/page.ts`, shared ones in `src/page/`), `ctx.call` typed from the handler map, runner takes `call` as a parameter, `test/structure.test.ts` guards registration, CSS gating and handler names. Runtime re-checked headless (guide, stamp, signedIn).

Open in phase 4 (`sidebar`):

- [x] Fresh `/watch` tab or under 1312px, then ☰: Subscriptions and Playlists filled. User-verified.
- [ ] After phase 7 icons: sidebar dropdowns (Subscriptions, Playlists) get a hierarchy design, their child rows look out of place now (user request). Needs a Figma frame or a proposal.

User-verified signed in: Subscriptions and Playlists dropdowns, suggestions blur, footer divider. Help and Send feedback are absent from signed-in guide data, so they never render.

Before release:

- [ ] Localize tab labels (Info, Videos, Live chat, Ask AI), hardcoded English in `src/features/watch-tabs/index.ts` (`TABS`).
- [ ] Timeline: `parseAge` reads English ages only; other locales get no Subscriptions headers (History is localized via Intl).

Phase 6 `timeline` (in progress, decisions in §10.12 to 10.18). Samples: `samples/kyt-subscriptions.json`, `kyt-history.json`, `kyt-subs-order.json` (scripts `feed-dump.js`, `feed-order.js`).

- [x] Date logic, pure and tested: `src/features/timeline/dates.ts` (`parseAge` long and short units, `groupOf`, `plan`, `historyDate`), `test/timeline.test.ts`.
- [x] `src/features/timeline/{index.ts,style.css}`. Keeps YouTube's cards. Subs: inserts `.kyt-tl-head` rows into the rich grid `#contents` (one childList observer), hides Latest and Most relevant shelves, Shorts shelf to the top. History: our header before each day's `ytd-item-section-header-renderer` (hidden), day `#contents` as a CSS grid, horizontal lockups restyled as vertical cards. Subs CSS checked headless on a channel Videos grid (page-subtype swapped); history CSS unverified.
- [x] Signed-in check, Subscriptions: user-verified aligned.
- [x] Dot fill follows scroll (§10.18). User-verified on both pages.
- [x] Fixed after first check (dot ring cut into YouTube's chips; 2 columns -> min card 240px for 3). User-verified History: full dates on day headers, grid cards look right (thumbnail, title, channel, menu), Shorts row inside each day, scroll loads more days, history search still works.
- [ ] Cheap filters: type chips (All, Videos, Live, Shorts) and search, over loaded items only. History already has YouTube's own chips (All, Videos, Shorts, Podcasts, Music) under a "Watch history" title: keep those, so our chips are Subscriptions only.

- [x] Popup opened only on the ~3rd click in Firefox: rows now render before `storage.sync` resolves (§13.34). User-verified.

Later phases: "View as: Channels" on Subscriptions; Return YouTube Dislike compatibility (github.com/Anarios/return-youtube-dislike).

Known gaps: the search "Shorts" filter chip stays (phase 3). Icons missing from the Figma set (§9).

---

## 1. Principles

1. **CSS before JS.** If a change is visual, it is a stylesheet rule. JS only when we must add elements, move elements, read page data, or change navigation.
2. **Core knows nothing about features.** Features plug into a small runner. Adding one = one new folder + one line in `features/index.ts` (and one in `features/page.ts` if it has page-world handlers).
3. **Every feature is toggleable and fully reversible.** Off means zero CSS applied and zero JS running.
4. **No global observers, no polling.** Route changes come from YouTube's own `yt-navigate-finish` event. DOM waits are scoped to one container and disconnect as soon as they resolve.
5. **YouTube selectors have one home each.** JS selectors live in `core/selectors.ts`; CSS selectors live in the feature's `style.css` next to their rules. When YouTube ships a DOM change, `grep` finds every use.

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
    main-world.ts           entry (page world): answers bridge calls with features/page.ts
    core/                   isolated world
      feature.ts            Feature / Ctx types + runner
      router.ts             Route from URL, fires on yt-navigate-finish
      settings.ts           typed get/set/onChange over chrome.storage.sync + localStorage cache
      dom.ts                waitFor(), keep(), h() element helper
      bridge.ts             call(): typed request/response to main-world.ts
      selectors.ts          YouTube selectors used from JS, named
      icon.ts               <span> masked by a Figma icon
    page/                   page world, shared
      youtube.ts            ytcfg, innertube(), walk/find/text over YouTube data, endpoints map
      core.ts               handlers several features use: signedIn, stamp, stampTabs, navigate, ping
    theme/
      tokens.css            --kyt-* design tokens + overrides of YouTube's --yt-spec-* vars
    icons/*.svg             exported from Figma (npm run icons)
    features/
      index.ts              the ONLY list of features (popup order)
      page.ts               the ONLY list of page-world handlers (core + each feature's page.ts)
      <id>/index.ts         the Feature
      <id>/style.css        its CSS, every rule gated by html[kyt-<id>]
      <id>/page.ts          optional: its page-world handlers
      <id>/*.ts             optional: pure logic, unit tested (sidebar/nav.ts, timeline/dates.ts)
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
  call: typeof call; // typed call to a page-world handler (features/page.ts)
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

Content scripts cannot see YouTube's JS objects (`ytcfg`, Polymer `.data` on elements). `main-world.ts` runs in the page and answers `ctx.call(name, ...args)` with a handler from `features/page.ts`:

- `src/page/core.ts` has the shared ones: `signedIn`, `stamp(sel)` (kyt-icon="SHARE" etc., kept across re-renders), `stampTabs(sel)` (kyt-tab="shorts" on channel tabs), `navigate(url)` (SPA navigation via YouTube's `yt-navigate`).
- A feature that needs the page world adds `features/<id>/page.ts` exporting an object of handlers, and spreads it into `features/page.ts`. Examples: `sidebar/page.ts` (`guide`, `ytIcon`, `playlists`), `watch-later-btn/page.ts` (`inWatchLater`, `setWatchLater`), `watch-tabs/page.ts` (`relayout`, `askAi`).
- `src/page/youtube.ts` holds the helpers they share: `cfg()`, `innertube(endpoint, body)` with SAPISIDHASH auth, `walk`/`find`/`text` over YouTube's data, and the `endpoints` map `navigate` follows.

`call` is typed from the handler map: a wrong name, wrong arguments or wrong result type fails `npm run check`. Handler names must be unique; `test/structure.test.ts` checks that and that every `page.ts` is registered.

Transport: `CustomEvent` on `document` with a JSON string in `detail` plus a request id. Strings, because Firefox drops object `detail` across worlds. So arguments and results are plain data, never elements: pass a selector, get back a boolean or JSON. Event names carry the build id (lesson 27).

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
| `icons`           | Consistent icon set | `index.ts` writes `--kyt-i-<name>: url(<extension URL>)` on `<html>` (CSS can't build the per-install URL). `style.css` turns each YouTube icon box into `background: currentColor` masked by `var(--kyt-i)` and hides its children. Masthead and like/dislike by structure, Share/Save/Download/Clip by stamped `kyt-icon`. Sidebar draws its own. | CSS + MW stamp | Medium |

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
| 4 ✅ | `sidebar`: own renderer with Explore, Playlists, Subscriptions dropdowns, footer toggle, mini guide. Notes in §11. Subscriptions/Playlists dropdowns await signed-in test | Dropdowns work, hidden entries toggle live from the popup, active item highlights, SPA navigation                |
| 5 🧪 | `watch-tabs`, `comment-sort`, Download icon-only. Notes in §12. Open items in Next up | All tabs work on normal video, stream, premiere; theater and narrow layouts; toggling off restores native layout |
| 6    | `timeline` (Subscriptions + History, §10.12)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Infinite scroll keeps appending to the right day                                                                 |
| 7 🧪 | `icons`: masthead + watch action row (sidebar and mini guide already draw Figma icons). Open items in Next up                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | No original YouTube icon left in masthead, guide, watch action row                                               |

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
11. Watch tabs: Videos is the default tab on load. Title, channel row and actions stay under the player; only the description moves into Info. Tab visuals wait for the user's Figma design (same file); the selected-tab icon is decided there.
12. Phase 6 is one feature, `timeline`, on Subscriptions and History (Figma Subs 96:3679, History 100:9034). It replaces `subs-timeline`.
13. Timeline toolbar: type chips (All, Videos, Live, Shorts) and a search box, both filtering loaded items only. No Newest/Oldest or Date range: the feed loads newest-first, so those would need the whole feed (perf budget). Posts chip only if posts show up in the feed.
14. Subscriptions dates: exact day under one week ("Today - 15 Dec 2024", "Yesterday - 14 Dec 2024"), then YouTube's own relative groups ("1 week ago", "2 weeks ago", "1 month ago"). No per-video date requests.
15. History uses the same card grid and timeline as Subscriptions, on YouTube's own day groups (exact dates).
16. Dropped: Figma's Collections tab (PocketTube covers it). Planned later: "View as: Channels", Return YouTube Dislike compatibility.
17. Subscriptions shelves: "Most relevant" is hidden (its items are duplicates of feed items, checked in `kyt-subs-order.json`); "Latest" header hidden (its items are the feed's first row). Shorts shelf stays, moved to the top (only shown when `shorts` is off). History keeps its Shorts row inside each day. "N days ago" groups by day up to 13 days (YouTube rounds down); weeks and older are relative groups. Groups only move back in time: a stream labelled by start time, or "Scheduled for ...", stays in the current group. Other UI languages: no subs headers (English parse only, before release).
18. Timeline dot fill marks the group you're reading (lowest header above mid-screen, one IntersectionObserver), not "today". 200ms fade, off under reduced motion.
19. Icons: Figma's set replaces YouTube's by masking YouTube's own icon box (its svg stays, hidden), so buttons keep their behavior and toggling off restores them. Save maps to the bookmark (`save`), the action row ⋯ is `more` rotated 90°, like/dislike use the `-selected` fill when pressed. Icons Figma lacks keep YouTube's.
20. Page world is split like the isolated world: `main-world.ts` is a 20-line dispatcher, handlers live in `src/page/core.ts` (shared) and `features/<id>/page.ts`, listed once in `features/page.ts`. `call` is typed from that map, so renames and argument changes fail `tsc`. Chosen over one growing `main-world.ts` (it had reached ~300 lines mixing six features) so a feature's page code sits in its folder and can be deleted with it. Conventions are enforced by `test/structure.test.ts`, not by review.

---

## 11. Sidebar & search polish

Done (phase 4): all four below, plus a `video-library` icon (Google Material, `src/icons/video-library.svg`) left of each playlist in the Playlists dropdown. Implementation notes:

- Foot: `.kyt-foot` in `sidebar/index.ts` replaces YouTube's `#footer` (hidden); footer links are rebuilt from its anchors. `ytd-guide-renderer` gets `min-height: 100%` and the foot `margin-top: auto`.
- Animations: `.kyt-nav-children` (grid wrapper) > `.kyt-nav-list`, shared by dropdowns and the foot. Lists fill before opening so the height animates to the real size. Arrow rotates instead of swapping icons.
- Suggestions: CSS only in `search-bar/style.css`, `--kyt-glass` token. Headless Firefox draws no `backdrop-filter`, so the blur is checked by hand.
- Mini guide: `miniGuideIcons()` generates one `<style>` with per-install icon URLs; entries are stamped via `stamp(S.miniGuide)`.

Sidebar build notes (moved from §8):

- Own renderer from `ytd-guide-renderer.data` in Figma's layout (Sidebar 92:4870, dropdown rows `subs` 23:8475 / `playlist` 101:6372) at YouTube's own sizes (40px rows, 14px labels, 24px icons).
- Popup options hide You, Your channel, Your videos, Courses (all on by default; boolean options gate CSS via `html[kyt-<id>-<key>]`).
- Icons the Figma set lacks are drawn by a hidden `yt-icon` (`ytIcon`); brand logos keep their colours.

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

---

## 12. Watch tabs notes

Build notes for phase 5 (moved from §8):

- Tab bar above the right column: Info, Comments (icon + count), Videos, Live chat on streams, Ask AI behind a popup option. White pill slides to the selected tab.
- Videos and chat are shown/hidden in place, so the chat iframe never reloads. Description and comments move into boxes after `#panels` and go back on abort.
- `/@name/live` routes as watch.
- In two columns the right column is one viewport tall and only the open tab scrolls, so the video stays in view. Single column scrolls the whole page.
- Cinema (theater) mode closes the open tab and remembers it; leaving cinema reopens it. Clicking a tab in cinema leaves cinema. Only a user click on a tab may click YouTube's cinema button (resets on navigation or Ask AI closing must not, or the player gets stuck half-switched). In cinema the bar aligns with the action buttons and is re-measured on theater toggle, title wrap and resize.
- Close (X) hidden on chat and Ask panels. The chat X lives inside the chat iframe, so a hiding rule is injected into the frame on each load.
- `comment-sort`: Top/Newest chips beside the comment count click YouTube's hidden sort menu items, so labels follow the UI language.

---

## 13. Lessons (mined from the phase 0 to 5 session)

Things that already cost a debugging round. Check here before "fixing" something odd.

YouTube DOM:

1. `--yt-spec-*` vars are not defined at the page root. Feature CSS uses our `--kyt-*` tokens.
2. Selected sidebar background goes on `ytd-guide-entry-renderer[active]` itself (YouTube's squircle), never the inner `tp-yt-paper-item`.
3. YouTube stacks its own hover layers: 10% white on guide `#endpoint`, 1px rim on active rows, 20% white on `ytd-notification-topbar-button-renderer`. Clear each on its own element. Never clear masthead hovers with a broad `#buttons > *:hover` rule (it kills our `.kyt-settings` hover). Old `yt-icon-button` hovers via `yt-interaction`; button-shape components differ; cover both.
4. Search box: YouTube adds a second magnifier on focus (hide it); the grey mic circle is the `#voice-search-button` wrapper. Setting `input.value` does not open suggestions; use real key events (`ext.mjs --type=`).
5. Signed in, YouTube keeps a 6px right margin after Share/Save icons; our `margin: 0` needs `!important`.
6. Signed in, YouTube redraws masthead `#buttons` (when Notifications arrives) and the action row (when Ask/`SPARK` arrives, and on the Subscribe animation) and drops nodes it didn't create. Anything inserted there goes through `keep()` in `src/core/dom.ts`.
7. Isolated scripts can't read Polymer `.data` (Xray). Stamping, guide data and comment count run in `src/main-world.ts`.
8. Trusted Types blocks `innerHTML`. Build nodes with `h()`.
9. `ytcfg` exists at `document_start` but `LOGGED_IN` is set later. `signedIn` must wait for a value, or features skip silently.
10. `ytd-guide-renderer` doesn't exist on watch pages or when the sidebar starts collapsed (< ~1312px) until the drawer opens. `guide()` falls back to one innertube guide request per page load.
11. Signed-in guide data links only to `/feed/playlists`; the Playlists dropdown fetches playlists on first open. Guide data lacks Settings, Help, Send feedback.
12. Entries behind YouTube's "Show more" (e.g. Memberships) have no drawn icon. `ytIcon` waits (~50 × 100ms) for the hidden `yt-icon` to render.
13. Masking flattens multicolour brand icons (Premium, Music, Kids). Detect a non-`currentColor` fill and render as `<img>`.
14. Comment count comes from the comments engagement panel's `contextualInfo` (short form, "2.4M"). It is stale for ~1s after SPA navigation. No panel = comments disabled = icon only.
15. Description has an inline min-width (~381px); override it. On streams hide `#teaser-carousel` and `#comment-teaser` when watch-tabs is on.
16. Theater toggles often don't change `#primary` width, so `ResizeObserver` won't fire. Re-align after the `theater` attribute changes, inside `requestAnimationFrame`.
17. Hidden `#sort-menu` items still work when clicked. Find items by index (the list re-renders); sync chips from `aria-selected`.
18. YouTube's continuation loaders use `IntersectionObserver` with a null root, so infinite scroll works inside our scroll containers. Add `overscroll-behavior: contain`.
19. Stamp channel tabs by URL slug, never title. Mini guide root exists early; its entries render lazily.

Tried and dropped:

20. Signed-in check via `SAPISID` cookie: replaced by `ytcfg LOGGED_IN`. The real bug was timing plus redraws.
21. rAF-deferred stamping/`keep()`: flashed full labels for one frame (see §4.5).
22. esbuild `dataurl` loader for SVG: broke on `"` and `#`, icons rendered as squares. Inlining base64 icons in `content.js` blew the 60 KB budget. Final: copy `src/icons` to `dist/icons`, load as `web_accessible_resources` via CSS `mask-image`.
23. Rewriting `fill` to `currentColor` in `fetch-icons.mjs`: pointless (masks use alpha only) and it fills shapes meant to be empty. Reverted.
24. `grid-template-rows: 0fr → 1fr` on an empty list animates to the wrong height. Fill lists before opening.
25. `setTimeout(Infinity)` fires immediately; `waitFor` needs an explicit no-timeout path.
26. Iterator helpers need Firefox 131; we target 128. Use arrays.

Testing:

27. Firefox keeps the old `main-world.js` running in open tabs after a temporary add-on reload (`TypeError: c[s] is not a function`). The per-build id in `build.mjs` + `src/core/bridge.ts` fixes it. Keep it.
28. `ext.mjs --remove` deletes our nodes to imitate a YouTube redraw. Each log line prints twice (first copy is a `robots.txt` load).
29. `probe.mjs` eval is blocked by CSP on Home (Search allows it). Wrap snippets as an IIFE.
30. Headless Firefox can't play live video; test chat on a live-now stream (e.g. Lofi Girl). Consent screens can hide chat. Launch and `waitFor` timeouts happen; retry before calling it a regression.
31. Console paste in Firefox needs `allow pasting` once. Console scripts save to Downloads or the clipboard.
32. When a fix works logged out but not for the user, ask for a `scripts/diag.js` report before guessing.
33. CleanShot and download paths may contain a narrow no-break space. Use globs or `ls`, not typed names.
34. Firefox sizes the action popup on its first layout. Build popup rows synchronously; `storage.sync` cold start is slow, and a popup that waited for it opened near-empty and closed (needed ~3 clicks). Headless Firefox cannot navigate to `moz-extension://` pages, so the popup needs a signed-in-side check.
35. YouTube's `updatePanelsLocation` (theater, fullscreen, column changes) wants `#panels`, `#chat-container`, `#playlist`, `#inline-panels` (plus `#shopping-timely-shelf`, `#persistent-panel-container` in `#below`) as the first children of their parent, in order. Anything we insert inside that run makes it re-insert every panel on each call, and our re-mount then moves heavy subtrees (comments re-render, chat iframe reload). Insert after the run; reorder with CSS. Trace DOM moves by wrapping `Node.prototype.insertBefore` in an `ext.mjs --eval` snippet (main world sees YouTube's calls, not ours).
36. `ext.mjs --scrollbars` forces classic scrollbars; headless defaults to overlay ones (0px wide), which hides scrollbar-width bugs.
37. Theater with live chat: `updateChatLocation` moves `#chat-container` into `#columns` and sets `[fixed-panels]` (chat `position: fixed; top: var(--ytd-masthead-height-accounting-for-hidden)`, `#columns` padding-right = sidebar width). The `web_watch_theater_chat` flag TabView flips is no longer read; `web_watch_theater_chat_beside_player` picks `#panels-full-bleed-container` instead. Logged-out live chat to test with: `/@LofiGirl/live`.
38. The watch action row's `ytd-menu-renderer` drops flexible items (Save, Download, Ask) into ⋯ from the end when the row wraps. Reassigning its `data` with reordered or filtered `flexibleItems` re-stamps the row cleanly; keep YouTube's original to restore on abort. Ask's item is found by `panelIdentifier: 'PAyouchat'` or icon `SPARK`. HTML lowercases attribute names: observe `kyt-watch-tabs-aias`, not `-aiAs`.
