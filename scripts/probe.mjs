// Dev check: like shot.mjs, but runs a JS file's body in the page (with every feature on) and prints the result.
// usage: node scripts/probe.mjs <url> <file.js> [--off] [--hover=<selector>]   (file body may `return` a string; async ok)
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';

const [url, file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const off = process.argv.includes('--off');
const css = await readFile('dist/content.css', 'utf8');
const ids = [...new Set([...css.matchAll(/html\[kyt-([\w-]+)\]/g)].map((m) => m[1]))];
const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox',
  headless: true,
  extraPrefsFirefox: { 'ui.systemUsesDarkTheme': 1 },
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 4000));
  if (!off) {
    await page.addStyleTag({ content: css });
    await page.evaluate((ids) => ids.forEach((id) => document.documentElement.setAttribute(`kyt-${id}`, '')), ids);
  }
  const hover = process.argv.find((a) => a.startsWith('--hover='))?.slice(8);
  if (hover) await page.hover(hover);
  console.log(await page.evaluate(`(async () => { ${await readFile(file, 'utf8')} })()`));
} finally {
  await browser.close();
}
