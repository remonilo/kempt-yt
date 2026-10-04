// Guards the conventions a new feature must follow (see docs/internals/adding-a-feature), so a mistake fails `npm test`
// instead of leaking CSS into YouTube with the feature off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const dirs = readdirSync('src/features', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const registry = readFileSync('src/features/index.ts', 'utf8');

test('every feature folder is registered, and its id is the folder name', () => {
  for (const dir of dirs) {
    const src = readFileSync(`src/features/${dir}/index.ts`, 'utf8');
    const name = src.match(/export const (\w+): Feature = \{/)?.[1];
    assert.ok(name, `${dir}/index.ts exports no Feature`);
    assert.match(src, new RegExp(`id: '${dir}'`), `${dir}: id must be '${dir}'`);
    assert.match(registry, new RegExp(`from './${dir}/index.ts'`), `${dir} is not imported in features/index.ts`);
    assert.match(registry.split('export const features')[1], new RegExp(`\\b${name}\\b`), `${name} is missing from the features list`);
  }
});

/** Top-level selectors of a stylesheet (inside @media/@supports too), with comments and @keyframes skipped. */
function selectors(css: string): string[] {
  css = css.replace(/\/\*[^]*?\*\//g, '');
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  let skipFrom = -1; // depth of an @keyframes / @font-face block being skipped
  const atGroup: number[] = []; // depths of @media/@supports blocks whose children are rules
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      const head = css.slice(start, i).trim();
      if (skipFrom < 0) {
        if (/^@(keyframes|font-face|property)/.test(head)) skipFrom = depth;
        else if (head.startsWith('@')) atGroup.push(depth);
        else if (depth === 0 || atGroup.at(-1) === depth - 1) out.push(head);
      }
      depth++;
      start = i + 1;
    } else if (css[i] === '}') {
      depth--;
      if (skipFrom === depth) skipFrom = -1;
      if (atGroup.at(-1) === depth) atGroup.pop();
      start = i + 1;
    } else if (css[i] === ';') start = i + 1;
  }
  return out;
}

// Rules that start at our own injected elements (.kyt-*) need no gate: those exist only while the feature runs.
const OWN = /^(:is\()?\.kyt-/;

test('every style.css rule on YouTube elements is gated by html[kyt-<id>]', () => {
  for (const dir of dirs) {
    const file = `src/features/${dir}/style.css`;
    if (!existsSync(file)) continue;
    for (const rule of selectors(readFileSync(file, 'utf8'))) {
      // Split the selector list on top-level commas only (not inside :is(...)).
      let depth = 0;
      const parts = [''];
      for (const ch of rule) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && !depth) parts.push('');
        else parts[parts.length - 1] += ch;
      }
      for (const sel of parts.map((s) => s.trim()))
        assert.ok(sel.startsWith(`html[kyt-${dir}`) || OWN.test(sel), `${file}: "${sel}" is not gated by html[kyt-${dir}]`);
    }
  }
});

test('page-world handler names are unique and all registered', async () => {
  const { handlers } = await import('../src/features/page.ts');
  const parts = [await import('../src/page/core.ts')];
  for (const dir of dirs) if (existsSync(`src/features/${dir}/page.ts`)) parts.push(await import(`../src/features/${dir}/page.ts`));
  const seen = new Set<string>();
  for (const mod of parts)
    for (const obj of Object.values(mod) as object[])
      for (const name of Object.keys(obj)) {
        assert.ok(!seen.has(name), `page handler "${name}" is defined twice`);
        seen.add(name);
        assert.ok(name in handlers, `page handler "${name}" is not spread into features/page.ts`);
      }
});
