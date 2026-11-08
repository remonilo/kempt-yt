// Store/README screenshot masters: loads dist/ in headless Firefox and shoots a fixed list of YouTube pages at a
// 1440x900 viewport, 2x DPR (2880x1800 PNGs). 1440 keeps YouTube's full guide (under 1312 it shows the mini guide);
// the 16:10 ratio scales straight to the store's 1280x800 (`magick x.png -resize 1280x800 y.png`).
// usage: node scripts/shots.mjs [--profile=~/.kempt-ff] [--out=samples/shots] [--only=home,watch] [--light]
//   [--accent=#8b5cf6] shoots with that accent color (file names get -accent-<hex>); without it settings reset to defaults.
//   [--with=<.xpi or dir>] also installs another extension, e.g. uBlock Origin so no ads land in the shots (repeatable).
// Run `npm run build` first. Signed-in pages need --profile (close any Firefox using it). Video stays muted.
import puppeteer from 'puppeteer-core';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const profile = flag('profile')?.replace(/^~(?=\/)/, homedir());
const out = flag('out') ?? 'samples/shots';
const only = flag('only')?.split(',');
const light = process.argv.includes('--light');
const accent = flag('accent');

// Copy of dist/ whose background script writes the Kempt settings first (Collections live under other keys, untouched).
async function withSettings() {
  const dir = await mkdtemp(join(tmpdir(), 'kyt-shots-'));
  await cp(resolve('dist'), dir, { recursive: true });
  let manifest;
  try { manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')); }
  catch (e) { throw new Error('dist/manifest.json missing or broken: run `npm run build` first', { cause: e }); }
  manifest.background = { scripts: ['kyt-set.js'] };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest));
  const options = accent ? { 'accent.color': accent } : {};
  await writeFile(join(dir, 'kyt-set.js'), `chrome.storage.sync.set({ 'kempt-yt': { features: {}, options: ${JSON.stringify(options)} } });`);
  return dir;
}

const pause = () => document.querySelectorAll('video').forEach((v) => { v.muted = true; v.pause(); });
// Seeks to a frame with picture and shows the controls, for watch-page shots.
async function atFrame(page, t) {
  await page.evaluate((t) => {
    const v = document.querySelector('#movie_player video');
    if (v) { v.muted = true; v.currentTime = t; v.pause(); }
  }, t);
  // Wait for the seeked frame to decode (a Short can take several seconds), up to 15s.
  await page.waitForFunction(() => (document.querySelector('#movie_player video')?.readyState ?? 4) >= 2, { timeout: 15_000 }).catch(() => {});
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
  sidebar: {
    url: 'https://www.youtube.com/',
    setup: async (p) => {
      await p.evaluate(pause);
      // Opens Subscriptions and Collections; the open set is saved, so close them after.
      await p.evaluate(() => document.querySelectorAll('.kyt-nav-item:not([open]) > .kyt-nav-row .kyt-nav-arrow').forEach((a) => /^(Subscriptions|Collections)$/.test(a.ariaLabel) && a.click()));
      await sleep(1200);
    },
    after: async (p) => p.evaluate(() => { const a = [...document.querySelectorAll('.kyt-nav-item[open] > .kyt-nav-row .kyt-nav-arrow')]; a.forEach((b) => b.click()); }),
  },
  shorts: {
    // A Shorts link opens in the normal player: take the first Short from a channel's Shorts tab and open it.
    url: 'https://www.youtube.com/@GugaFoods/shorts',
    setup: async (p) => {
      const href = await p.evaluate(() => document.querySelector('a[href^="/shorts/"]')?.href);
      if (!href) return;
      await p.goto(href, { waitUntil: 'load' });
      await sleep(8000);
      await atFrame(p, 3);
    },
  },
  // Collections tab. Creates the groups below through the UI the first time (storage.sync keeps them in the profile);
  // channels the account doesn't follow are skipped.
  collections: {
    url: 'https://www.youtube.com/feed/subscriptions#collections',
    setup: async (p) => {
      await p.evaluate(pause);
      await p.evaluate(async (groups) => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        for (const [name, channels] of Object.entries(groups)) {
          if ([...document.querySelectorAll('.kyt-col-name')].some((h) => h.textContent === name)) continue;
          document.querySelector('.kyt-col-new')?.click();
          await wait(400);
          const input = document.querySelector('.kyt-col-input');
          input.value = name;
          input.form.requestSubmit();
          await wait(3000); // the picker loads /feed/channels
          for (const row of document.querySelectorAll('.kyt-col-pick-row')) {
            const box = row.querySelector('input');
            if (channels.includes(row.dataset.name) && !box.checked) box.click();
          }
          await wait(400);
          document.querySelector('.kyt-col-pick .kyt-subs-yes')?.click();
          await wait(600);
        }
      }, {
        Science: ['Kurzgesagt – In a Nutshell', 'Vsauce', 'NileRed', 'Cleo Abram', 'Astrum', 'Cool Worlds'],
        History: ['OverSimplified', 'Historically', 'Curious Archive', 'BritMonkey'],
        Tech: ['Fireship', 'The PrimeTime', 'HTX Studio', 'Juxtopposed'],
        Outdoors: ['Outdoor Boys', 'Xander Budnick', 'Magnus Midtbø'],
      });
      await sleep(1500);
    },
  },
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
  await browser.installExtension(await withSettings());
  for (const a of process.argv.filter((a) => a.startsWith('--with='))) await browser.installExtension(resolve(a.slice(7).replace(/^~(?=\/)/, homedir())));
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  for (const [name, { url, setup, after }] of Object.entries(SHOTS)) {
    if (only && !only.includes(name)) continue;
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.bringToFront();
    await sleep(8000);
    // A fresh profile may have the guide collapsed; open it once (YouTube remembers) so browse pages show the full guide.
    if (await page.evaluate(() => !location.pathname.startsWith('/watch') && document.querySelector('ytd-app')?.hasAttribute('mini-guide-visible'))) {
      await page.click('#guide-button');
      await sleep(1000);
    }
    await setup(page);
    await page.mouse.move(1439, 899); // no hover state on the shot
    await sleep(800);
    const path = join(out, `${name}${light ? '-light' : ''}${accent ? `-accent-${accent.replace('#', '')}` : ''}.png`);
    await page.screenshot({ path });
    console.log(`saved ${path}`);
    await after?.(page);
  }
} finally { await browser.close(); }
