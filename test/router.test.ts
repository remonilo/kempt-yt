import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeOf, shortsId } from '../src/core/router.ts';

test('routeOf', () => {
  const cases: [string, string][] = [
    ['/', 'home'],
    ['/watch', 'watch'],
    ['/shorts/abc123', 'shorts'],
    ['/feed/subscriptions', 'subscriptions'],
    ['/results', 'search'],
    ['/playlist', 'playlist'],
    ['/@mkbhd', 'channel'],
    ['/channel/UC123', 'channel'],
    ['/feed/history', 'other'],
  ];
  for (const [path, route] of cases) assert.equal(routeOf(path), route, path);
});

test('shortsId', () => {
  assert.equal(shortsId('/shorts/b7MVW0XgZI8'), 'b7MVW0XgZI8');
  assert.equal(shortsId('/shorts/a-b_c1234XY/'), 'a-b_c1234XY');
  assert.equal(shortsId('/shorts/'), undefined);
  assert.equal(shortsId('/watch'), undefined);
});
