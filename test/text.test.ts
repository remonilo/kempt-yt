import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matcher, matches } from '../src/core/text.ts';

test('matches: all words, any case, accents folded', () => {
  assert.ok(matches('Amélie Poulain | Jesse James West', 'amelie west'));
  assert.ok(matches('Anything', ''));
  assert.ok(!matches('penguinz0 | 7 hr ago', 'penguinz0 fern'));
});

test('matcher: folds the query once, reusable', () => {
  const m = matcher('CAFÉ  crème');
  assert.ok(m('Le café de la Crème'));
  assert.ok(!m('cafe only'));
  assert.ok(matcher('   ')('anything'));
});
