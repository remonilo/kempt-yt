// Screenshot of the popup for the README and site: dist/popup.html in headless Firefox with a stubbed chrome API.
// usage: node scripts/popup-shot.mjs [out.png] [--light] [--scale=3] [--open=sidebar,grid] [--height=N]
//   --open expands the rows whose label contains those words; --height crops the shot (default: the whole popup).
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'site/public/screenshots/popup.png';
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const light = process.argv.includes('--light');
let manifest;
try {
  manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
} catch {
  console.error('dist/manifest.json missing or broken: run npm run build first');
  process.exit(1);
}

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox',
  headless: true,
  extraPrefsFirefox: { 'ui.systemUsesDarkTheme': light ? 0 : 1 },
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 600, deviceScaleFactor: Number(flag('scale') ?? 3) });
  await page.evaluateOnNewDocument((version) => {
    const base = location.href.replace(/[^/]*$/, '');
    window.chrome = {
      runtime: { getManifest: () => ({ version }), getURL: (p) => base + p.replace(/^\//, '') },
      storage: { sync: { get: async () => ({}), set: async () => {} }, onChanged: { addListener() {} } },
    };
  }, manifest.version);
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`file://${resolve('dist/popup.html')}`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 500));
  const groups = flag('open')?.split(',') ?? [];
  const opened = await page.evaluate((groups) => {
    const hit = [];
    for (const g of groups) {
      const btn = [...document.querySelectorAll('.kp-chevron')]
        .find((b) => b.parentElement?.textContent.toLowerCase().includes(g.toLowerCase()));
      if (!btn) continue;
      btn.click();
      hit.push(g);
    }
    return hit;
  }, groups);
  await new Promise((r) => setTimeout(r, 500));
  const height = Number(flag('height') ?? (await page.evaluate(() => document.documentElement.scrollHeight)));
  await page.setViewport({ width: 360, height, deviceScaleFactor: Number(flag('scale') ?? 3) });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: out });
  console.log('saved', out, `360x${height}`, 'opened:', opened.join(',') || 'none');
} finally {
  await browser.close();
}
