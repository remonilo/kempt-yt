// Dev check: loads dist/ as a real extension in logged-out Firefox and prints which kyt features mounted.
// usage: node scripts/ext.mjs [url] [screenshot.png] [flags]
//   --css-only injects dist/content.css with every feature flag on instead of the extension (fast CSS checks).
//   --off loads neither, for a plain-YouTube comparison.
//   --eval=file.js runs file.js (an async function body) in the page after load and prints its return value.
//   --click=sel, --hover=sel act after --eval (so the snippet can create the target), before the screenshot.
//   --clip=sel screenshots that element instead of the viewport.
//   --width=N sets the viewport width (default 1400; under 1312 YouTube shows the collapsed mini guide).
//   --scale=N sets the device pixel ratio. --light uses the light theme.
//   --type types into the search box (real key events) so the suggestions popup opens.
//   --scrollbars forces classic (non-overlay) scrollbars, like macOS "Always show scroll bars".
//   --fake-login makes ytcfg report LOGGED_IN so signed-in-only features mount (their API calls still fail).
//   --with=<dir or .xpi> also installs another extension, e.g. Return YouTube Dislike (repeatable).
//   --lang=de sets the browser language; logged out, YouTube follows it (its ?hl= is ignored).
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', shotPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const has = (name) => process.argv.includes(`--${name}`);
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const cssOnly = has('css-only');
const ext = !cssOnly && !has('off');
const lang = flag('lang');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  browser: 'firefox', executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox', headless: true,
  extraPrefsFirefox: { 'ui.systemUsesDarkTheme': has('light') ? 0 : 1, 'xpinstall.signatures.required': false,
    ...(has('scrollbars') && { 'ui.useOverlayScrollbars': 0 }),
    ...(lang && { 'intl.accept_languages': lang, 'intl.locale.requested': lang }) },
});
try {
  if (ext) {
    await browser.installExtension(resolve('dist'));
    for (const a of process.argv.filter((a) => a.startsWith('--with='))) await browser.installExtension(resolve(a.slice(7)));
  }
  const page = await browser.newPage();
  await page.setViewport({ width: Number(flag('width') ?? 1400), height: 900, deviceScaleFactor: Number(flag('scale') ?? 1) });
  if (has('fake-login'))
    await page.evaluateOnNewDocument(() => {
      let cfg;
      Object.defineProperty(window, 'ytcfg', {
        configurable: true,
        get: () => cfg,
        set(v) {
          const get = v.get.bind(v);
          v.get = (k) => (k === 'LOGGED_IN' ? true : get(k));
          cfg = v;
        },
      });
    });
  const logs = [];
  page.on('console', (m) => m.text().includes('kyt') && logs.push(m.text()));
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.bringToFront(); // an extension's welcome tab would leave YouTube in the background (no rAF, skeleton only)
  await sleep(ext ? 8000 : 4000);
  if (cssOnly) {
    const css = await readFile('dist/content.css', 'utf8');
    const ids = [...new Set([...css.matchAll(/html\[kyt-([\w-]+)\]/g)].map((m) => m[1]))];
    await page.addStyleTag({ content: css });
    await page.evaluate((ids) => ids.forEach((id) => document.documentElement.setAttribute(`kyt-${id}`, '')), ids);
  }
  if (ext) console.log(await page.evaluate(() => JSON.stringify({
    flags: document.documentElement.getAttributeNames().filter((a) => a.startsWith('kyt')),
    settingsBtn: !!document.querySelector('.kyt-settings'),
    wl: !!document.querySelector('.kyt-wl'),
    stamped: [...document.querySelectorAll('[kyt-icon]')].map((e) => e.getAttribute('kyt-icon')),
  })));
  if (has('remove')) {
    // Simulate a YouTube re-render dropping our nodes; keep() should put them back.
    await page.evaluate(() => document.querySelectorAll('.kyt-settings, .kyt-wl').forEach((e) => e.remove()));
    await sleep(500);
    console.log('after remove:', await page.evaluate(() => [!!document.querySelector('.kyt-settings'), !!document.querySelector('.kyt-wl')].join()));
  }
  if (flag('type')) {
    const { x, y, width, height } = await page.$eval('ytd-masthead yt-searchbox', (e) => e.getBoundingClientRect().toJSON());
    await page.mouse.click(x + width / 2, y + height / 2);
    await page.keyboard.type(flag('type'), { delay: 50 });
    await sleep(2000);
  }
  if (flag('eval')) console.log(await page.evaluate(`(async () => { ${await readFile(flag('eval'), 'utf8')} })()`));
  if (flag('click')) await page.click(flag('click'));
  if (flag('hover')) await page.hover(flag('hover'));
  if (logs.length) console.log(logs.join('\n'));
  if (shotPath) {
    await sleep(500);
    const el = flag('clip') && (await page.$(flag('clip')));
    await (el ?? page).screenshot({ path: shotPath });
  }
} finally { await browser.close(); }
