// Dev check: real YouTube caption windows in headless Chromium (Helium). Headless gets an empty timedtext body,
// so this answers it with a fake auto-caption (rollup) track. Firefox never requests timedtext headless.
// usage: node scripts/captions-chrome.mjs <watch url> <eval.js> [module.mjs]
//   eval.js is an async function body run in the page (turn captions on there: player.setOption('captions', 'track', ...)).
//   module.mjs default-exports async (page) => {} for mouse work (e.g. dragging the caption). Logs starting "DBG" are printed.
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
const words = 'so today we are going to talk about something that matters a lot to everyone in this room and beyond it'.split(' ');
const events = [{ tStartMs: 0, dDurationMs: 3600000, id: 1, wpWinPosId: 1, wsWinStyleId: 1 }];
for (let t = 0, n = 0; t < 600000; t += 3200, n++) {
  events.push({ tStartMs: t, dDurationMs: 6400, wWinId: 1, segs: Array.from({ length: 8 }, (_, k) => ({ utf8: (k ? ' ' : '') + words[(n * 8 + k) % words.length], tOffsetMs: k * 400 })) });
  events.push({ tStartMs: t + 3199, dDurationMs: 3201, wWinId: 1, aAppend: 1, segs: [{ utf8: '\n' }] });
}
const json3 = JSON.stringify({ wireMagic: 'pb3', pens: [{}], wsWinStyles: [{}, { mhModeHint: 2, juJustifCode: 0, sdScrollDir: 3 }],
  wpWinPositions: [{}, { apPoint: 6, ahHorPos: 20, avVerPos: 100, rcRows: 2, ccCols: 32 }], events });
const b = await puppeteer.launch({ executablePath: '/Applications/Helium.app/Contents/MacOS/Helium', headless: 'new',
  args: ['--disable-extensions-except=' + process.cwd() + '/dist', '--load-extension=' + process.cwd() + '/dist', '--mute-audio', '--window-size=1400,900', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1400, height: 900 }, userDataDir: '/tmp/kyt-chrome-profile' });
const page = await b.newPage();
await page.setRequestInterception(true);
page.on('request', (r) => /\/api\/timedtext/.test(r.url()) ? r.respond({ status: 200, contentType: 'application/json', body: json3 }) : r.continue());
page.on('console', (m) => m.text().startsWith('DBG') && console.log(m.text()));
await page.goto(process.argv[2], { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 6000));
console.log(await page.evaluate(`(async () => { ${await readFile(process.argv[3], 'utf8')} })()`));
if (process.argv[4]) { const m = await import(process.argv[4]); await m.default(page); }
await page.screenshot({ path: 'samples/captions-chrome.png' });
await b.close();
