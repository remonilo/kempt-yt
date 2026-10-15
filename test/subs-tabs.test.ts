import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortChannels } from '../src/features/subs-tabs/sort.ts';

const list = [{ title: 'beta' }, { title: 'Alpha' }, { title: 'Ch 10' }, { title: 'Ch 9' }, { title: 'Émile' }];
const titles = (l: { title: string }[]) => l.map((c) => c.title);

test('relevance keeps the guide order and copies', () => {
  const out = sortChannels(list, 'relevance');
  assert.deepEqual(titles(out), titles(list));
  assert.notEqual(out, list);
});

test('A-Z ignores case and accents, numbers sort numerically', () => {
  assert.deepEqual(titles(sortChannels(list, 'az')), ['Alpha', 'beta', 'Ch 9', 'Ch 10', 'Émile']);
  assert.deepEqual(titles(sortChannels(list, 'za')), ['Émile', 'Ch 10', 'Ch 9', 'beta', 'Alpha']);
});
