# Kempt for YouTube

MV3 extension (Chrome + Firefox 128+) that restyles YouTube. No framework, esbuild, `node:test`.

## Start here

1. Read `PLAN.md` **Next up** (top of file) for open work, then §8 Phases for status.
2. Architecture and rules: `PLAN.md` §1 Principles, §4 Core model. Design decisions: §10. Known risks: §7.
3. Before "fixing" odd YouTube behavior, check `PLAN.md` §13 Lessons. Add new lessons there when a bug took a real debugging round.
4. Do not re-derive what PLAN.md already records. Update PLAN.md (Next up, §8, §10) when a phase step lands or the user decides something.

## Commands

```sh
npm run build    # one-off build into dist/
npm run dev      # watch build
npm run check    # tsc --noEmit
npm test         # node --test test/
npm run icons    # re-export Figma icons to src/icons/ (needs FIGMA_TOKEN in .env)
```

## Verifying changes (agent side)

Run `npm run check && npm test && npm run build` after every change. Then check visually in logged-out headless Firefox:

- `node scripts/ext.mjs [url] [shot.png] [--width=N] [--fake-login] [--eval=file.js] [--clip=sel] [--hover=sel] [--click=sel]` loads `dist/` as a real extension. Use it for anything JS. Under 1312px YouTube shows the mini guide. `--eval` prints a snippet's return value (rects, computed styles).
- Add `--css-only` to inject `dist/content.css` with every flag on instead (faster CSS checks), `--off` for plain YouTube, `--light` for the light theme. Full flag list at the top of the script.
- Headless Firefox draws no `backdrop-filter`. Signed-in-only UI (Watch later, Subscriptions/Playlists data, Ask AI) cannot be verified here: list it for the user to check.

## Verifying changes (user side)

The user tests signed in, in Firefox via `about:debugging` → Reload, then refreshes the tab. Batch signed-in checks into one list. Ask for window width + steps (or a screen recording for animation bugs) when a report is ambiguous.

Signed-in samples: `scripts/dump-dom.js`, `scripts/guide-dump.js`, `scripts/diag.js` are pasted into the user's console; outputs land in `samples/` (gitignored).

## Conventions

- Adding a feature: new `src/features/<id>/{index.ts,style.css}` + one line in `src/features/index.ts`. No core changes (PLAN.md §4.1).
- Page-world code (ytcfg, element `.data`, Innertube) goes in `src/features/<id>/page.ts`, spread into `src/features/page.ts`; shared helpers in `src/page/` (PLAN.md §4.7). `ctx.call` is typed from that map; pass selectors and JSON, never elements.
- `test/structure.test.ts` enforces registration, `html[kyt-<id>]` gating and unique handler names. Fix the code, not the test.
- Every CSS rule is gated by `html[kyt-<id>]`. Every listener/observer takes `ctx.signal`; abort must restore YouTube's DOM.
- YouTube selectors used from JS go in `src/core/selectors.ts`. Prefer structural selectors and 2025 camelCase classes over localized `aria-label`s.
- No polling, no global observers, no timers.
- Commits: Conventional Commits, brief subject, optional bullet body. The message must start with the type (`feat:`, `fix:`), no leading spaces or backticks.
- Figma: file `67JrsVl1sPE1qzZZL0iuNG` (frame ids in PLAN.md §9). Its measurements may be off (user is new to Figma); match YouTube's native sizes unless told otherwise.

## User preferences

- The user commits and pushes. Give a brief Conventional Commits message, roughly one commit per phase.
- Other models sometimes edit between sessions. Review their changes; keep only what is correct and clean.
- Performance matters ("nothing sucking 10W"). CSS first, compositor-only animations (transform/opacity, rotate arrows instead of swapping icons), respect `prefers-reduced-motion`.
- YouTube-style animation on every dropdown or toggle. Clean, minimal look from Figma.
- "Selected background" means the accent tint used across the extension (PLAN.md §10.7), never white.
- Report results briefly: what changed, what was checked, what needs a signed-in check. Caveman voice when asked.
- Suggest a fresh session after a commit when context is long; PLAN.md carries state.
