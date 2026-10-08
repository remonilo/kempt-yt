// Bundles TS entries, concatenates CSS (tokens + every features/*/style.css), copies statics into dist/.
import * as esbuild from 'esbuild';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { watch } from 'node:fs';

const dev = process.argv.includes('--watch');
const out = 'dist';

async function css() {
  // Sorted: readdir order is filesystem-dependent (Linux ext4 isn't alphabetical), and order is cascade order.
  const dirs = (await readdir('src/features', { withFileTypes: true })).filter((d) => d.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1));
  const files = ['src/theme/tokens.css', ...dirs.map((d) => `src/features/${d.name}/style.css`)];
  const parts = await Promise.all(files.map((f) => readFile(f, 'utf8').catch(() => '')));
  await writeFile(`${out}/content.css`, parts.join('\n'));
}

async function statics() {
  await mkdir(out, { recursive: true });
  await cp('manifest.json', `${out}/manifest.json`);
  await cp('src/popup/popup.html', `${out}/popup.html`);
  await cp('src/popup/popup.css', `${out}/popup.css`);
  await cp('src/icons', `${out}/icons`, { recursive: true }); // loaded by name, see core/icon.ts
  await cp('src/brand', `${out}/brand`, { recursive: true });
  await cp('src/fonts', `${out}/fonts`, { recursive: true }); // features/font, see scripts/fetch-fonts.mjs
  await css();
}

if (!dev) await rm(out, { recursive: true, force: true }); // no stale files from older builds in the package

const ctx = await esbuild.context({
  entryPoints: { content: 'src/content.ts', 'main-world': 'src/main-world.ts', popup: 'src/popup/popup.ts' },
  bundle: true,
  outdir: out,
  format: 'iife',
  target: ['chrome120', 'firefox128'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  logLevel: 'info',
  plugins: [
    { name: 'statics', setup: (b) => b.onEnd(statics) },
    {
      // `import BUILD from 'kyt:build'`: changes with the code, so a stale main-world.js left in a tab by an
      // extension reload (Firefox keeps them) can't answer the new content.js's bridge calls. A hash of src/
      // rather than a timestamp, so AMO reviewers rebuilding the source zip get the same bytes.
      name: 'build-id',
      setup(b) {
        let id = '';
        b.onStart(async () => {
          const h = createHash('sha256');
          for (const f of (await readdir('src', { recursive: true, withFileTypes: true })).filter((e) => e.isFile() && e.name !== '.DS_Store').map((e) => `${e.parentPath}/${e.name}`).sort()) {
            h.update(f.replaceAll('\\', '/')).update(await readFile(f));
          }
          id = h.digest('hex').slice(0, 10);
        });
        b.onResolve({ filter: /^kyt:build$/ }, () => ({ path: 'build', namespace: 'kyt' }));
        b.onLoad({ filter: /.*/, namespace: 'kyt' }, () => ({ contents: `export default ${JSON.stringify(id)}` }));
      },
    },
  ],
});

if (dev) {
  await ctx.watch();
  watch('src', { recursive: true }, (_, f) => f?.endsWith('.css') && css());
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
