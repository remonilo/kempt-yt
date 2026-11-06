// Store/README screenshot masters: loads dist/ in headless Firefox and shoots a fixed list of YouTube pages at a
// 1440x900 viewport, 2x DPR (2880x1800 PNGs). 1440 keeps YouTube's full guide (under 1312 it shows the mini guide);
// the 16:10 ratio scales straight to the store's 1280x800 (`magick x.png -resize 1280x800 y.png`).
// usage: node scripts/shots.mjs [--profile=~/.kempt-ff] [--out=samples/shots] [--only=home,watch] [--light]
//   [--with=<.xpi or dir>] also installs another extension, e.g. uBlock Origin so no ads land in the shots (repeatable).
// Run `npm run build` first. Signed-in pages need --profile (close any Firefox using it). Video stays muted.
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const profile = flag('profile')?.replace(/^~(?=\/)/, homedir());
const out = flag('out') ?? 'samples/shots';
const only = flag('only')?.split(',');
const light = process.argv.includes('--light');

const pause = () => document.querySelectorAll('video').forEach((v) => { v.muted = true; v.pause(); });
// Seeks to a frame with picture and shows the controls, for watch-page shots.
async function atFrame(page, t) {
  await page.evaluate((t) => {
    const v = document.querySelector('#movie_player video');
    if (v) { v.muted = true; v.currentTime = t; v.pause(); }
  }, t);
  await sleep(2500);
}

const SHOTS = {
  home: { url: 'https://www.youtube.com/', setup: async (p) => { await p.evaluate(pause); } },
  watch: {
    url: 'https://www.youtube.com/watch?v=GdzdAWAU9WY',
    setup: async (p) => {
      await atFrame(p, 95);
      await p.addStyleTag({ content: '.ytp-chrome-bottom, .ytp-gradient-bottom { opacity: 1 !important }' });
    },
  },
  comments: {
    url: 'https://www.youtube.com/watch?v=GdzdAWAU9WY',
    setup: async (p) => {
      await atFrame(p, 95);
      await p.evaluate(() => document.querySelectorAll('.kyt-tab[role=tab]')[1]?.click());
      await sleep(3000);
    },
  },
  // No captions entry: headless Firefox never requests timedtext. scripts/captions-shot.js shoots it in Chromium.
  subs: { url: 'https://www.youtube.com/feed/subscriptions', setup: async (p) => { await p.evaluate(pause); } },
  history: { url: 'https://www.youtube.com/feed/history', setup: async (p) => { await p.evaluate(pause); } },
  search: { url: 'https://www.youtube.com/results?search_query=paper+boat', setup: async (p) => { await p.evaluate(pause); } },
  playlists: { url: 'https://www.youtube.com/feed/playlists', setup: async (p) => { await p.evaluate(pause); } },
  playlist: { url: 'https://www.youtube.com/playlist?list=WL', setup: async (p) => { await p.evaluate(pause); } },
  channel: { url: 'https://www.youtube.com/@mkbhd/videos', setup: async (p) => { await p.evaluate(pause); } },
};

await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  browser: 'firefox', executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox', headless: true,
  ...(profile && { userDataDir: profile }),
  extraPrefsFirefox: { 'ui.systemUsesDarkTheme': light ? 0 : 1, 'media.volume_scale': '0.0' }, // always muted
});
try {
  await browser.installExtension(resolve('dist'));
  for (const a of process.argv.filter((a) => a.startsWith('--with='))) await browser.installExtension(resolve(a.slice(7).replace(/^~(?=\/)/, homedir())));
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  for (const [name, { url, setup }] of Object.entries(SHOTS)) {
    if (only && !only.includes(name)) continue;
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.bringToFront();
    await sleep(8000);
    await setup(page);
    await page.mouse.move(1439, 899); // no hover state on the shot
    await sleep(800);
    const path = join(out, `${name}${light ? '-light' : ''}.png`);
    await page.screenshot({ path });
    console.log(`saved ${path}`);
  }
} finally { await browser.close(); }
