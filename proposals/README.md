# Overnight proposals (branch `overnight/v1-polish`)

Everything here is a proposal for v1.0 criteria 8 (screenshots) and 9 (README and docs). Nothing is pushed.

## Store listing
- `store/listing.md`: summaries for both stores, full description, fields, privacy tab answers, open points.
- `store/preview.html`: mock of the CWS and AMO pages. Run `python3 -m http.server 8765` in the repo root, open http://localhost:8765/store/preview.html.
- `store/screenshot-*.png` (captioned) and `*-plain.png` (full bleed), 1280x800; `promo-small-440x280.png`, `promo-marquee-1400x560.png`, `icon-128-padded.png`. Rebuild with `node scripts/store-art.mjs`.

## README
- `README.md` on the branch. Rendered mock: `proposals/readme-preview.png` (or `readme-preview.html` through the same server).

## Landing page and docs
- `proposals/landing-preview.png`, `proposals/docs-settings-preview.png`. Live: `cd site && npm run build && npx astro preview`.
- Every docs page updated, outdated banners removed, new page `features/search-and-playlists.md`.

## Screenshots
- Masters: `node scripts/shots.mjs --profile=~/.kempt-ff --with=~/.cache/kyt/ublock.xpi` (samples/shots, gitignored). Site frames: `scripts/frame-shots.sh`.
- Shots use the throwaway account (its name and avatar show). Reshoot with your profile if that matters.
