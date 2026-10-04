// Bundles TS entries, concatenates CSS (tokens + every features/*/style.css), copies statics into dist/.
import * as esbuild from 'esbuild';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';

const dev = process.argv.includes('--watch');
const out = 'dist';

async function css() {
  const dirs = (await readdir('src/features', { withFileTypes: true })).filter((d) => d.isDirectory());
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
