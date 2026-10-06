// Adds Hugeicons (free, MIT) to src/icons/ for the glyphs the Figma set lacks. Juxtopposed's Figma icons are
// Hugeicons-style 1.5px strokes, so Stroke Rounded matches. Runs after fetch-icons.mjs (which empties the folder).
// Run: node scripts/fetch-hugeicons.mjs
// Try candidates: node scripts/fetch-hugeicons.mjs --out=/tmp/hi PlayList Sparkles   (names from hugeicons.com, no "Icon")
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const VERSION = '4.3.5';
// Hugeicons glyphs span ~20px of the 24px box, Figma's ~16-18px, so at the same stroke they read bigger and bolder.
// Shrink the glyph and raise stroke-width to keep the 1.5px line.
const SCALE = 0.85;

/** Our file name -> Hugeicons component name (without "Icon"). */
const ICONS = {
  ask: 'AiMagic', // Ask (YouTube's SPARK)
  thanks: 'DollarCircle', // Thanks (YouTube's MONEY_HEART)
  movies: 'Clapperboard',
  memberships: 'StarCircle',
  podcasts: 'Podcast',
  shopping: 'ShoppingBag01',
  help: 'HelpCircle',
  feedback: 'MessageSquareWarning',
  'your-videos': 'VideoReplay',
  text: 'TextFont', // popup: Font
  // Account menu (masthead avatar)
  'switch-account': 'UserSwitch',
  'sign-out': 'Logout02',
  studio: 'Youtube', // YouTube Studio
  'your-data': 'ShieldUser',
  appearance: 'Moon02',
  language: 'Languages',
  restricted: 'UserSettings01', // Restricted Mode
  globe: 'Globe02', // Location (Figma's `location` is a filled globe, heavier than the rest)
};

const args = process.argv.slice(2);
const out = args.find((a) => a.startsWith('--out='))?.slice(6) ?? 'src/icons';
const picked = args.filter((a) => !a.startsWith('--'));
const list = picked.length ? Object.fromEntries(picked.map((n) => [n, n])) : ICONS;

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The module is `const X = [["path", { d: "...", strokeWidth: "1.5", key: "0" }], ...]`: read it as text. */
async function svg(name) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/@hugeicons/core-free-icons@${VERSION}/dist/esm/${name}Icon.js`);
  if (!res.ok) throw new Error(`${res.status} ${name}: no such Hugeicons icon`);
  const els = [...(await res.text()).matchAll(/\["(\w+)",\s*\{([^}]*)\}\]/g)].map(([, tag, props]) => {
    const attrs = [...props.matchAll(/(\w+):\s*"([^"]*)"/g)].filter(([, k]) => k !== 'key')
      .map(([m, k, v]) => [m, k, k === 'strokeWidth' ? String(+(Number(v) / SCALE).toFixed(2)) : v]);
    return `<${tag}${attrs.map(([, k, v]) => ` ${kebab(k)}="${v}"`).join('')}/>`;
  });
  if (!els.length) throw new Error(`${name}: unexpected module format`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><g transform="translate(12 12) scale(${SCALE}) translate(-12 -12)">${els.join('')}</g></svg>\n`;
}

await mkdir(out, { recursive: true });
for (const [file, name] of Object.entries(list)) {
  const path = `${out}/${file}.svg`;
  // Figma exports fill white; ours stroke currentColor. Never overwrite a Figma icon.
  const prev = await readFile(path, 'utf8').catch(() => null);
  if (prev && !prev.includes('stroke="currentColor"')) throw new Error(`${path} is a Figma icon; pick another name`);
  await writeFile(path, await svg(name));
}
console.log(`wrote ${Object.keys(list).length} Hugeicons to ${out}/`);
