<div align="center">

<h1>Kempt</h1>

<p align="center">
  <a href="https://remonilo.github.io/kempt-yt/docs/">Docs</a>
  ·
  <a href="https://remonilo.github.io/kempt-yt/docs/installation/">Install</a>
  ·
  <a href="https://remonilo.github.io/kempt-yt/docs/faq/">FAQ</a>
  ·
  <a href="https://remonilo.github.io/kempt-yt/docs/privacy/">Privacy</a>
</p>

[![Last commit](https://img.shields.io/github/last-commit/remonilo/kempt-yt?style=flat-square)](https://github.com/remonilo/kempt-yt/commits/main)
[![Issues](https://img.shields.io/github/issues/remonilo/kempt-yt?style=flat-square)](https://github.com/remonilo/kempt-yt/issues)
[![Stars](https://img.shields.io/github/stars/remonilo/kempt-yt?style=flat-square)](https://github.com/remonilo/kempt-yt/stargazers)
[![License](https://img.shields.io/github/license/remonilo/kempt-yt?style=flat-square)](LICENSE)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-ea4aaa?style=flat-square)](https://github.com/sponsors/remonilo)

### A kempt and consistent redesign of YouTube

One accent color and icon set, and less clutter. Every change is a switch you can turn off.

</div>

<div align="center">
  <table>
    <tr>
      <td colspan="2">
        <img src="site/public/screenshots/demo.png" alt="Watch page with Kempt" />
      </td>
    </tr>
    <tr>
      <td width="50%">
        <img src="site/public/screenshots/timeline.png" alt="Subscriptions timeline" />
      </td>
      <td width="50%">
        <img src="site/public/screenshots/sidebar.png" alt="Redesigned sidebar" />
      </td>
    </tr>
  </table>
</div>
<p align="center">
  <sub>Follows YouTube's light and dark theme. The accent is yours to pick.</sub>
</p>
<br>

> [!NOTE]
> **Kempt only changes how YouTube looks.**
>
> It doesn't block ads or download anything. It moves and restyles YouTube's own elements, and every button keeps YouTube's own behavior.

## Features

- **Watch page tabs** put Info, Comments, Videos, Live chat and Ask AI in one panel beside the player, and only the open tab scrolls. <details><summary><sup>click to see the tabs</sup></summary><img src="site/public/screenshots/tabs.png" alt="Watch page tabs" /></details>
- **The Subscriptions timeline** sorts uploads under date headers, with All / Videos / Live / Shorts chips and a search box. History gets the same headers.
- **The redesigned sidebar** turns Explore, Subscriptions and Playlists into dropdowns and hides the entries you never use.
- **One accent and one icon set** cover chips, tabs, the progress bar, Subscribe and every button. Kempt draws the icons over YouTube's own buttons.
- **Plus Jakarta Sans** replaces Roboto in all of YouTube's text. You can pick Inter, Geist, Figtree or your system font instead, and the fonts ship inside the extension.
- **Small fixes** include an outlined search bar, Settings in the top bar, a Watch later button and comment sort as chips.
- **Grid size** sets how many videos and Shorts fill each row on Home, Subscriptions and channels.
- **Hide Shorts** removes Shorts shelves everywhere and opens Shorts links in the normal player.
- **Every change** has its own switch in the popup. <details><summary><sup>click to see the popup</sup></summary><!-- PLACEHOLDER: popup --><br><img src="site/public/screenshots/popup.png" alt="Kempt popup" width="260" /></details>
- **Kempt's labels** follow YouTube's UI language and come in 11 languages.
- **Battery use** stays low because Kempt does no polling, runs no page-wide observers and animates on the compositor only. It also respects reduced motion.

## Quick start

[<kbd><br>install<br></kbd>][install_link]
[<kbd><br>settings<br></kbd>][settings_link]
[<kbd><br>faq<br></kbd>][faq_link]
[<kbd><br>how it works<br></kbd>][internals_link]

## Installation

### Firefox

Firefox 128 or later: [Firefox Add-ons][firefox_link].

### Chromium browsers

Chrome, Edge, Brave or any other Chromium browser: [Chrome Web Store][chrome_link].

### From source

You need Node.js 22 or later.

```sh
git clone https://github.com/remonilo/kempt-yt
cd kempt-yt
npm i
npm run build
```

- In Firefox, open `about:debugging` → This Firefox → Load Temporary Add-on → `dist/manifest.json`.
- In Chrome, open `chrome://extensions` → Developer mode → Load unpacked → `dist/`.

Reload any YouTube tab that was open before.

## Privacy

Kempt collects nothing and has no server. It asks for one permission, `storage`, for your settings, and runs on `www.youtube.com` only. The few requests it makes go to YouTube with your session, and YouTube's own menus send the same ones. [Details][privacy_link].

## Contributing

```sh
npm run dev      # watch build into dist/
npm run check    # typecheck
npm test         # node --test
```

Kempt is TypeScript with no framework or runtime dependencies. A feature is one folder in `src/features/<id>/` plus one line in `src/features/index.ts`. Start with [Adding a feature][add_link]. [YouTube quirks][quirks_link] records the lessons learned about YouTube's DOM.

A bug report helps most when it includes your browser, window width, YouTube language, signed in or out, and the steps to reproduce.

The docs site lives in `site/` (Astro + Starlight): `cd site && npm i && npm run dev`.

## Translations

Kempt's own labels exist in English, Spanish, Portuguese, German, French, Russian, Japanese, Korean, Hindi, Indonesian and Turkish. No native speaker helped write the non-English ones. If you speak one, read the `WORDS` tables in `src/features/*/index.ts` and open a PR.

## Motivation

YouTube's UI is built from many teams' parts. It mixes three icon styles, and its accents change from page to page. Years of added features left clutter on top. Kempt pulls it all into one design. It started from Juxtopposed's YouTube redesign concept and grew into something I use every day.

## Credits

Icons come from Juxtopposed's _YouTube Redesign (Community)_ [Figma](https://www.figma.com/community/file/1450380484645543336/youtube-redesign) with gaps filled from [Hugeicons](https://hugeicons.com) (MIT). Kempt is not affiliated with or endorsed by YouTube or Google.

## Support

Kempt is free and I maintain it alone. [Sponsor on GitHub](https://github.com/sponsors/remonilo) if it saves you some annoyance.

## License

[MIT](LICENSE)

<!---------------------------------------------------------------------------->

[firefox_link]: https://addons.mozilla.org/firefox/addon/PLACEHOLDER
[chrome_link]: https://chromewebstore.google.com/detail/PLACEHOLDER
[install_link]: https://remonilo.github.io/kempt-yt/docs/installation/
[settings_link]: https://remonilo.github.io/kempt-yt/docs/settings/
[faq_link]: https://remonilo.github.io/kempt-yt/docs/faq/
[internals_link]: https://remonilo.github.io/kempt-yt/docs/internals/architecture/
[add_link]: https://remonilo.github.io/kempt-yt/docs/internals/adding-a-feature/
[quirks_link]: https://remonilo.github.io/kempt-yt/docs/internals/youtube-quirks/
[privacy_link]: https://remonilo.github.io/kempt-yt/docs/privacy/
