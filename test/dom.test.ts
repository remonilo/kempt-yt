import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitFor, keep, observe } from '../src/core/dom.ts';
import { writeCache, saveOption } from '../src/core/settings.ts';

let observed = 0;
(globalThis as any).MutationObserver = class {
  observe() { observed++; }
  disconnect() {}
};

test('dom helpers: an already-aborted signal attaches nothing', async () => {
  const signal = AbortSignal.abort();
  const hit = {} as Element;
  const root = { querySelector: () => hit } as unknown as ParentNode & Node;
  assert.equal(await waitFor('x', { root, signal }), null);
  let mounted = false;
  keep(hit, root, () => (mounted = true), signal);
  observe(root, { childList: true }, () => {}, signal);
  assert.equal(mounted, false);
  assert.equal(observed, 0);
});

test('saveOption: same-tick writes both land', async () => {
  let stored: any = { 'kempt-yt': { features: {}, options: {} } };
  (globalThis as any).chrome = { storage: { sync: {
    get: async () => structuredClone(stored),
    set: async (v: any) => { await new Promise((r) => setTimeout(r)); stored = structuredClone(v); },
  } } };
  await Promise.all([saveOption('a', 'x', 1), saveOption('b', 'y', 2)]);
  assert.deepEqual(stored['kempt-yt'].options, { 'a.x': 1, 'b.y': 2 });
});

test('writeCache: blocked localStorage does not throw', () => {
  (globalThis as any).localStorage = { setItem: () => { throw new Error('SecurityError'); } };
  assert.doesNotThrow(() => writeCache({ features: {}, options: {} }));
});
