// Finds CSS rules that make Chromium restyle the whole page on every DOM change (e.g. a descendant rule under :has()).
// usage: node scripts/style-cost.mjs   (builds nothing: run `npm run build` first; uses Helium, headless)
// Loads a watch page with dist/ (minus its manifest CSS), injects dist/content.css as a <style>, and times a style
// flush after a tooltip style write with only one rule (and its parents) enabled at a time. Rules over 0.5 ms print.
import puppeteer from 'puppeteer-core';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const ext = await mkdtemp(join(tmpdir(), 'kyt-ext-'));
await cp(resolve('dist'), ext, { recursive: true });
let manifest;
try {
  manifest = JSON.parse(await readFile(join(ext, 'manifest.json'), 'utf8'));
} catch (e) {
  throw new Error(`dist/manifest.json unreadable, run npm run build first: ${e.message}`);
}
for (const c of manifest.content_scripts) delete c.css; // injected below as a <style>, so rules can be toggled
await writeFile(join(ext, 'manifest.json'), JSON.stringify(manifest));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/Applications/Helium.app/Contents/MacOS/Helium',
  headless: true, userDataDir: await mkdtemp(join(tmpdir(), 'kyt-chrome-')), enableExtensions: [ext],
  defaultViewport: { width: 1400, height: 900 }, args: ['--mute-audio'],
});
try {
  const page = await browser.newPage();
  await page.goto('https://www.youtube.com/watch?v=GdzdAWAU9WY', { waitUntil: 'domcontentloaded' });
  const bar = await page.waitForSelector('#movie_player .ytp-chrome-bottom .ytp-progress-bar', { timeout: 30000 });
  await sleep(4000);
  await page.evaluate(() => { const v = document.querySelector('video'); v.muted = true; v.pause(); });
  await bar.hover(); // creates the preview tooltip
  await sleep(500);
  console.log(await page.evaluate((css) => {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.append(st);
    const all = [];
    const walk = (rules) => { for (const r of rules) { if (r.selectorText != null) all.push(r); if (r.cssRules) walk(r.cssRules); } };
    walk(st.sheet.cssRules);
    const orig = new Map(all.map((r) => [r, r.selectorText]));
    const tt = document.querySelector('.ytp-tooltip');
    const flush = () => void document.body.getBoundingClientRect();
    const time = () => {
      flush();
      const a = performance.now();
      for (let i = 0; i < 12; i++) { tt.style.left = `${100 + i}px`; flush(); }
      return (performance.now() - a) / 12;
    };
    const out = [`all ${all.length} rules: ${time().toFixed(2)} ms per flush`];
    all.forEach((r) => (r.selectorText = 'kyt-never'));
    out.push(`no rules: ${time().toFixed(2)} ms`);
    for (const r of all) {
      const chain = [];
      for (let p = r; p; p = p.parentRule) if (orig.has(p)) chain.unshift(p);
      chain.forEach((p) => (p.selectorText = orig.get(p)));
      const t = time();
      if (t > 0.5) out.push(`${t.toFixed(2)}  ${chain.map((p) => orig.get(p).replace(/\s+/g, ' ').slice(0, 160)).join('  >>  ')}`);
      chain.forEach((p) => (p.selectorText = 'kyt-never'));
    }
    return out.join('\n');
  }, await readFile('dist/content.css', 'utf8')));
} finally {
  await browser.close();
}
