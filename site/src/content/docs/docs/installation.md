---
title: Installation
description: Install Kempt from a store or build it from source.
---

## From a store

- For Firefox 128 or later, use [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/PLACEHOLDER).
- For Chrome, Edge, Brave and other Chromium browsers, use the [Chrome Web Store](https://chromewebstore.google.com/detail/PLACEHOLDER).

Reload any YouTube tab that was open before you installed. Kempt starts with every feature on except Grid size.

## Build from source

You need Node.js 22 or later.

```sh
git clone https://github.com/remonilo/kempt-yt
cd kempt-yt
npm i
npm run build
```

The build writes the extension to `dist/`.

### Load it in Firefox

1. Open `about:debugging`.
2. Click **This Firefox**, then **Load Temporary Add-on**.
3. Pick `dist/manifest.json`.

Firefox removes a temporary add-on when it quits. After a rebuild, click **Reload** on Kempt's entry and refresh the YouTube tab.

### Load it in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and pick the `dist/` folder.

## Update

Store installs update on their own. For a source build, pull, run `npm run build`, then reload the extension as above.

## Uninstall

Remove Kempt from your browser's extensions page. Your settings live in the browser's extension storage and go with it. One small key, `kyt:flags`, stays in YouTube's `localStorage` until you clear site data; it only lists which features were on.
