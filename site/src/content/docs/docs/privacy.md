---
title: Privacy
description: What Kempt stores and sends. In short, nothing leaves your browser.
---

Kempt collects no data and has no server. It loads no remote code and runs no analytics.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Saves your settings. Your browser syncs them through your own browser account. |
| `https://www.youtube.com/*` | Runs Kempt on YouTube. It runs on no other site. |

## Network requests

Kempt sends requests only to `www.youtube.com`, from your page and with your session:

- The Watch later button checks whether the video is in Watch later, and adds or removes it. YouTube's own Save menu sends the same requests.
- The sidebar loads your sidebar entries and your playlist list when the page doesn't carry them yet. YouTube's own sidebar and Save menu send the same requests.

The answers stay in the page. Kempt keeps nothing from them.

## Local storage

Kempt mirrors which features are on into the page's `localStorage` under `kyt:flags`. It reads that before YouTube draws the page, so the styles apply without a flash. It holds feature names and nothing else.

## Contact

For questions about privacy, [open an issue](https://github.com/remonilo/kempt-yt/issues).
