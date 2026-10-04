---
title: Privacy
description: What Kempt stores and sends. Short version, nothing leaves your browser.
---

Kempt collects no data. It has no server, no analytics and no remote code.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Saves your settings. Your browser syncs them through your own browser account. |
| `https://www.youtube.com/*` | Runs Kempt on YouTube. It runs on no other site. |

## Network requests

Kempt makes requests only to `www.youtube.com`, from your page, with your session:

- **Watch later button:** checks whether the video is in Watch later, and adds or removes it. These are the requests YouTube's own Save menu sends.
- **Sidebar:** loads your sidebar entries and your playlist list when the page doesn't carry them yet. These are the requests YouTube's own sidebar and Save menu send.

The answers stay in the page. Kempt keeps nothing from them.

## Local storage

Kempt mirrors which features are on into the page's `localStorage` under `kyt:flags`. It reads that before YouTube draws the page, so the styles apply without a flash. It holds feature names and nothing else.

## Contact

Questions about privacy: [open an issue](https://github.com/remonilo/kempt-yt/issues).
