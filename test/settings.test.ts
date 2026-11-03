import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm } from '../src/core/settings.ts';

test('norm: icons off before 0.11 keeps YouTube labels', () => {
  assert.equal(norm({ features: { icons: false } }).features['button-labels'], false);
  assert.equal(norm({ features: { icons: false, 'button-labels': true } }).features['button-labels'], true);
  assert.equal(norm({ features: {} }).features['button-labels'], undefined);
  assert.deepEqual(norm(), { features: {}, options: {} });
});
