// Bundles TS entries, concatenates CSS (tokens + every features/*/style.css), copies statics into dist/.
import * as esbuild from 'esbuild';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

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
  plugins: [
    { name: 'statics', setup: (b) => b.onEnd(statics) },
    {
      // SVGs as base64 data URIs. esbuild's dataurl loader doesn't encode quotes or #, so
      // clip-path="url(#...)" and viewBox="0 0 24 24" break the string.
      name: 'svg-b64',
      setup(b) {
        b.onResolve({ filter: /\.svg$/ }, (args) => ({
          path: resolve(args.resolveDir, args.path), namespace: 'svg',
        }));
        b.onLoad({ filter: /.*/, namespace: 'svg' }, async (args) => {
          const raw = await readFile(args.path);
          return { contents: `export default "data:image/svg+xml;base64,${raw.toString('base64')}"`, loader: 'js' };
        });
      },
    },
    {
      // `import BUILD from 'kyt:build'`: unique per build, so a stale main-world.js left in a tab by an
      // extension reload (Firefox keeps them) can't answer the new content.js's bridge calls.
      name: 'build-id',
      setup(b) {
        let id = '';
        b.onStart(() => { id = Date.now().toString(36); });
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
