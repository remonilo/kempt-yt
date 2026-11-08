// Layered PhotoCraft files for the store screenshots and promo tiles, to design by hand.
// Each file: #0f0f0f background, the current store-art render as a hidden "Reference" layer, the raw screenshot
// masters as smart objects, and the headline text as editable type (Plus Jakarta Sans, installed system-wide).
// Every file also gets the brand art from <out>/assets (icon-1024.png and lockup-{dark,light}.png, 2x exports of the
// VectorCraft artboards in ~/Documents/VectorCraft/kempt-branding.vectorcraft); hidden unless the design uses it.
// usage: node scripts/store-pcraft.mjs [--in=samples/shots] [--out=~/Documents/PhotoCraft/kempt-store] [--force]
//   Creates only missing files; --force rebuilds them all (overwrites hand-made designs).
// node scripts/store-pcraft.mjs --export exports the finished designs to store/*.png, the files the stores get.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const src = resolve(flag('in') ?? 'samples/shots');
const out = (flag('out') ?? '~/Documents/PhotoCraft/kempt-store').replace(/^~(?=\/)/, homedir());
const CLI = '/Applications/PhotoCraft.app/Contents/MacOS/photocraft-cli';

const place = (path, scale, name, extra = {}) => [
  ['file.placeEmbedded', { path, scale, smartObject: true, ...extra }],
  ['layer.setProps', { name }],
];
const asset = (file) => join(out, 'assets', file);
const hide = [['layer.setProps', { visible: false }]];
// Icon 1024 placed at `size` px; lockups 2800x1000 placed at 1400 wide, centred.
const icon = (size, center, name = 'Icon') => place(asset('icon-1024.png'), size / 10.24, name, { center });
const brand = (w, h) => [...icon(128, [w / 2, h / 2], 'Icon (spare)'), ...hide,
  ...place(asset('lockup-dark.png'), 50, 'Lockup dark', { center: [w / 2, h / 2] }), ...hide,
  ...place(asset('lockup-light.png'), 50, 'Lockup light', { center: [w / 2, h / 2] }), ...hide];
const reference = (file) => [...place(resolve('store', file), 100, 'Reference (current render)'), ['layer.setProps', { visible: false }]];
const master = (name, name2 = `Screenshot ${name} (2880x1800 master)`) => place(join(src, `${name}.png`), 100 * 1280 / 2880, name2);
const text = (name, text, x, y, size, wght, color, align = 'center') =>
  [['type.create', { name, text, x, y, size, align, color, font: 'Plus Jakarta Sans', variations: { wght } }]];
const headline = (title, sub) => [...text('Title', title, 640, 84, 46, 700, '#f1f1f1'), ...text('Subtitle', sub, 640, 126, 21, 500, '#b8b8b8')];

const FILES = {
  'screenshot-1-home': [1280, 800, [...reference('screenshot-1-home.png'),
    ...['3b82f6', '22c55e', 'f97316'].flatMap((c) => master(`home-accent-${c}`, `Screenshot home, accent #${c} (2880x1800 master)`)),
    ...headline('Your accent color', 'Chips, tabs, the progress bar and Subscribe use the color you pick.')]],
  'screenshot-2-watch': [1280, 800, [...reference('screenshot-2-watch.png'), ...master('comments'),
    ...headline('Tabs beside the video', 'Info, Comments, Videos and Live chat share one panel next to the player.')]],
  'screenshot-3-subscriptions': [1280, 800, [...reference('screenshot-3-subscriptions.png'), ...master('subs-light'),
    ...headline('Subscriptions by date', 'Videos under date headers, with type filters and search.')]],
  'screenshot-4-collections': [1280, 800, [...reference('screenshot-4-collections.png'), ...master('collections'),
    ...headline('Collections', 'Group channels into feeds of their own.')]],
  'screenshot-5-settings': [1280, 800, [...reference('screenshot-5-settings.png'), ...master('home'),
    ...place(resolve('site/src/assets/screenshots/popup.png'), 100 / 3, 'Popup (360x600 @3x)', { center: [980, 400] }),
    ...text('Title', 'Settings popup', 96, 380, 52, 700, '#f1f1f1', 'left'),
    ...text('Subtitle', 'Each feature turns off on its own, without a reload.', 96, 428, 22, 500, '#c4c4c4', 'left')]],
  'promo-small-440x280': [440, 280, [...reference('promo-small-440x280.png'),
    ...icon(96, [220, 104]),
    ...text('Wordmark', 'Kempt', 220, 200, 34, 800, '#f1f1f1'), ...text('Tagline', 'for YouTube', 220, 230, 15, 500, '#c8c8c8')]],
  'promo-marquee-1400x560': [1400, 560, [...reference('promo-marquee-1400x560.png'),
    ...place(join(src, 'comments.png'), 25, 'Screenshot comments (2880x1800 master)', { center: [990, 280] }),
    ...icon(64, [132, 220]),
    ...text('Wordmark', 'Kempt', 100, 300, 52, 800, '#f1f1f1', 'left'),
    ...text('Tagline', 'Restyles YouTube in your accent color.', 100, 342, 20, 500, '#c8c8c8', 'left')]],
};

if (process.argv.includes('--export')) {
  for (const name of Object.keys(FILES)) {
    execFileSync(CLI, ['convert', join(out, `${name}.pcraft`), resolve('store', `${name}.png`)], { stdio: 'ignore' });
    console.log(`exported store/${name}.png`);
  }
  process.exit();
}
mkdirSync(out, { recursive: true });
for (const [name, [width, height, cmds]] of Object.entries(FILES)) {
  if (existsSync(join(out, `${name}.pcraft`)) && !process.argv.includes('--force')) { console.log(`kept ${name}.pcraft`); continue; }
  const args = ['run', '--new', JSON.stringify({ width, height, background: '#0f0f0f', name })];
  for (const [cmd, params] of [...cmds, ...brand(width, height)]) args.push('--cmd', cmd, '--params', JSON.stringify(params));
  execFileSync(CLI, [...args, '--out', join(out, `${name}.pcraft`)], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`saved ${join(out, `${name}.pcraft`)}`);
}
