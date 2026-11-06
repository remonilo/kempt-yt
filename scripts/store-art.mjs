// Store images from the screenshot masters: five 1280x800 screenshots, the 440x280 small promo tile and the
// 1400x560 marquee, rendered from HTML in headless Firefox so the type matches the extension (Plus Jakarta Sans).
// usage: node scripts/store-art.mjs [--in=samples/shots] [--out=store] [--plain]
//   --plain writes the screenshots full bleed (no caption bar), the other proposal.
// Masters come from scripts/shots.mjs (signed in, 2880x1800), scripts/captions-shot.js and scripts/popup-shot.mjs.
import puppeteer from 'puppeteer-core';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const src = resolve(flag('in') ?? 'samples/shots');
const out = flag('out') ?? 'store';
const plain = process.argv.includes('--plain');
const url = (p) => pathToFileURL(resolve(p)).href;
const shot = (name) => pathToFileURL(join(src, `${name}.png`)).href;
const ACCENT = '#cb274a';

const base = `
  @font-face { font-family: Jakarta; src: url(${url('src/fonts/plus-jakarta-sans-latin.woff2')}); font-weight: 200 800; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: Jakarta, sans-serif; color: #f1f1f1; background: #0f0f0f; overflow: hidden; -webkit-font-smoothing: antialiased; }
  .glow { position: absolute; inset: 0; background: radial-gradient(60% 70% at 50% 0%, color-mix(in srgb, ${ACCENT} 32%, transparent), transparent 70%); }
`;

// Caption bar on top, the shot below with rounded top corners, cut off by the bottom edge like a window rising out.
const captioned = (title, sub, img, { pos = 'top', crop = '', style = '' } = {}) => `
  <style>${base}
    body { width: 1280px; height: 800px; position: relative; }
    header { position: relative; text-align: center; padding-top: 46px; }
    h1 { font-size: 46px; font-weight: 700; letter-spacing: -0.02em; }
    p { margin-top: 10px; font-size: 21px; color: #b8b8b8; font-weight: 500; }
    .shot { position: absolute; left: 80px; right: 80px; top: 196px; height: 640px; border-radius: 16px 16px 0 0; overflow: hidden;
      box-shadow: 0 0 0 1px #ffffff1f, 0 30px 80px #000c; background: url(${img}) ${pos} / ${crop || 'cover'} no-repeat; ${style} }
  </style>
  <div class="glow"></div><header><h1>${title}</h1><p>${sub}</p></header><div class="shot"></div>`;

const full = (img) => `<style>${base} body { width: 1280px; height: 800px; background: url(${img}) center / cover; }</style>`;

const SHOTS = [
  ['1-home', 'YouTube, kept tidy', 'One accent color, one icon set, one font across the whole site.', shot('home')],
  ['2-watch', 'Comments one click away', 'Info, comments and up next share one panel beside the player.', shot('comments')],
  ['3-captions', 'Subtitles you can read', 'Clean captions in your font, sized to the player.', shot('captions-player'), { pos: 'bottom', style: 'height: auto; bottom: 0; border-radius: 16px 16px 0 0' }],
  ['4-subscriptions', 'Your feed, by day', 'Subscriptions on a timeline, with filters and search.', shot('subs')],
  ['5-settings', 'Every change is a switch', 'Turn anything off in the popup. YouTube comes back at once.', null],
];

// The popup over a dimmed Home shot, for the last screenshot.
const popupOver = (title, sub) => `
  <style>${base}
    body { width: 1280px; height: 800px; position: relative; }
    .bg { position: absolute; inset: 0; background: url(${shot('home')}) center / cover; filter: brightness(0.22) blur(6px); }
    .glow { opacity: 0.6; }
    .text { position: absolute; left: 96px; top: 0; bottom: 0; width: 520px; display: flex; flex-direction: column; justify-content: center; }
    h1 { font-size: 52px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
    p { margin-top: 18px; font-size: 22px; color: #c4c4c4; font-weight: 500; line-height: 1.45; }
    .pop { position: absolute; right: 120px; top: 70px; width: 396px; height: 660px; border-radius: 14px; overflow: hidden;
      background: url(${shot('popup')}) top / 100% auto no-repeat #1b1b1b; box-shadow: 0 0 0 1px #ffffff26, 0 30px 90px #000; }
  </style>
  <div class="bg"></div><div class="glow"></div>
  <div class="text"><h1>${title}</h1><p>${sub}</p></div><div class="pop"></div>`;

const icon = url('src/brand/128.png');
const tile = `
  <style>${base}
    body { width: 440px; height: 280px; position: relative; background: #131313; }
    .glow { background: radial-gradient(80% 90% at 50% 0%, color-mix(in srgb, ${ACCENT} 45%, transparent), transparent 75%); }
    .c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
    img { width: 84px; height: 84px; }
    h1 { font-size: 34px; font-weight: 800; letter-spacing: -0.02em; }
    p { font-size: 15px; color: #c8c8c8; font-weight: 500; margin-top: -8px; }
  </style>
  <div class="glow"></div><div class="c"><img src="${icon}"><h1>Kempt</h1><p>A tidy redesign for YouTube</p></div>`;

const marquee = `
  <style>${base}
    body { width: 1400px; height: 560px; position: relative; background: #111; }
    .glow { background: radial-gradient(50% 90% at 20% 50%, color-mix(in srgb, ${ACCENT} 30%, transparent), transparent 75%); }
    .text { position: absolute; left: 90px; top: 0; bottom: 0; width: 470px; display: flex; flex-direction: column; justify-content: center; }
    img { width: 72px; height: 72px; margin-bottom: 26px; }
    h1 { font-size: 54px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
    p { margin-top: 16px; font-size: 21px; color: #c4c4c4; font-weight: 500; line-height: 1.45; }
    .shot { position: absolute; left: 610px; top: 70px; width: 900px; height: 562px; border-radius: 14px 0 0 0; overflow: hidden;
      background: url(${shot('comments')}) left top / cover; box-shadow: 0 0 0 1px #ffffff1f, 0 30px 80px #000; }
  </style>
  <div class="glow"></div>
  <div class="text"><img src="${icon}"><h1>YouTube,<br>kept tidy.</h1><p>One accent, one icon set, comments beside the player and a feed sorted by day. Every change is a switch.</p></div>
  <div class="shot"></div>`;

await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox', headless: true });
try {
  const page = await browser.newPage();
  const render = async (name, html, width, height) => {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    // about:blank can't load file:// images, so each page is written next to the output and opened from disk.
    const file = join(out, '.render.html');
    await writeFile(file, `<!doctype html><meta charset="utf-8">${html}`);
    await page.goto(url(file), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const path = join(out, `${name}.png`);
    await page.screenshot({ path });
    console.log(`saved ${path}`);
  };
  for (const [name, title, sub, img, opts] of SHOTS) {
    const html = img ? (plain ? full(img) : captioned(title, sub, img, opts)) : popupOver(title, sub);
    await render(`screenshot-${name}${plain ? '-plain' : ''}`, html, 1280, 800);
  }
  if (!plain) {
    await render('promo-small-440x280', tile, 440, 280);
    await render('promo-marquee-1400x560', marquee, 1400, 560);
  }
} finally {
  await browser.close();
  await rm(join(out, '.render.html'), { force: true });
}
