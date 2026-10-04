// Dev check: loads dist/ as a real extension in logged-out Firefox and prints which kyt features mounted.
// usage: node scripts/ext.mjs [url] [screenshot.png] [--fake-login] [--type=query] [--eval=file.js]
//   --width=N sets the viewport width (default 1400; under 1312 YouTube shows the collapsed mini guide).
//   --type types into the search box (real key events) so the suggestions popup opens.
//   --eval runs file.js (an async function body) in the page after load and prints its return value.
//   --scrollbars forces classic (non-overlay) scrollbars, like macOS "Always show scroll bars".
//   --fake-login makes ytcfg report LOGGED_IN so signed-in-only features mount (their API calls still fail).
//   --with=<dir or .xpi> also installs another extension, e.g. Return YouTube Dislike (repeatable).
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
const [url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', shotPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const browser = await puppeteer.launch({
  browser: 'firefox', executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox', headless: true,
  extraPrefsFirefox: { 'ui.systemUsesDarkTheme': 1, 'xpinstall.signatures.required': false,
    ...(process.argv.includes('--scrollbars') && { 'ui.useOverlayScrollbars': 0 }) },
});
try {
  await browser.installExtension(resolve('dist'));
  // --with=<dir or .xpi>: another extension alongside ours (compatibility checks), repeatable.
  for (const a of process.argv.filter((a) => a.startsWith('--with='))) await browser.installExtension(resolve(a.slice(7)));
  const page = await browser.newPage();
  const widthArg = process.argv.find((a) => a.startsWith('--width='));
  await page.setViewport({ width: widthArg ? Number(widthArg.slice(8)) : 1400, height: 900 });
  if (process.argv.includes('--fake-login'))
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
  await new Promise((r) => setTimeout(r, 8000));
  console.log(await page.evaluate(() => JSON.stringify({
    flags: document.documentElement.getAttributeNames().filter((a) => a.startsWith('kyt')),
    settingsBtn: !!document.querySelector('.kyt-settings'),
    wl: !!document.querySelector('.kyt-wl'),
    stamped: [...document.querySelectorAll('[kyt-icon]')].map((e) => e.getAttribute('kyt-icon')),
    settingsAt: document.querySelector('.kyt-settings')?.nextElementSibling?.tagName,
    wlAt: (() => { const w = document.querySelector('.kyt-wl'); return w && [...w.parentElement.children].map((c) => c === w ? 'WL' : c.tagName + '#' + c.id).join(' ') + ' < ' + w.parentElement.tagName + ' < ' + w.parentElement.parentElement.id; })(),
    menu: !!document.querySelector('ytd-masthead #buttons > ytd-topbar-menu-button-renderer'),
  })));
  if (process.argv.includes('--remove')) {
    // Simulate a YouTube re-render dropping our nodes; keep() should put them back.
    await page.evaluate(() => document.querySelectorAll('.kyt-settings, .kyt-wl').forEach((e) => e.remove()));
    await new Promise((r) => setTimeout(r, 500));
    console.log('after remove:', await page.evaluate(() => [!!document.querySelector('.kyt-settings'), !!document.querySelector('.kyt-wl')].join()));
  }
  const typeArg = process.argv.find((a) => a.startsWith('--type='));
  if (typeArg) {
    const { x, y, width, height } = await page.$eval('ytd-masthead yt-searchbox', (e) => e.getBoundingClientRect().toJSON());
    await page.mouse.click(x + width / 2, y + height / 2);
    await page.keyboard.type(typeArg.slice(7), { delay: 50 });
    await new Promise((r) => setTimeout(r, 2000));
  }
  const evalArg = process.argv.find((a) => a.startsWith('--eval='));
  if (evalArg) {
    const { readFile } = await import('node:fs/promises');
    console.log(await page.evaluate(`(async () => { ${await readFile(evalArg.slice(7), 'utf8')} })()`));
  }
  console.log(logs.join('\n'));
  if (shotPath) await page.screenshot({ path: shotPath });
} finally { await browser.close(); }
