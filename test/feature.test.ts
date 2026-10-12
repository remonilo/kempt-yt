import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, type Feature } from '../src/core/feature.ts';
import { isHere } from '../src/features/sidebar/nav.ts';
import type { Settings } from '../src/core/settings.ts';

// Just enough of <html> for the runner.
function fakeHtml() {
  const attrs = new Map<string, string>();
  const props = new Map<string, string>();
  return {
    attrs,
    props,
    toggleAttribute: (n: string, on: boolean) => (on ? attrs.set(n, '') : attrs.delete(n), on),
    setAttribute: (n: string, v: string) => void attrs.set(n, v),
    getAttribute: (n: string) => attrs.get(n) ?? null,
    removeAttribute: (n: string) => void attrs.delete(n),
    style: { setProperty: (n: string, v: string) => void props.set(n, v), removeProperty: (n: string) => void props.delete(n) },
  };
}

const settings = (features: Record<string, boolean>, options: Record<string, unknown> = {}) =>
  ({ features, options }) as unknown as Settings;
const tick = () => new Promise((r) => setTimeout(r));

test('runner: attributes, parent options, route gating, isolation', async () => {
  const html = fakeHtml();
  (globalThis as any).document = { documentElement: html };
  const signals: AbortSignal[] = [];
  const features: Feature[] = [
    {
      id: 'a', label: 'A', group: 'look', defaultOn: true, routes: ['watch'],
      options: {
        big: { label: 'Big', type: 'boolean', default: true },
        sub: { label: 'Sub', type: 'boolean', default: true, parent: 'big' },
        mode: { label: 'Mode', type: 'choice', default: 'x', choices: { x: 'X', y: 'Y' } },
        size: { label: 'Size', type: 'number', default: 4, cssVar: '--kyt-size' },
      },
      run: ({ signal }) => void signals.push(signal),
    },
    { id: 'broken', label: 'B', group: 'look', defaultOn: true, run: () => { throw new Error('boom'); } },
  ];
  const error = console.error;
  console.error = () => {};
  try {
    const update = createRunner(features, (() => {}) as never);

    update('watch', settings({}));
    await tick();
    assert.deepEqual([...html.attrs], [['kyt-a', ''], ['kyt-a-big', ''], ['kyt-a-sub', ''], ['kyt-a-mode', 'x'], ['kyt-broken', '']]);
    assert.equal(html.props.get('--kyt-size'), '4');
    assert.equal(signals.length, 1, 'a throwing run does not stop the others');

    update('watch', settings({}, { 'a.big': false, 'a.mode': 'y' }));
    assert.ok(!html.attrs.has('kyt-a-sub'), 'child clears when the parent is off');
    assert.equal(html.attrs.get('kyt-a-mode'), 'y');
    assert.equal(signals.length, 1, 'no restart on a settings change');

    update('home', settings({}));
    assert.ok(signals[0].aborted, 'leaving the route aborts');

    update('watch', settings({ a: false }));
    assert.ok(!html.attrs.has('kyt-a') && !html.attrs.has('kyt-a-big') && !html.attrs.has('kyt-a-mode'));
    assert.ok(!html.props.has('--kyt-size'));
    assert.equal(signals.length, 1, 'off: no run');
  } finally {
    console.error = error;
    delete (globalThis as any).document;
  }
});

test('isHere', () => {
  const at = (pathname: string, search = '') => ({ pathname, search });
  assert.ok(isHere('/', at('/')));
  assert.ok(!isHere('/', at('/feed/history')), 'home is not a prefix of everything');
  assert.ok(isHere('/shorts/', at('/shorts/abc')));
  assert.ok(isHere('/@a', at('/@a/videos')));
  assert.ok(!isHere('/@a', at('/@ab')));
  assert.ok(isHere('/playlist?list=WL', at('/playlist', '?list=WL&x=1')));
  assert.ok(!isHere('/playlist?list=WL', at('/playlist', '?list=LL')));
  assert.ok(!isHere('kyt:EXPLORE', at('/')));
});
