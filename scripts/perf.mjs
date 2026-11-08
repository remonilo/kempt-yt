// Measures what Kempt costs: CPU time of headless Firefox with Kempt off and on, per page.
// usage: node scripts/perf.mjs [--runs=3] [--secs=30] [--profile=~/.kempt-ff] [--pages=home,watch,subs]
// Run `npm run build` first. Subscriptions needs --profile (a signed-in profile; close any Firefox using it).
// Per run: a fresh browser loads the page (load window: navigation + 10 s), then sits for --secs (steady window). The
// watch page plays muted with the player controls forced visible, since most player animations only run while they show.
// "content" sums the web content processes (-isForBrowser), where page scripts, style and layout run; "total" adds the
// parent, GPU and media processes (video decoding swamps it on watch pages). Off and on runs alternate to spread drift.
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const runs = Number(flag('runs') ?? 3);
const secs = Number(flag('secs') ?? 30);
const profile = flag('profile')?.replace(/^~(?=\/)/, homedir());
const PAGES = {
  home: 'https://www.youtube.com/',
  watch: 'https://www.youtube.com/watch?v=GdzdAWAU9WY',
  subs: 'https://www.youtube.com/feed/subscriptions',
};
const pages = (flag('pages') ?? (profile ? 'home,watch,subs' : 'home,watch')).split(',');

// "1:02.34" or "0:05.10" (ps TIME) to seconds.
const seconds = (t) => t.split(':').reduce((n, p) => n * 60 + Number(p), 0);

function ps() {
  try {
    return execSync('ps -A -o pid=,ppid=,time=,command=').toString();
  } catch (e) {
    throw new Error(`ps failed (macOS/Linux only): ${e.message}`);
  }
}

function cpu(root) {
  const rows = ps().trim().split('\n').map((l) => {
    const [, pid, ppid, time, cmd] = l.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/) ?? [];
    return { pid: Number(pid), ppid: Number(ppid), t: seconds(time ?? '0'), cmd: cmd ?? '' };
  });
  const kids = rows.filter((r) => r.ppid === root);
  return {
    content: kids.filter((r) => r.cmd.includes('-isForBrowser')).reduce((n, r) => n + r.t, 0),
    total: kids.reduce((n, r) => n + r.t, rows.find((r) => r.pid === root)?.t ?? 0),
  };
}

async function measure(url, on) {
  const browser = await puppeteer.launch({
    browser: 'firefox', executablePath: '/Applications/Firefox.app/Contents/MacOS/firefox', headless: true,
    ...(profile && { userDataDir: profile }),
    extraPrefsFirefox: { 'ui.systemUsesDarkTheme': 1, 'media.volume_scale': '0.0' }, // always muted
  });
  try {
    if (on) await browser.installExtension(resolve('dist'));
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    const pid = browser.process().pid;
    await sleep(2000); // let startup and the extension's install settle before the first sample
    const t0 = cpu(pid);
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.bringToFront();
    await sleep(10_000);
    // Signed-in Home sometimes autoplays a card's inline preview on its own; it costs ~10 s per 30 s and lands at
    // random, so feed pages keep it paused in both modes.
    if (!url.includes('/watch')) await page.evaluate(() => {
      const stop = (v) => v.closest('ytd-video-preview') && v.pause();
      document.addEventListener('play', (e) => stop(e.target), true);
      document.querySelectorAll('video').forEach(stop);
    });
    if (url.includes('/watch')) {
      await page.addStyleTag({ content: '.ytp-chrome-bottom { opacity: 1 !important }' });
      await page.evaluate(() => { const v = document.querySelector('video'); if (v) { v.muted = true; v.play(); } });
    }
    const t1 = cpu(pid);
    await sleep(secs * 1000);
    const t2 = cpu(pid);
    const signedIn = await page.evaluate(() => !!document.querySelector('ytd-guide-entry-renderer a[href="/feed/subscriptions"] + *, ytd-topbar-menu-button-renderer #avatar-btn'));
    return { load: t1.content - t0.content, steady: t2.content - t1.content, total: t2.total - t1.total, signedIn };
  } finally { await browser.close(); }
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const f = (n) => n.toFixed(2);
console.log(`${runs} runs per cell, steady window ${secs} s, ${profile ? 'signed-in profile' : 'logged out'}. Medians, CPU seconds.`);
console.log('page   | kempt | load (content) | steady (content) | steady (total)');
for (const name of pages) {
  const res = { off: [], on: [] };
  for (let i = 0; i < runs; i++) {
    for (const on of i % 2 ? [true, false] : [false, true]) {
      const r = await measure(PAGES[name], on);
      if (profile && !r.signedIn) console.warn(`warning: ${name} run looks signed out`);
      res[on ? 'on' : 'off'].push(r);
    }
  }
  for (const k of ['off', 'on']) {
    const rs = res[k];
    console.log(`${name.padEnd(6)} | ${k.padEnd(5)} | ${f(median(rs.map((r) => r.load))).padStart(14)} | ${f(median(rs.map((r) => r.steady))).padStart(16)} | ${f(median(rs.map((r) => r.total))).padStart(14)}`);
  }
}
