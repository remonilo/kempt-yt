// Bundles TS entries, concatenates CSS (tokens + every features/*/style.css), copies statics into dist/.
import * as esbuild from 'esbuild';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';

const dev = process.argv.includes('--watch');
const out = 'dist';

async function css() {
  const dirs = (await readdir('src/features', { withFileTypes: true })).filter((d) => d.isDirectory());
  const files = ['src/theme/tokens.css', 'src/theme/icons.css', ...dirs.map((d) => `src/features/${d.name}/style.css`)];
  const parts = await Promise.all(files.map((f) => readFile(f, 'utf8').catch(() => '')));
  await writeFile(`${out}/content.css`, parts.join('\n'));
}

async function statics() {
  await mkdir(out, { recursive: true });
  await cp('manifest.json', `${out}/manifest.json`);
  await cp('src/popup/popup.html', `${out}/popup.html`);
  await css();
}

const ctx = await esbuild.context({
  entryPoints: { content: 'src/content.ts', 'main-world': 'src/main-world.ts', popup: 'src/popup/popup.ts' },
  bundle: true,
  outdir: out,
  format: 'iife',
  target: ['chrome120', 'firefox128'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  logLevel: 'info',
  plugins: [{ name: 'statics', setup: (b) => b.onEnd(statics) }],
});

if (dev) {
  await ctx.watch();
  watch('src', { recursive: true }, (_, f) => f?.endsWith('.css') && css());
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
