// Dev check: open YouTube (logged out) in local Firefox, apply dist/content.css with every feature flag on,
// and screenshot. usage: node scripts/shot.mjs <url> <out.png> [selector-to-clip] [--off] [--light]
//   [--width=1400] [--scale=1] [--hover=<selector>] [--click=<selector>]
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';

const [url, out, clip] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const off = process.argv.includes('--off');
const light = process.argv.includes('--light');
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const css = await readFile('dist/content.css', 'utf8');
const ids = [...new Set([...css.matchAll(/html\[kyt-([\w-]+)\]/g)].map((m) => m[1]))];

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox',
  headless: true,
  extraPrefsFirefox: { 'ui.systemUsesDarkTheme': light ? 0 : 1 },
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(flag('width') ?? 1400), height: 900, deviceScaleFactor: Number(flag('scale') ?? 1) });
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 4000));
  if (!off) {
    await page.addStyleTag({ content: css });
    await page.evaluate((ids) => ids.forEach((id) => document.documentElement.setAttribute(`kyt-${id}`, '')), ids);
  }
  if (flag('click')) await page.click(flag('click'));
  if (flag('hover')) await page.hover(flag('hover'));
  await new Promise((r) => setTimeout(r, 500));
  const el = clip && (await page.$(clip));
  await (el ?? page).screenshot({ path: out });
  console.log('saved', out, el ? `(${clip})` : '(page)', 'dark=', await page.evaluate(() => document.documentElement.hasAttribute('dark')));
} finally {
  await browser.close();
}
