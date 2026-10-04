// Exports the Figma "Icons" component set to src/icons/*.svg, then drops icons no source file names.
// Needs FIGMA_TOKEN in .env (File content: read-only). Run: node scripts/fetch-icons.mjs
// Prune only (no Figma): node scripts/fetch-icons.mjs --prune
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';

const FILE = '67JrsVl1sPE1qzZZL0iuNG';
const SET = '9:8208';
const OUT = 'src/icons';

/** Deletes icons that no .ts/.css file under src/ names. `<name>-selected` stays if `<name>` is named
 *  (the sidebar builds it from the base name). Over-keeping a few files is fine; a missing icon is not. */
async function prune() {
  const files = (await readdir('src', { recursive: true }))
    .filter((f) => /\.(ts|css)$/.test(f) && !f.startsWith('icons/')).map((f) => readFile(`src/${f}`, 'utf8'));
  const words = new Set((await Promise.all(files)).join('\n').match(/[a-z0-9]+(?:-[a-z0-9]+)*/g));
  const gone = (await readdir(OUT)).map((f) => f.slice(0, -4))
    .filter((n) => !words.has(n) && !(n.endsWith('-selected') && words.has(n.slice(0, -9))));
  await Promise.all(gone.map((n) => rm(`${OUT}/${n}.svg`)));
  console.log(`pruned ${gone.length} unused icons: ${gone.join(' ')}`);
}
if (process.argv.includes('--prune')) {
  await prune();
  process.exit();
}

const env = await readFile('.env', 'utf8').catch(() => '');
const token = process.env.FIGMA_TOKEN ?? env.match(/^FIGMA_TOKEN=(.+)$/m)?.[1]?.trim();
if (!token) throw new Error('FIGMA_TOKEN missing (.env or env var)');

const api = async (path) => {
  const res = await fetch(`https://api.figma.com/v1/${path}`, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`);
  return res.json();
};

const kebab = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "Property 1=Home, Selected=Yes, Disabled=No, Quality=Default, Direction=Default" -> "home-selected"
const fileName = (variant) => {
  const p = Object.fromEntries(variant.split(', ').map((kv) => kv.split('=')));
  return [
    kebab(p['Property 1']),
    p.Quality !== 'Default' && kebab(p.Quality),
    p.Direction !== 'Default' && kebab(p.Direction),
    p.Selected === 'Yes' && 'selected',
    p.Disabled === 'Yes' && 'disabled',
  ].filter(Boolean).join('-');
};

const set = (await api(`files/${FILE}/nodes?ids=${SET}`)).nodes[SET].document;
const icons = set.children.map((c) => ({ id: c.id, name: fileName(c.name) }));

const dupes = icons.filter((a, i) => icons.findIndex((b) => b.name === a.name) !== i);
if (dupes.length) throw new Error(`duplicate names: ${dupes.map((d) => d.name).join(', ')}`);

const { images } = await api(`images/${FILE}?ids=${icons.map((i) => i.id).join(',')}&format=svg&svg_outline_text=true`);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
// Saved as exported: icons are CSS masks (core/icon.ts), so only alpha matters, not the white fill.
await Promise.all(icons.map(async ({ id, name }) => {
  const res = await fetch(images[id]);
  return writeFile(`${OUT}/${name}.svg`, await res.text());
}));
console.log(`exported ${icons.length} icons to ${OUT}/`);
await prune();
